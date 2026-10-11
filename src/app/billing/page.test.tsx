import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Subscription } from '@/types';

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

const openCashfreeCheckoutMock = jest.fn();
jest.mock('@/lib/cashfree/initCashfree', () => ({
  openCashfreeCheckout: (...args: unknown[]) => openCashfreeCheckoutMock(...args),
}));

import BillingPage from './page';

function cashfreeServerResponse(orderId = 'ord_123', paymentSessionId = 'session_123') {
  return {
    orderId,
    paymentSessionId,
    environment: 'sandbox',
    amountINR: 2999,
    currency: 'INR',
  };
}

describe('BillingPage — Cashfree pricing & checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    showToastMock.mockReset();
    callFunctionMock.mockReset();
    useAuthMock.mockReturnValue({ user: { uid: 'user_1', email: 'owner@example.test' } });
    getByUserIdMock.mockResolvedValue(null); // starts on the free plan
    openCashfreeCheckoutMock.mockResolvedValue(undefined);
    window.history.replaceState({}, '', '/billing');
  });

  it('shows prices in INR for every paid plan and credit pack', async () => {
    render(<BillingPage />);
    expect(await screen.findByRole('heading', { level: 3, name: 'Business' })).toBeInTheDocument();
    expect(screen.getByText(/₹1,416/)).toBeInTheDocument(); // Business yearly rate
    expect(screen.getByText(/₹833/)).toBeInTheDocument(); // Starter yearly rate
    expect(screen.getByText(/₹2,083/)).toBeInTheDocument(); // Pro yearly rate
    expect(screen.getByText(/₹4,166/)).toBeInTheDocument(); // Agency yearly rate
  });

  it('upgrade: creates Cashfree checkout session and launches SDK checkout', async () => {
    callFunctionMock.mockResolvedValueOnce(cashfreeServerResponse());

    render(<BillingPage />);
    await screen.findByRole('heading', { level: 3, name: 'Business' });
    await userEvent.click(await screen.findByRole('button', { name: /upgrade to business/i }));

    await waitFor(() => expect(callFunctionMock).toHaveBeenCalledTimes(1));
    expect(callFunctionMock).toHaveBeenCalledWith({
      functionName: 'createCashfreeCheckout',
      data: expect.objectContaining({
        planId: 'business',
        billingCycle: 'yearly',
      }),
    });
    await waitFor(() => expect(openCashfreeCheckoutMock).toHaveBeenCalledTimes(1));
    expect(openCashfreeCheckoutMock).toHaveBeenCalledWith({
      paymentSessionId: 'session_123',
      environment: 'sandbox',
      returnUrl: expect.stringMatching(/\/billing\?cashfree_order_id=\{order_id\}$/),
    });
  });

  it('monthly toggle swaps both the displayed price and billing cycle used for checkout', async () => {
    callFunctionMock.mockResolvedValueOnce(cashfreeServerResponse());

    render(<BillingPage />);
    await screen.findByRole('heading', { level: 3, name: 'Pro' });
    await userEvent.click(screen.getByRole('button', { name: /^monthly$/i }));

    expect(await screen.findByText(/₹2,999/)).toBeInTheDocument(); // Pro monthly price

    await userEvent.click(screen.getByRole('button', { name: /upgrade to pro/i }));
    await waitFor(() =>
      expect(callFunctionMock).toHaveBeenCalledWith({
        functionName: 'createCashfreeCheckout',
        data: expect.objectContaining({
          planId: 'pro',
          billingCycle: 'monthly',
        }),
      })
    );
    await waitFor(() => expect(openCashfreeCheckoutMock).toHaveBeenCalledTimes(1));
  });

  it.each([
    [500, /buy 500 credits/i],
    [1200, /buy 1200 credits/i],
    [3000, /buy 3000 credits/i],
  ])(
    'credit pack %d: sends creditPack count to backend, launches Cashfree SDK',
    async (credits, buttonRegex) => {
      callFunctionMock.mockResolvedValueOnce(cashfreeServerResponse('ord_pack'));

      render(<BillingPage />);
      await userEvent.click(await screen.findByRole('button', { name: buttonRegex }));

      await waitFor(() => expect(callFunctionMock).toHaveBeenCalledTimes(1));
      expect(callFunctionMock).toHaveBeenCalledWith({
        functionName: 'createCashfreeCheckout',
        data: expect.objectContaining({
          creditPack: credits,
        }),
      });
      await waitFor(() =>
        expect(openCashfreeCheckoutMock).toHaveBeenCalledWith(
          expect.objectContaining({ paymentSessionId: 'session_123' })
        )
      );
    }
  );

  it('credit pack failure shows an error toast and re-enables the buttons', async () => {
    callFunctionMock.mockRejectedValueOnce(new Error('Pack error'));

    render(<BillingPage />);
    const button = await screen.findByRole('button', { name: /buy 500 credits/i });
    await userEvent.click(button);

    await waitFor(() => expect(showToastMock).toHaveBeenCalledWith('Pack error', 'error'));
    expect(openCashfreeCheckoutMock).not.toHaveBeenCalled();
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
    expect(openCashfreeCheckoutMock).not.toHaveBeenCalled();
  });

  it('failure: createCashfreeCheckout rejecting shows error toast and re-enables button', async () => {
    callFunctionMock.mockRejectedValueOnce(new Error('Cashfree error'));

    render(<BillingPage />);
    const businessButton = await screen.findByRole('button', { name: /upgrade to business/i });
    await userEvent.click(businessButton);

    await waitFor(() => expect(showToastMock).toHaveBeenCalledWith('Cashfree error', 'error'));
    expect(openCashfreeCheckoutMock).not.toHaveBeenCalled();
    await waitFor(() => expect(businessButton).not.toBeDisabled());
  });

  it('?cashfree_order_id= confirms payment and re-fetches the subscription', async () => {
    window.history.replaceState({}, '', '/billing?cashfree_order_id=ord_123');
    getByUserIdMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      planId: 'business',
      creditsIncluded: 1200,
    } as Subscription);

    render(<BillingPage />);

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /confirming your payment with Cashfree.*if you cancelled, you have not been charged/i
        ),
        'info'
      )
    );
    await waitFor(() => expect(getByUserIdMock).toHaveBeenCalledTimes(2));
    // The return redirect must never claim the payment succeeded: only the webhook grants.
    expect(showToastMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/payment received|success/i),
      'success'
    );
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
