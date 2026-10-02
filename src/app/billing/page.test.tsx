import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Subscription } from '@/types';

// Price IDs are read from the (public) environment at call time.
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

const showToastMock = jest.fn();
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

const useAuthMock = jest.fn();
jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

const getByUserIdMock = jest.fn();
jest.mock('@/services/database', () => ({
  subscriptionService: {
    getByUserId: (...args: unknown[]) => getByUserIdMock(...args),
  },
  usageService: {
    getCurrentPeriod: jest.fn().mockResolvedValue(null),
  },
  transactionService: {
    listByUser: jest.fn().mockResolvedValue([]),
  },
  businessService: {
    getByUserId: jest.fn().mockResolvedValue([]),
  },
}));

const callFunctionMock = jest.fn();
jest.mock('@/services/api', () => ({
  callFunction: (...args: unknown[]) => callFunctionMock(...args),
}));

// Distinctive strings prove the UI shows Paddle's formatted total verbatim (no Intl, no maths).
const formatted = (priceId: string) => `PADDLE[${priceId}]`;
const previewPricesMock = jest.fn();
const openPaddleCheckoutMock = jest.fn();
jest.mock('@/lib/paddle/initPaddle', () => ({
  previewPrices: (...args: unknown[]) => previewPricesMock(...args),
  openPaddleCheckout: (...args: unknown[]) => openPaddleCheckoutMock(...args),
  setPaddleCustomer: jest.fn(),
}));
jest.mock('@/features/billing/useSyncPaddleCustomer', () => ({ useSyncPaddleCustomer: jest.fn() }));

import BillingPage from './page';

function serverResponse(priceId: string, transactionId = 'txn_123') {
  return { transactionId, priceId };
}

