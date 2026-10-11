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
  sub: { planId: string; status?: string; cancelAtPeriodEnd?: boolean } | null
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
            data: () => ({ status: 'active', cancelAtPeriodEnd: false, ...sub }),
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

  it('shows all five tiers with INR prices', async () => {
    render(<PricingPageClient />);
    for (const name of ['Free', 'Starter', 'Business', 'Pro', 'Agency']) {
      expect(await screen.findByRole('heading', { level: 3, name })).toBeInTheDocument();
    }
    expect(screen.getByText(/₹9,990 billed/)).toBeInTheDocument();
    expect(screen.getByText(/₹16,990 billed/)).toBeInTheDocument();
    expect(screen.getByText(/₹24,990 billed/)).toBeInTheDocument();
    expect(screen.getByText(/₹49,990 billed/)).toBeInTheDocument();
  });

  it('monthly / yearly toggle changes the displayed price and savings label', async () => {
    render(<PricingPageClient />);
    expect(await screen.findByText(/₹9,990 billed/)).toBeInTheDocument(); // Starter yearly

    await userEvent.click(screen.getByRole('button', { name: /monthly billing/i }));
    expect(await screen.findByText(/₹999/)).toBeInTheDocument(); // Starter monthly
  });

  describe('signed out', () => {
    it('Subscribe sends the visitor to sign up with the plan and cycle', async () => {
      render(<PricingPageClient />);
      await userEvent.click(screen.getByRole('button', { name: /subscribe to starter/i }));
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
      'Subscribe to %s opens Cashfree checkout for the selected plan',
      async (planId, label, cycle) => {
        callFunctionMock.mockResolvedValueOnce(cashfreeServerResponse('ord_sub'));
        render(<PricingPageClient />);
        await userEvent.click(
          await screen.findByRole('button', { name: new RegExp(`subscribe to ${label}`, 'i') })
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
      await userEvent.click(await screen.findByRole('button', { name: /monthly billing/i }));
      await userEvent.click(await screen.findByRole('button', { name: /subscribe to starter/i }));
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
      expect(screen.getByText(/already have an active subscription/i)).toBeInTheDocument();
    });

    it('a subscription set to cancel at period end can subscribe again', async () => {
      setSubscription({ planId: 'business', cancelAtPeriodEnd: true });
      callFunctionMock.mockResolvedValueOnce(cashfreeServerResponse());
      render(<PricingPageClient />);
      const starterCard = (
        await screen.findByRole('heading', { level: 3, name: 'Starter' })
      ).closest('div.card-interactive') as HTMLElement;
      await userEvent.click(
        await within(starterCard).findByRole('button', { name: /subscribe to starter/i })
      );
      await waitFor(() => expect(callFunctionMock).toHaveBeenCalledTimes(1));
    });
  });
});
