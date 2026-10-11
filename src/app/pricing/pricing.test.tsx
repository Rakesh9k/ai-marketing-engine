import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const showToastMock = jest.fn();
jest.mock('@/hooks/useToast', () => ({ useToast: () => ({ showToast: showToastMock }) }));

const useAuthMock = jest.fn();
jest.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => useAuthMock() }));

jest.mock('@/features/landing/components/LandingNav', () => ({ LandingNav: () => <nav /> }));
jest.mock('@/features/landing/components/LandingFooter', () => ({
  LandingFooter: () => <footer />,
}));
jest.mock('@/components/motion/Reveal', () => ({
  Reveal: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

// Firestore: the signed-in user's subscription lookup.
const getDocMock = jest.fn();
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, col: string, id: string) => ({ col, id }),
  getDoc: (ref: unknown) => getDocMock(ref),
}));
jest.mock('@/lib/firebase/client', () => ({ getFirebaseDb: () => ({}) }));

const callFunctionMock = jest.fn();
jest.mock('@/services/api', () => ({
  callFunction: (...args: unknown[]) => callFunctionMock(...args),
}));

const openCashfreeCheckoutMock = jest.fn();
jest.mock('@/lib/cashfree/initCashfree', () => ({
  openCashfreeCheckout: (...args: unknown[]) => openCashfreeCheckoutMock(...args),
}));

import PricingPageClient from './PricingPageClient';

function setSubscription(
  sub: {
    planId: string;
    status?: string;
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd?: string;
  } | null
) {
  getDocMock.mockImplementation((ref: { col: string; id: string }) => {
    if (ref.col === 'users') {
      return Promise.resolve({
        exists: () => true,
        data: () => ({ subscriptionId: sub ? 'sub_1' : undefined }),
      });
    }
    return Promise.resolve(
      sub
        ? {
            exists: () => true,
            data: () => ({
              status: 'active',
              cancelAtPeriodEnd: false,
              currentPeriodEnd: new Date(Date.now() + 10 * 86_400_000).toISOString(),
              ...sub,
            }),
          }
        : { exists: () => false, data: () => undefined }
    );
  });
}

function cashfreeServerResponse(orderId = 'ord_123', paymentSessionId = 'session_123') {
  return {
    orderId,
    paymentSessionId,
    environment: 'sandbox',
    amountINR: 2999,
    currency: 'INR',
  };
}