describe('BillingPage — Paddle pricing & checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthMock.mockReturnValue({ user: { uid: 'user_1', email: 'owner@example.test' } });
    getByUserIdMock.mockResolvedValue(null); // starts on the free plan
    previewPricesMock.mockImplementation(async (ids: string[]) =>
      Object.fromEntries(ids.map((id) => [id, formatted(id)]))
    );
    window.history.replaceState({}, '', '/billing');
  });

  it('shows only Paddle formatted totals, for every paid plan and pack', async () => {
    render(<BillingPage />);
    expect(await screen.findByText(formatted(IDS.BUSINESS_YEARLY))).toBeInTheDocument();
    for (const id of [
      IDS.STARTER_YEARLY,
      IDS.PRO_YEARLY,
      IDS.AGENCY_YEARLY,
      IDS.PACK_500,
      IDS.PACK_1200,
      IDS.PACK_3000,
    ]) {
      expect(screen.getByText(formatted(id))).toBeInTheDocument();
    }
    // Asked Paddle about every configured price in one preview, with no country guess.
    expect(previewPricesMock).toHaveBeenCalledTimes(1);
    expect(new Set(previewPricesMock.mock.calls[0]![0] as string[])).toEqual(
      new Set(Object.values(IDS))
    );
    expect(previewPricesMock.mock.calls[0]![1]).toBeUndefined();
  });

  it('does not show prices while loading, and shows an error + retry if preview fails', async () => {
    previewPricesMock.mockRejectedValueOnce(new Error('Paddle is down'));
    render(<BillingPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load prices/i);
    // No hard-coded fallback prices while Paddle is unavailable.
    expect(
      screen.queryByText(/₹s?(499|999|1,?699|1,?999|2,?999|4,?999|9,?990|16,?990|24,?990|49,?990)/)
    ).not.toBeInTheDocument();
    expect(screen.getAllByText('Price unavailable').length).toBeGreaterThan(0);
    // Checkout is not offered without a displayed price.
    expect(await screen.findByRole('button', { name: /upgrade to business/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText(formatted(IDS.BUSINESS_YEARLY))).toBeInTheDocument();
  });

  it('upgrade: checks out the exact price ID shown, as a one-page overlay flow ending at /welcome', async () => {
    callFunctionMock.mockResolvedValueOnce(serverResponse(IDS.BUSINESS_YEARLY));

    render(<BillingPage />);
    await screen.findByText(formatted(IDS.BUSINESS_YEARLY));
    await userEvent.click(await screen.findByRole('button', { name: /upgrade to business/i }));

    await waitFor(() => expect(callFunctionMock).toHaveBeenCalledTimes(1));
    expect(callFunctionMock).toHaveBeenCalledWith({
      functionName: 'createPaddleCheckout',
      data: { planId: 'business', billingCycle: 'yearly' },
    });
    await waitFor(() => expect(openPaddleCheckoutMock).toHaveBeenCalledTimes(1));
    expect(openPaddleCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'txn_123',
        successUrl: expect.stringMatching(/\/welcome$/),
      })
    );
  });

  it('monthly toggle swaps both the displayed price and the price ID used for checkout', async () => {
    callFunctionMock.mockResolvedValueOnce(serverResponse(IDS.PRO_MONTHLY));

    render(<BillingPage />);
    await screen.findByText(formatted(IDS.PRO_YEARLY));
    await userEvent.click(screen.getByRole('button', { name: /^monthly$/i }));

    expect(await screen.findByText(formatted(IDS.PRO_MONTHLY))).toBeInTheDocument();
    expect(screen.queryByText(formatted(IDS.PRO_YEARLY))).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /upgrade to pro/i }));
    await waitFor(() =>
      expect(callFunctionMock).toHaveBeenCalledWith({
        functionName: 'createPaddleCheckout',
        data: { planId: 'pro', billingCycle: 'monthly' },
      })
    );
    await waitFor(() => expect(openPaddleCheckoutMock).toHaveBeenCalledTimes(1));
  });

  it('refuses to open checkout when the server price differs from the one displayed', async () => {
    callFunctionMock.mockResolvedValueOnce(serverResponse(IDS.BUSINESS_MONTHLY)); // shown: yearly

    render(<BillingPage />);
    await screen.findByText(formatted(IDS.BUSINESS_YEARLY));
    await userEvent.click(await screen.findByRole('button', { name: /upgrade to business/i }));

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(expect.stringMatching(/does not match/i), 'error')
    );
    expect(openPaddleCheckoutMock).not.toHaveBeenCalled();
  });

  it.each([
    [500, IDS.PACK_500, /buy 500 credits/i],
    [1200, IDS.PACK_1200, /buy 1200 credits/i],
    [3000, IDS.PACK_3000, /buy 3000 credits/i],
  ])(
    'credit pack %d: sends the pack size only (no price), checks out the matching price ID',
    async (credits, priceId, name) => {
      callFunctionMock.mockResolvedValueOnce(serverResponse(priceId));

      render(<BillingPage />);
      await screen.findByText(formatted(priceId));
      await userEvent.click(await screen.findByRole('button', { name }));

      await waitFor(() => expect(callFunctionMock).toHaveBeenCalledTimes(1));
      expect(callFunctionMock).toHaveBeenCalledWith({
        functionName: 'createPaddleCheckout',
        data: { creditPack: credits },
      });
      await waitFor(() =>
        expect(openPaddleCheckoutMock).toHaveBeenCalledWith(
          expect.objectContaining({ transactionId: 'txn_123' })
        )
      );
    }
  );

  it('credit pack failure shows an error toast and re-enables the buttons', async () => {
    callFunctionMock.mockRejectedValueOnce(new Error('Pack error'));

    render(<BillingPage />);
    await screen.findByText(formatted(IDS.PACK_500));
    const button = await screen.findByRole('button', { name: /buy 500 credits/i });
    await userEvent.click(button);

    await waitFor(() => expect(showToastMock).toHaveBeenCalledWith('Pack error', 'error'));
    expect(openPaddleCheckoutMock).not.toHaveBeenCalled();
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('the free plan and current plan buttons are disabled', async () => {
    getByUserIdMock.mockResolvedValue({ planId: 'starter' } as Subscription);

    render(<BillingPage />);

    const freeButton = await screen.findByRole('button', { name: /free plan/i });
    expect(freeButton).toBeDisabled();

    const currentPlanButton = await screen.findByRole('button', { name: /current plan/i });
    expect(currentPlanButton).toBeDisabled();

    expect(callFunctionMock).not.toHaveBeenCalled();
    expect(openPaddleCheckoutMock).not.toHaveBeenCalled();
  });

  it('failure: createPaddleCheckout rejecting shows error toast and re-enables button', async () => {
    callFunctionMock.mockRejectedValueOnce(new Error('Paddle error'));

    render(<BillingPage />);
    await screen.findByText(formatted(IDS.BUSINESS_YEARLY));
    const businessButton = await screen.findByRole('button', { name: /upgrade to business/i });
    await userEvent.click(businessButton);

    await waitFor(() => expect(showToastMock).toHaveBeenCalledWith('Paddle error', 'error'));
    expect(openPaddleCheckoutMock).not.toHaveBeenCalled();
    await waitFor(() => expect(businessButton).not.toBeDisabled());
  });

  it('?plan=&cycle= (e.g. after signup) starts checkout only once prices are displayed', async () => {
    window.history.replaceState({}, '', '/billing?plan=pro&cycle=monthly');
    callFunctionMock.mockResolvedValueOnce(serverResponse(IDS.PRO_MONTHLY));

    render(<BillingPage />);

    await waitFor(() =>
      expect(callFunctionMock).toHaveBeenCalledWith({
        functionName: 'createPaddleCheckout',
        data: { planId: 'pro', billingCycle: 'monthly' },
      })
    );
    // Prices had been requested before checkout was created.
    expect(previewPricesMock).toHaveBeenCalled();
    expect(previewPricesMock.mock.invocationCallOrder[0]!).toBeLessThan(
      callFunctionMock.mock.invocationCallOrder[0]!
    );
  });

  it('returning with paddle=success shows a success toast and re-fetches the subscription', async () => {
    window.history.replaceState({}, '', '/billing?paddle=success&txn_id=txn_123');
    getByUserIdMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      planId: 'business',
      creditsIncluded: 1200,
    } as Subscription);

    render(<BillingPage />);

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.stringMatching(/payment received/i),
        'success'
      )
    );
    await waitFor(() => expect(getByUserIdMock).toHaveBeenCalledTimes(2));
    expect(window.location.search).toBe('');
  });

  it('history shows paid purchases but hides unpaid / abandoned checkouts', async () => {
    const { transactionService } = jest.requireMock('@/services/database');
    const row = (id: string, type: string, status: string, description: string) => ({
      transactionId: id,
      type,
      status,
      description,
      amount: 500,
      createdAt: '2026-10-02T05:00:00.000Z',
    });
    transactionService.listByUser.mockResolvedValueOnce([
      row('t1', 'subscription', 'completed', 'Starter plan (monthly) — subscription started'),
      row('t2', 'subscription', 'pending', 'Pro plan (yearly) — subscription started'),
      row('t3', 'subscription', 'expired', 'Agency plan (yearly) — subscription started'),
      row('t4', 'credit_purchase', 'failed', '500 credit top-up'),
      row('t5', 'credit_purchase', 'completed', '1,200 credit top-up'),
      row('t6', 'reservation', 'pending', 'Credit reservation for campaign_generation'),
    ]);

    render(<BillingPage />);

    expect(
      await screen.findByText('Starter plan (monthly) — subscription started')
    ).toBeInTheDocument();
    expect(screen.getByText('1,200 credit top-up')).toBeInTheDocument();
    expect(screen.getByText('Credit reservation for campaign_generation')).toBeInTheDocument();
    expect(screen.queryByText('Pro plan (yearly) — subscription started')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Agency plan (yearly) — subscription started')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('500 credit top-up')).not.toBeInTheDocument();
  });

  describe('Firestore read failures are never shown as a Free plan', () => {
    const database = () => jest.requireMock('@/services/database');
    beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));
    afterEach(() => jest.restoreAllMocks());

    it('subscription read failure: error panel, no plan shown, purchases disabled', async () => {
      getByUserIdMock.mockRejectedValue(new Error('Firestore not initialized'));
      render(<BillingPage />);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /couldn.t load your billing details/i
      );
      expect(screen.queryByText(/free plan/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/starter plan/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/available of/i)).not.toBeInTheDocument();
      // Entitlement unknown => no purchase may be started (it could double-buy).
      expect(await screen.findByRole('button', { name: /upgrade to business/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /buy 500 credits/i })).toBeDisabled();
      expect(console.error).toHaveBeenCalledWith(
        '[billing] subscription read failed',
        expect.stringContaining('Firestore not initialized')
      );
    });

    it('usage read failure is also "unknown", not 0 / 100 credits', async () => {
      getByUserIdMock.mockResolvedValue({ planId: 'starter', status: 'active' });
      database().usageService.getCurrentPeriod.mockRejectedValueOnce(new Error('unavailable'));
      render(<BillingPage />);
      expect(await screen.findByRole('alert')).toHaveTextContent(
        /couldn.t load your billing details/i
      );
      expect(screen.queryByText(/available of/i)).not.toBeInTheDocument();
    });

    it('Try again recovers and then shows the real plan', async () => {
      getByUserIdMock.mockRejectedValueOnce(new Error('offline'));
      getByUserIdMock.mockResolvedValue({
        planId: 'starter',
        status: 'active',
        cancelAtPeriodEnd: false,
      });
      render(<BillingPage />);
      await userEvent.click(await screen.findByRole('button', { name: /^try again$/i }));
      expect(await screen.findByText(/starter plan/i)).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('a MISSING subscription document (successful read) is the documented Free default', async () => {
      getByUserIdMock.mockResolvedValue(null);
      render(<BillingPage />);
      expect(await screen.findByText(/free plan/i)).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('transaction-history failure says so instead of "No transactions", and keeps the real plan', async () => {
      getByUserIdMock.mockResolvedValue({ planId: 'starter', status: 'active' });
      database().transactionService.listByUser.mockRejectedValueOnce(new Error('unavailable'));
      render(<BillingPage />);
      expect(
        await screen.findByText(/couldn.t load your transaction history/i)
      ).toBeInTheDocument();
      expect(screen.queryByText(/no transactions recorded/i)).not.toBeInTheDocument();
      expect(screen.getByText(/starter plan/i)).toBeInTheDocument();
    });
  });

  it('active paid subscription: explains that in-place plan switching is unavailable', async () => {
    getByUserIdMock.mockResolvedValue({
      planId: 'starter',
      cancelAtPeriodEnd: false,
    } as Subscription);
    render(<BillingPage />);
    const note = await screen.findByText(/switching plans in place isn.t available/i);
    expect(
      within(note.parentElement as HTMLElement).getByText(/subscription plans/i)
    ).toBeInTheDocument();
  });
});
