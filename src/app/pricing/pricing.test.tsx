import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const IDS = {
  STARTER_MONTHLY: 'pri_starterm',
  STARTER_YEARLY: 'pri_startery',
  BUSINESS_MONTHLY: 'pri_businessm',
  BUSINESS_YEARLY: 'pri_businessy',
  PRO_MONTHLY: 'pri_prom',
  PRO_YEARLY: 'pri_proy',
  AGENCY_MONTHLY: 'pri_agencym',
  AGENCY_YEARLY: 'pri_agencyy',
  PACK_500: 'pri_pack500',
  PACK_1200: 'pri_pack1200',
  PACK_3000: 'pri_pack3000',
} as const;
for (const [k, v] of Object.entries(IDS)) {
  process.env[`NEXT_PUBLIC_PADDLE_PRICE_ID_${k}`] = v;
}
process.env['NEXT_PUBLIC_PADDLE_ENVIRONMENT'] = 'sandbox';
process.env['NEXT_PUBLIC_PADDLE_CLIENT_TOKEN'] = 'test_abc123';

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

const formatted = (priceId: string) => `PADDLE[${priceId}]`;
const previewPricesMock = jest.fn();
const openPaddleCheckoutMock = jest.fn();
jest.mock('@/lib/paddle/initPaddle', () => ({
  previewPrices: (...args: unknown[]) => previewPricesMock(...args),
  openPaddleCheckout: (...args: unknown[]) => openPaddleCheckoutMock(...args),
  setPaddleCustomer: jest.fn(),
}));

import PricingPageClient from './PricingPageClient';

function setSubscription(
  sub: { planId: string; status?: string; cancelAtPeriodEnd?: boolean } | null
) {
  getDocMock.mockImplementation(async (ref: { col: string; id: string }) => {
    if (ref.col === 'users') {
      return { exists: () => true, data: () => ({ subscriptionId: sub ? 'sub_1' : undefined }) };
    }
    return sub
      ? { exists: () => true, data: () => ({ status: 'active', cancelAtPeriodEnd: false, ...sub }) }
      : { exists: () => false, data: () => undefined };
  });
}