describe('PricingPageClient — Cashfree prices & checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    showToastMock.mockReset();
    callFunctionMock.mockReset();
    useAuthMock.mockReturnValue({ status: 'unauthenticated', user: null });
    openCashfreeCheckoutMock.mockResolvedValue(undefined);
  });

  it('shows all five tiers with the INR price of the whole term and the no-auto-renewal note', async () => {
    render(<PricingPageClient />);
    for (const name of ['Free', 'Starter', 'Business', 'Pro', 'Agency']) {
      expect(await screen.findByRole('heading', { level: 3, name })).toBeInTheDocument();
    }
    // Yearly is the default view: these are the TOTALS payable for 365 days.
    for (const total of ['₹9,990', '₹16,990', '₹24,990', '₹49,990']) {
      expect(screen.getByText(total)).toBeInTheDocument();
    }
    expect(screen.getAllByText('/ 365 days')).toHaveLength(4);
    expect(screen.getAllByText(/one-time payment\. does not renew automatically/i)).toHaveLength(4);
  });

  it('never claims automatic renewal, and no longer names Paddle', async () => {
    const { container } = render(<PricingPageClient />);
    await screen.findByRole('heading', { level: 3, name: 'Starter' });
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/renews automatically until you cancel/i);
    expect(text).not.toMatch(/subscriptions renew automatically/i);
    expect(text).not.toMatch(/cancel anytime/i);
    expect(text).not.toMatch(/paddle/i);
    expect(text).toMatch(/they never renew automatically/i);
    expect(text).toMatch(/30 days for monthly plans and 365 days for yearly plans/i);
    expect(text).toMatch(/Cashfree Payments/);
  });

  it('monthly / yearly toggle changes the displayed term and price', async () => {
    render(<PricingPageClient />);
    expect(await screen.findByText('₹9,990')).toBeInTheDocument(); // Starter, 365 days

    await userEvent.click(screen.getByRole('button', { name: /^monthly · 30 days$/i }));
    expect(await screen.findByText('₹999')).toBeInTheDocument(); // Starter, 30 days
    expect(screen.getAllByText('/ 30 days')).toHaveLength(4);
  });

  describe('signed out', () => {
    it('Buy sends the visitor to sign up with the plan and cycle', async () => {
      render(<PricingPageClient />);
      await userEvent.click(screen.getByRole('button', { name: /buy 365 days of starter/i }));
      expect(pushMock).toHaveBeenCalledWith('/signup?plan=starter&cycle=yearly');
      expect(callFunctionMock).not.toHaveBeenCalled();
      expect(openCashfreeCheckoutMock).not.toHaveBeenCalled();
    });

    it('Free never opens checkout; it goes to sign up', async () => {
      render(<PricingPageClient />);
      await userEvent.click(await screen.findByRole('button', { name: /get started free/i }));
      expect(pushMock).toHaveBeenCalledWith('/signup');
      expect(callFunctionMock).not.toHaveBeenCalled();
      expect(openCashfreeCheckoutMock).not.toHaveBeenCalled();
    });
  });

  describe('signed in on the Free plan', () => {
    beforeEach(() => {
      useAuthMock.mockReturnValue({
        status: 'authenticated',
        user: { uid: 'u1', email: 'owner@example.test' },
      });
      setSubscription({ planId: 'free' });
    });

    it.each([
      ['starter', 'Starter', 'yearly'],
      ['business', 'Business', 'yearly'],
      ['pro', 'Pro', 'yearly'],
      ['agency', 'Agency', 'yearly'],
    ])(
      'Buy 365 days of %s opens Cashfree checkout for the selected plan',
      async (planId, label, cycle) => {
        callFunctionMock.mockResolvedValueOnce(cashfreeServerResponse('ord_sub'));
        render(<PricingPageClient />);
        await userEvent.click(
          await screen.findByRole('button', { name: new RegExp(`buy 365 days of ${label}`, 'i') })
        );

        await waitFor(() =>
          expect(callFunctionMock).toHaveBeenCalledWith({
            functionName: 'createCashfreeCheckout',
            data: expect.objectContaining({
              planId,
              billingCycle: cycle,
            }),
          })
        );
        await waitFor(() =>
          expect(openCashfreeCheckoutMock).toHaveBeenCalledWith(
            expect.objectContaining({
              paymentSessionId: 'session_123',
              environment: 'sandbox',
            })
          )
        );
      }
    );

    it('monthly selection checks out with monthly billing cycle', async () => {
      callFunctionMock.mockResolvedValueOnce(cashfreeServerResponse('ord_sub_m'));
      render(<PricingPageClient />);
      await userEvent.click(await screen.findByRole('button', { name: /^monthly · 30 days$/i }));
      await userEvent.click(await screen.findByRole('button', { name: /buy 30 days of starter/i }));
      await waitFor(() =>
        expect(callFunctionMock).toHaveBeenCalledWith({
          functionName: 'createCashfreeCheckout',
          data: expect.objectContaining({
            planId: 'starter',
            billingCycle: 'monthly',
          }),
        })
      );
      await waitFor(() => expect(openCashfreeCheckoutMock).toHaveBeenCalledTimes(1));
    });

    it('Free tier is shown as the current plan and cannot open checkout', async () => {
      render(<PricingPageClient />);
      const free = await screen.findByRole('button', { name: /current plan/i });
      expect(free).toBeDisabled();
    });

    it('credit packs: 500 / 1,200 / 3,000 check out by pack size', async () => {
      callFunctionMock.mockResolvedValueOnce(cashfreeServerResponse('ord_pack_1200'));
      render(<PricingPageClient />);
      await userEvent.click(screen.getByRole('button', { name: /buy 1200 credits/i }));
      await waitFor(() =>
        expect(callFunctionMock).toHaveBeenCalledWith({
          functionName: 'createCashfreeCheckout',
          data: expect.objectContaining({
            creditPack: 1200,
          }),
        })
      );
      await waitFor(() => expect(openCashfreeCheckoutMock).toHaveBeenCalledTimes(1));
    });
  });

  describe('signed in with an active paid subscription', () => {
    beforeEach(() => {
      useAuthMock.mockReturnValue({
        status: 'authenticated',
        user: { uid: 'u1', email: 'owner@example.test' },
      });
    });

    it('current plan is disabled; other plans route to Billing instead of creating a second subscription', async () => {
      setSubscription({ planId: 'business' });
      render(<PricingPageClient />);
      const current = await screen.findByRole('button', { name: /current plan/i });
      expect(current).toBeDisabled();

      const manage = await screen.findAllByRole('button', { name: /manage in billing/i });
      expect(manage.length).toBeGreaterThan(0);
      await userEvent.click(manage[0]!);

      expect(pushMock).toHaveBeenCalledWith('/billing');
      expect(callFunctionMock).not.toHaveBeenCalled();
      expect(openCashfreeCheckoutMock).not.toHaveBeenCalled();
      expect(screen.getByText(/already have access to a paid plan/i)).toBeInTheDocument();
    });

    it('an ENDED term (record still says active) is treated as no subscription: any plan can be bought again', async () => {
      setSubscription({
        planId: 'business',
        currentPeriodEnd: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      });
      callFunctionMock.mockResolvedValueOnce(cashfreeServerResponse());
      render(<PricingPageClient />);
      const starterCard = (
        await screen.findByRole('heading', { level: 3, name: 'Starter' })
      ).closest('div.card-interactive') as HTMLElement;
      await userEvent.click(
        await within(starterCard).findByRole('button', { name: /buy 365 days of starter/i })
      );
      await waitFor(() => expect(callFunctionMock).toHaveBeenCalledTimes(1));
      expect(screen.queryByText(/already have access to a paid plan/i)).not.toBeInTheDocument();
    });
  });
});
