import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Subscription } from '@/types';

const showToastMock = jest.fn();
jest.mock('@/features/billing/BillingOverviewPanel', () => ({ BillingOverviewPanel: () => null }));
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
import { formatAccessDate } from '@/features/billing/prepaidTermUi';

const DAY = 86_400_000;
/** A live prepaid term: ends `days` from now. */
const liveSub = (over: Record<string, unknown> = {}, days = 10) =>
  ({
    planId: 'starter',
    billingCycle: 'monthly',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + days * DAY).toISOString(),
    ...over,
  }) as unknown as Subscription;

function cashfreeServerResponse(orderId = 'ord_123', paymentSessionId = 'session_123') {
  return {
    orderId,
    paymentSessionId,
    environment: 'sandbox',
    amountINR: 2999,
    currency: 'INR',
  };
}

/** Every plan purchase now passes through the confirmation that states the exact amount; confirm it. */
async function confirmPayment(amount: string) {
  const dialog = await screen.findByRole('dialog', { name: /confirm your purchase/i });
  expect(dialog).toHaveTextContent(new RegExp(`${amount}\\s*one time`));
  expect(dialog).toHaveTextContent(/No automatic renewal/);
  await userEvent.click(
    screen.getByRole('button', { name: new RegExp(`pay ${amount} once`, 'i') })
  );
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

  it('shows the price you actually pay for the whole term, in INR, with the no-auto-renewal note', async () => {
    render(<BillingPage />);
    await userEvent.click(await screen.findByRole('button', { name: /yearly · 365 days/i }));
    expect(await screen.findByRole('heading', { level: 3, name: 'Business' })).toBeInTheDocument();
    // With Yearly chosen: these are TOTALS for 365 days, not per-month equivalents.
    expect(screen.getByText('₹16,990')).toBeInTheDocument(); // Business
    expect(screen.getByText('₹9,990')).toBeInTheDocument(); // Starter
    expect(screen.getByText('₹24,990')).toBeInTheDocument(); // Pro
    expect(screen.getByText('₹49,990')).toBeInTheDocument(); // Agency
    expect(screen.queryByText(/₹1,416/)).not.toBeInTheDocument(); // the old monthly-equivalent display
    expect(screen.getAllByText(/one-time payment\. does not renew automatically/i)).toHaveLength(4);
    expect(screen.getAllByText(/\/ 365 days/)).toHaveLength(4);
  });

  it('upgrade: creates Cashfree checkout session and launches SDK checkout', async () => {
    callFunctionMock.mockResolvedValueOnce(cashfreeServerResponse());

    render(<BillingPage />);
    await userEvent.click(await screen.findByRole('button', { name: /yearly · 365 days/i }));
    await screen.findByRole('heading', { level: 3, name: 'Business' });
    await userEvent.click(await screen.findByRole('button', { name: /buy 365 days of business/i }));
    expect(callFunctionMock).not.toHaveBeenCalled(); // nothing is created before the customer confirms
    await confirmPayment('₹16,990');

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
    await userEvent.click(screen.getByRole('button', { name: /^monthly · 30 days$/i }));

    expect(await screen.findByText('₹2,999')).toBeInTheDocument(); // Pro, 30 days

    await userEvent.click(screen.getByRole('button', { name: /buy 30 days of pro/i }));
    await confirmPayment('₹2,999');
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

  it('with a live term: Free is disabled, other plans wait for the term to end, the current plan can be renewed', async () => {
    getByUserIdMock.mockResolvedValue(liveSub({ planId: 'starter', billingCycle: 'yearly' }));

    render(<BillingPage />);

    expect(await screen.findByRole('button', { name: /free plan/i })).toBeDisabled();
    const waiting = await screen.findAllByRole('button', { name: /available after/i });
    expect(waiting).toHaveLength(3); // business, pro, agency
    waiting.forEach((b) => expect(b).toBeDisabled());
    // same plan + same billing period (the default yearly view): renewal is offered, not blocked
    const renewals = await screen.findAllByRole('button', {
      name: /renew starter \(\+365 days\)/i,
    });
    renewals.forEach((b) => expect(b).toBeEnabled());

    expect(callFunctionMock).not.toHaveBeenCalled();
    expect(openCashfreeCheckoutMock).not.toHaveBeenCalled();
  });

  it('failure: createCashfreeCheckout rejecting shows the error in the confirmation and allows a retry', async () => {
    callFunctionMock.mockRejectedValueOnce(new Error('Cashfree error'));

    render(<BillingPage />);
    await userEvent.click(await screen.findByRole('button', { name: /yearly · 365 days/i }));
    const businessButton = await screen.findByRole('button', {
      name: /buy 365 days of business/i,
    });
    await userEvent.click(businessButton);
    await confirmPayment('₹16,990');

    // The problem is shown inside the open confirmation (where the customer is looking), with a retry.
    expect(await screen.findByRole('alert')).toHaveTextContent('Cashfree error');
    expect(openCashfreeCheckoutMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /try again, pay ₹16,990 once/i })).toBeEnabled();
  });

  it('?cashfree_order_id= re-fetches, and states the NEW access date only once the webhook has extended access', async () => {
    window.history.replaceState({}, '', '/billing?cashfree_order_id=ord_123');
    const paidUntil = liveSub({ planId: 'business', billingCycle: 'monthly' }, 30);
    getByUserIdMock.mockResolvedValueOnce(null).mockResolvedValue(paidUntil);

    render(<BillingPage />);

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /confirming your payment with Cashfree.*if you cancelled, you have not been charged/i
        ),
        'info'
      )
    );
    await waitFor(() => expect(getByUserIdMock.mock.calls.length).toBeGreaterThanOrEqual(2));
    const end = new Date((paidUntil as unknown as { currentPeriodEnd: string }).currentPeriodEnd);
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        `Payment confirmed. Your Business access is active until ${formatAccessDate(end)}.`,
        'success'
      )
    );
    expect(window.location.search).toBe('');
  });

  it('?cashfree_order_id= with NO change (abandoned / failed payment) never claims success', async () => {
    window.history.replaceState({}, '', '/billing?cashfree_order_id=ord_abandoned');
    getByUserIdMock.mockResolvedValue(null);
    render(<BillingPage />);
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.stringMatching(/confirming your payment/i),
        'info'
      )
    );
    await waitFor(() => expect(getByUserIdMock.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(showToastMock).not.toHaveBeenCalledWith(expect.anything(), 'success');
  });

  describe('the return from the payment page is checked by the SERVER, never trusted', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('asks the server to verify the order, and states success only when the server confirms it', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
      window.history.replaceState({}, '', '/billing?cashfree_order_id=ord_verify');
      getByUserIdMock.mockResolvedValue(null);
      const endsAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
      callFunctionMock.mockImplementation(async (req: { functionName: string }) =>
        req.functionName === 'verifyCashfreeOrder'
          ? { confirmed: true, state: 'fulfilled', message: 'ok', accessEndsAt: endsAt }
          : cashfreeServerResponse()
      );

      render(<BillingPage />);
      expect(callFunctionMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'verifyCashfreeOrder' })
      );
      await act(async () => {
        jest.advanceTimersByTime(4100);
      });
      await waitFor(() =>
        expect(callFunctionMock).toHaveBeenCalledWith({
          functionName: 'verifyCashfreeOrder',
          data: { orderId: 'ord_verify' },
        })
      );
      await waitFor(() =>
        expect(showToastMock).toHaveBeenCalledWith(
          `Payment confirmed. Your plan is active until ${formatAccessDate(new Date(endsAt))}.`,
          'success'
        )
      );
      // The later checks do not repeat the confirmation.
      await act(async () => {
        jest.advanceTimersByTime(40_000);
      });
      expect(showToastMock.mock.calls.filter(([, kind]) => kind === 'success')).toHaveLength(1);
    });

    it('an unconfirmed order never produces a success message, however the page was reached', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
      window.history.replaceState({}, '', '/billing?cashfree_order_id=ord_unpaid');
      getByUserIdMock.mockResolvedValue(null);
      callFunctionMock.mockImplementation(async (req: { functionName: string }) =>
        req.functionName === 'verifyCashfreeOrder'
          ? {
              confirmed: false,
              state: 'payment_pending',
              message: 'Waiting for payment confirmation',
            }
          : cashfreeServerResponse()
      );
      render(<BillingPage />);
      await act(async () => {
        jest.advanceTimersByTime(35_000);
      });
      await waitFor(() =>
        expect(callFunctionMock).toHaveBeenCalledWith({
          functionName: 'verifyCashfreeOrder',
          data: { orderId: 'ord_unpaid' },
        })
      );
      expect(showToastMock).not.toHaveBeenCalledWith(expect.anything(), 'success');
    });
  });

  describe('the order status panel shows only what the server says', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    const returnWith = (orderId: string, verify: Record<string, unknown>) => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
      window.history.replaceState({}, '', `/billing?cashfree_order_id=${orderId}`);
      getByUserIdMock.mockResolvedValue(null);
      callFunctionMock.mockImplementation(async (req: { functionName: string }) =>
        req.functionName === 'verifyCashfreeOrder' ? verify : cashfreeServerResponse()
      );
    };

    it('starts as "checking" (the redirect proves nothing) and never says paid', async () => {
      returnWith('ord_panel_1', { confirmed: false, state: 'payment_pending', message: 'Waiting' });
      render(<BillingPage />);
      const panel = await screen.findByRole('status', { name: /checking your payment/i });
      expect(panel).toHaveTextContent(/nothing is shown as paid until it confirms/i);
      expect(panel.textContent).not.toMatch(/payment confirmed/i);
    });

    it('shows "Payment confirmed" with the access end date once the server confirms', async () => {
      const endsAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
      returnWith('ord_panel_2', {
        confirmed: true,
        state: 'fulfilled',
        message: 'ok',
        accessEndsAt: endsAt,
      });
      render(<BillingPage />);
      await act(async () => {
        jest.advanceTimersByTime(4100);
      });
      const panel = await screen.findByRole('status', { name: /payment confirmed/i });
      expect(panel).toHaveTextContent(formatAccessDate(new Date(endsAt)));
      expect(panel).toHaveTextContent(/no automatic renewal/i);
    });

    it('shows a failed payment as failed, and an expired session as "no payment was taken"', async () => {
      returnWith('ord_panel_3', {
        confirmed: false,
        state: 'payment_failed',
        message: 'Payment did not go through',
      });
      const { unmount } = render(<BillingPage />);
      await act(async () => {
        jest.advanceTimersByTime(4100);
      });
      expect(
        await screen.findByRole('status', { name: /payment did not go through/i })
      ).toBeInTheDocument();
      unmount();

      returnWith('ord_panel_4', { confirmed: false, state: 'expired', message: 'ended' });
      render(<BillingPage />);
      await act(async () => {
        jest.advanceTimersByTime(4100);
      });
      expect(
        await screen.findByRole('status', { name: /no payment was taken/i })
      ).toBeInTheDocument();
    });

    it('a payment under review is described as being checked by our team, and can be re-checked', async () => {
      returnWith('ord_panel_5', {
        confirmed: false,
        state: 'needs_review',
        message: 'Payment received; our team is checking it',
      });
      render(<BillingPage />);
      await act(async () => {
        jest.advanceTimersByTime(4100);
      });
      expect(
        await screen.findByRole('status', { name: /our team is checking/i })
      ).toBeInTheDocument();
      callFunctionMock.mockClear();
      fireEvent.click(screen.getByRole('button', { name: /check again/i }));
      await waitFor(() =>
        expect(callFunctionMock).toHaveBeenCalledWith({
          functionName: 'verifyCashfreeOrder',
          data: { orderId: 'ord_panel_5' },
        })
      );
    });
  });

  it('a renewal return states the extended date, not the old one', async () => {
    window.history.replaceState({}, '', '/billing?cashfree_order_id=ord_renew');
    const before = liveSub({}, 10);
    const after = liveSub({}, 40); // +30 days stacked after the current end
    getByUserIdMock.mockResolvedValueOnce(before).mockResolvedValue(after);
    render(<BillingPage />);
    const end = new Date((after as unknown as { currentPeriodEnd: string }).currentPeriodEnd);
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        `Payment confirmed. Your Starter access is active until ${formatAccessDate(end)}.`,
        'success'
      )
    );
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
      await userEvent.click(await screen.findByRole('button', { name: /yearly · 365 days/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /couldn.t load your billing details/i
      );
      expect(screen.queryByText(/free plan/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/starter plan/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/available of/i)).not.toBeInTheDocument();
      // Entitlement unknown => no purchase may be started (it could double-buy).
      expect(
        await screen.findByRole('button', { name: /buy 365 days of business/i })
      ).toBeDisabled();
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

  describe('fixed-term prepaid access (no automatic renewal)', () => {
    it('a live term shows the paid-through date, says it does not renew, and has NO cancel button (nothing recurring to cancel)', async () => {
      const sub = liveSub({}, 12);
      getByUserIdMock.mockResolvedValue(sub);
      render(<BillingPage />);
      const end = new Date((sub as unknown as { currentPeriodEnd: string }).currentPeriodEnd);
      expect(
        await screen.findByText(
          `Access until ${formatAccessDate(end)}. Does not renew automatically.`
        )
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /cancel subscription/i })
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/cancels at period end/i)).not.toBeInTheDocument();
      expect(screen.getByText(/30 days of access · paid in advance/i)).toBeInTheDocument();
    });

    it('the Renew button buys the SAME plan and billing period as the live term, whatever the view toggle shows', async () => {
      getByUserIdMock.mockResolvedValue(liveSub({ planId: 'starter', billingCycle: 'monthly' }));
      callFunctionMock.mockResolvedValueOnce(cashfreeServerResponse('ord_renew'));
      render(<BillingPage />); // the view shows Yearly, the term is monthly
      await userEvent.click(await screen.findByRole('button', { name: /yearly · 365 days/i }));
      await userEvent.click(
        await screen.findByRole('button', { name: /^renew starter \(\+30 days\)$/i })
      );
      const dialog = await screen.findByRole('dialog', { name: /confirm your purchase/i });
      expect(dialog).toHaveTextContent(/added after your current access ends/i);
      await userEvent.click(screen.getByRole('button', { name: /pay ₹999 once/i }));
      await waitFor(() =>
        expect(callFunctionMock).toHaveBeenCalledWith({
          functionName: 'createCashfreeCheckout',
          data: expect.objectContaining({ planId: 'starter', billingCycle: 'monthly' }),
        })
      );
    });

    it('a different plan is not sold while a term is live (and clicking nothing calls the backend)', async () => {
      getByUserIdMock.mockResolvedValue(liveSub({ planId: 'starter', billingCycle: 'monthly' }));
      render(<BillingPage />);
      const blocked = await screen.findAllByRole('button', { name: /available after/i });
      expect(blocked.length).toBeGreaterThanOrEqual(3);
      for (const b of blocked) {
        expect(b).toBeDisabled();
        await userEvent.click(b);
      }
      expect(callFunctionMock).not.toHaveBeenCalled();
    });

    it('an ENDED term: shown as Free with when it ended, any plan can be bought again, and Renew is offered', async () => {
      const ended = liveSub({ planId: 'business', billingCycle: 'monthly' }, -3); // status still "active" in the record
      getByUserIdMock.mockResolvedValue(ended);
      render(<BillingPage />);
      await userEvent.click(await screen.findByRole('button', { name: /yearly · 365 days/i }));
      const end = new Date((ended as unknown as { currentPeriodEnd: string }).currentPeriodEnd);
      expect(
        await screen.findByRole('heading', { level: 2, name: /free plan/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          `Your Business access ended on ${formatAccessDate(end)}. You are on the Free plan. Renew to continue.`
        )
      ).toBeInTheDocument();
      expect(screen.queryByText(/access until/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^renew business$/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /buy 365 days of starter/i })).toBeEnabled();
      expect(screen.queryByText(/switching|available after/i)).not.toBeInTheDocument();
    });

    it('a live term explains how renewal and switching work', async () => {
      getByUserIdMock.mockResolvedValue(liveSub({}, 20));
      render(<BillingPage />);
      const note = await screen.findByText(
        /you can renew your current plan and billing period at any time/i
      );
      expect(note).toHaveTextContent(/new days are added after your current end date/i);
      expect(note).toHaveTextContent(
        /to switch to a different plan or billing period, buy it after your access ends/i
      );
      expect(
        within(note.parentElement as HTMLElement).getByText(/subscription plans/i)
      ).toBeInTheDocument();
    });
  });
});