describe('PricingPageClient — Paddle prices & checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['NEXT_PUBLIC_PADDLE_ENVIRONMENT'] = 'sandbox';
    process.env['NEXT_PUBLIC_PADDLE_CLIENT_TOKEN'] = 'test_abc123';
    useAuthMock.mockReturnValue({ status: 'unauthenticated', user: null });
    previewPricesMock.mockImplementation(async (ids: string[]) =>
      Object.fromEntries(ids.map((id) => [id, formatted(id)]))
    );
  });

  it('shows all five tiers; paid tiers show Paddle totals verbatim, Free shows no Paddle price', async () => {
    render(<PricingPageClient />);
    for (const name of ['Free', 'Starter', 'Business', 'Pro', 'Agency']) {
      expect(await screen.findByRole('heading', { level: 3, name })).toBeInTheDocument();
    }
    for (const id of [IDS.STARTER_YEARLY, IDS.BUSINESS_YEARLY, IDS.PRO_YEARLY, IDS.AGENCY_YEARLY]) {
      expect(await screen.findByText(formatted(id))).toBeInTheDocument();
    }
    // Not computed or hard-coded anywhere on the page.
    expect(screen.queryByText(/₹/)).not.toBeInTheDocument();
    expect(screen.queryByText(/save ₹|\/mo billed annually/i)).not.toBeInTheDocument();
  });

  it('monthly / yearly toggle changes the displayed Paddle price and the billing label', async () => {
    render(<PricingPageClient />);
    expect(await screen.findByText(formatted(IDS.STARTER_YEARLY))).toBeInTheDocument();
    expect(screen.getAllByText('Billed once a year').length).toBe(4);

    await userEvent.click(screen.getByRole('button', { name: /monthly billing/i }));
    expect(await screen.findByText(formatted(IDS.STARTER_MONTHLY))).toBeInTheDocument();
    expect(screen.queryByText(formatted(IDS.STARTER_YEARLY))).not.toBeInTheDocument();
    expect(screen.getAllByText('Billed monthly').length).toBe(4);
  });

  it('passes the server-detected country to PricePreview, and omits it when there is none', async () => {
    const { unmount } = render(<PricingPageClient countryCode="IN" />);
    await waitFor(() => expect(previewPricesMock).toHaveBeenCalled());
    expect(previewPricesMock.mock.calls[0]![1]).toBe('IN');
    unmount();

    previewPricesMock.mockClear();
    render(<PricingPageClient />);
    await waitFor(() => expect(previewPricesMock).toHaveBeenCalled());
    expect(previewPricesMock.mock.calls[0]![1]).toBeUndefined();
  });

  it('shows an error state with retry — never fake prices — when PricePreview fails', async () => {
    previewPricesMock.mockRejectedValueOnce(new Error('network'));
    render(<PricingPageClient />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load prices/i);
    expect(screen.queryByText(/₹/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Price unavailable').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText(formatted(IDS.STARTER_YEARLY))).toBeInTheDocument();
  });

  it('missing Paddle configuration: clear message, no price preview, no checkout', async () => {
    delete process.env['NEXT_PUBLIC_PADDLE_CLIENT_TOKEN'];
    useAuthMock.mockReturnValue({
      status: 'authenticated',
      user: { uid: 'u1', email: 'a@b.test' },
    });
    setSubscription(null);

    render(<PricingPageClient />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/isn.t configured/i);
    expect(previewPricesMock).not.toHaveBeenCalled();
    const subscribe = await screen.findByRole('button', { name: /subscribe to starter/i });
    expect(subscribe).toBeDisabled();
  });

  describe('signed out', () => {
    it('Subscribe sends the visitor to sign up with the plan and cycle (no checkout without a Mitra user)', async () => {
      render(<PricingPageClient />);
      await screen.findByText(formatted(IDS.STARTER_YEARLY));
      await userEvent.click(screen.getByRole('button', { name: /subscribe to starter/i }));
      expect(pushMock).toHaveBeenCalledWith('/signup?plan=starter&cycle=yearly');
      expect(callFunctionMock).not.toHaveBeenCalled();
      expect(openPaddleCheckoutMock).not.toHaveBeenCalled();
    });

    it('Free never opens checkout; it goes to sign up', async () => {
      render(<PricingPageClient />);
      await userEvent.click(await screen.findByRole('button', { name: /get started free/i }));
      expect(pushMock).toHaveBeenCalledWith('/signup');
      expect(callFunctionMock).not.toHaveBeenCalled();
      expect(openPaddleCheckoutMock).not.toHaveBeenCalled();
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
      ['starter', 'Starter', 'yearly', IDS.STARTER_YEARLY],
      ['business', 'Business', 'yearly', IDS.BUSINESS_YEARLY],
      ['pro', 'Pro', 'yearly', IDS.PRO_YEARLY],
      ['agency', 'Agency', 'yearly', IDS.AGENCY_YEARLY],
    ])(
      'Subscribe to %s opens Paddle checkout for the exact displayed yearly price',
      async (planId, label, cycle, priceId) => {
        callFunctionMock.mockResolvedValueOnce({ transactionId: 'txn_9', priceId });
        render(<PricingPageClient />);
        await screen.findByText(formatted(priceId));
        await userEvent.click(
          await screen.findByRole('button', { name: new RegExp(`subscribe to ${label}`, 'i') })
        );

        await waitFor(() =>
          expect(callFunctionMock).toHaveBeenCalledWith({
            functionName: 'createPaddleCheckout',
            data: { planId, billingCycle: cycle },
          })
        );
        await waitFor(() =>
          expect(openPaddleCheckoutMock).toHaveBeenCalledWith(
            expect.objectContaining({
              transactionId: 'txn_9',
              successUrl: expect.stringMatching(/\/welcome$/),
            })
          )
        );
      }
    );

    it('monthly selection checks out the monthly price ID', async () => {
      callFunctionMock.mockResolvedValueOnce({
        transactionId: 'txn_9',
        priceId: IDS.STARTER_MONTHLY,
      });
      render(<PricingPageClient />);
      await userEvent.click(await screen.findByRole('button', { name: /monthly billing/i }));
      await screen.findByText(formatted(IDS.STARTER_MONTHLY));
      await userEvent.click(await screen.findByRole('button', { name: /subscribe to starter/i }));
      await waitFor(() =>
        expect(callFunctionMock).toHaveBeenCalledWith({
          functionName: 'createPaddleCheckout',
          data: { planId: 'starter', billingCycle: 'monthly' },
        })
      );
      await waitFor(() => expect(openPaddleCheckoutMock).toHaveBeenCalledTimes(1));
    });

    it('refuses checkout if the server resolves a different price than the one shown', async () => {
      callFunctionMock.mockResolvedValueOnce({
        transactionId: 'txn_9',
        priceId: IDS.STARTER_MONTHLY,
      });
      render(<PricingPageClient />);
      await screen.findByText(formatted(IDS.STARTER_YEARLY));
      await userEvent.click(await screen.findByRole('button', { name: /subscribe to starter/i }));
      await waitFor(() =>
        expect(showToastMock).toHaveBeenCalledWith(
          expect.stringMatching(/does not match/i),
          'error'
        )
      );
      expect(openPaddleCheckoutMock).not.toHaveBeenCalled();
    });

    it('Free tier is shown as the current plan and cannot open checkout', async () => {
      render(<PricingPageClient />);
      const free = await screen.findByRole('button', { name: /current plan/i });
      expect(free).toBeDisabled();
    });

    it('credit packs: 500 / 1,200 / 3,000 show Paddle prices and check out by pack size only', async () => {
      callFunctionMock.mockResolvedValueOnce({ transactionId: 'txn_p', priceId: IDS.PACK_1200 });
      render(<PricingPageClient />);
      for (const id of [IDS.PACK_500, IDS.PACK_1200, IDS.PACK_3000]) {
        expect(await screen.findByText(formatted(id))).toBeInTheDocument();
      }
      await userEvent.click(screen.getByRole('button', { name: /buy 1200 credits/i }));
      await waitFor(() =>
        expect(callFunctionMock).toHaveBeenCalledWith({
          functionName: 'createPaddleCheckout',
          data: { creditPack: 1200 },
        })
      );
      await waitFor(() => expect(openPaddleCheckoutMock).toHaveBeenCalledTimes(1));
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
      expect(openPaddleCheckoutMock).not.toHaveBeenCalled();
      expect(screen.getByText(/already have an active subscription/i)).toBeInTheDocument();
    });

    it('a subscription set to cancel at period end can subscribe again', async () => {
      setSubscription({ planId: 'business', cancelAtPeriodEnd: true });
      callFunctionMock.mockResolvedValueOnce({
        transactionId: 'txn_9',
        priceId: IDS.STARTER_YEARLY,
      });
      render(<PricingPageClient />);
      await screen.findByText(formatted(IDS.STARTER_YEARLY));
      const starterCard = (
        await screen.findByRole('heading', { level: 3, name: 'Starter' })
      ).closest('div.card-interactive') as HTMLElement;
      await userEvent.click(
        within(starterCard).getByRole('button', { name: /subscribe to starter/i })
      );
      await waitFor(() => expect(callFunctionMock).toHaveBeenCalledTimes(1));
    });
  });
});
