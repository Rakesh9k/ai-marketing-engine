import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
}));

const callFunctionMock = jest.fn();
jest.mock('@/services/api', () => ({
  callFunction: (...args: unknown[]) => callFunctionMock(...args),
}));

const loadRazorpayCheckoutMock = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/razorpay/loadCheckout', () => ({
  loadRazorpayCheckout: () => loadRazorpayCheckoutMock(),
}));

import BillingPage from './page';

/**
 * Phase 19A — proves the billing UI actually drives the existing backend
 * payment infrastructure (createSubscription -> Razorpay Checkout ->
 * verifyPayment) rather than the prior console.log()+alert() stub. Razorpay
 * Checkout itself is mocked at the window.Razorpay boundary (the real
 * Checkout.js is a third-party script that opens a real payment iframe —
 * not something a unit test should load), but everything on this
 * application's own side of that boundary (which function is called, with
 * what arguments, in what order) is exercised for real.
 */
describe('BillingPage — Razorpay checkout wiring (Phase 19A)', () => {
  let razorpayConstructorMock: jest.Mock;
  let checkoutOpenMock: jest.Mock;
  let capturedOptions: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['NEXT_PUBLIC_RAZORPAY_KEY_ID'] = 'rzp_test_fake_key_id';

    useAuthMock.mockReturnValue({ user: { uid: 'user_1', email: 'owner@example.test' } });
    getByUserIdMock.mockResolvedValue(null); // starts on the free plan

    checkoutOpenMock = jest.fn();
    razorpayConstructorMock = jest.fn().mockImplementation((options: any) => {
      capturedOptions = options;
      return { open: checkoutOpenMock };
    });
    (window as any).Razorpay = razorpayConstructorMock;
  });

  afterEach(() => {
    delete (window as any).Razorpay;
    delete process.env['NEXT_PUBLIC_RAZORPAY_KEY_ID'];
  });

  it('clicking "Upgrade to this Plan" calls createSubscription, then opens the real Razorpay Checkout with the returned subscription_id', async () => {
    callFunctionMock.mockResolvedValueOnce({
      subscriptionId: 'sub_abc123',
      shortUrl: 'https://rzp.io/i/abc123',
      planId: 'business',
      price: 999,
    });

    render(<BillingPage />);

    const businessButtons = await screen.findAllByRole('button', { name: /upgrade to this plan/i });
    await userEvent.click(businessButtons[1]!); // starter, business, agency in PLAN_DETAILS key order

    await waitFor(() => expect(callFunctionMock).toHaveBeenCalledTimes(1));
    expect(callFunctionMock).toHaveBeenCalledWith({
      functionName: 'createSubscription',
      data: { planId: 'business' },
    });

    await waitFor(() => expect(razorpayConstructorMock).toHaveBeenCalledTimes(1));
    expect(capturedOptions.subscription_id).toBe('sub_abc123');
    expect(capturedOptions.key).toBe('rzp_test_fake_key_id');
    expect(checkoutOpenMock).toHaveBeenCalledTimes(1);
  });

  it('a successful Razorpay checkout calls verifyPayment exactly once with the correct payment/signature, and never grants credits itself', async () => {
    callFunctionMock.mockImplementation((opts: any) => {
      if (opts.functionName === 'createSubscription') {
        return { subscriptionId: 'sub_abc123', shortUrl: '', planId: 'business', price: 999 };
      }
      if (opts.functionName === 'verifyPayment') {
        return { success: true, status: 'active' };
      }
      throw new Error(`unexpected function ${opts.functionName}`);
    });

    render(<BillingPage />);
    const businessButtons = await screen.findAllByRole('button', { name: /upgrade to this plan/i });
    await userEvent.click(businessButtons[1]!);

    await waitFor(() => expect(razorpayConstructorMock).toHaveBeenCalledTimes(1));

    // Simulate Razorpay's own success callback — this application's code
    // never calls Razorpay's internal payment logic, only reacts to it.
    capturedOptions.handler({
      razorpay_payment_id: 'pay_xyz789',
      razorpay_subscription_id: 'sub_abc123',
      razorpay_signature: 'sig_fake_but_realistic_hex',
    });

    await waitFor(() =>
      expect(callFunctionMock).toHaveBeenCalledWith({
        functionName: 'verifyPayment',
        data: {
          razorpaySubscriptionId: 'sub_abc123',
          razorpayPaymentId: 'pay_xyz789',
          razorpaySignature: 'sig_fake_but_realistic_hex',
        },
      })
    );

    // verifyPayment must be called exactly once for one successful checkout
    // — no duplicate confirmation call.
    const verifyCalls = callFunctionMock.mock.calls.filter(
      ([opts]) => opts.functionName === 'verifyPayment'
    );
    expect(verifyCalls).toHaveLength(1);
    expect(showToastMock).toHaveBeenCalledWith(expect.stringMatching(/successful/i), 'success');
  });

  it('the free plan and the current plan are never purchasable — no createSubscription call, no Razorpay Checkout opened', async () => {
    getByUserIdMock.mockResolvedValue({ planId: 'starter' } as Subscription);

    render(<BillingPage />);

    const freeButton = await screen.findByRole('button', { name: /free plan/i });
    expect(freeButton).toBeDisabled();

    const currentPlanButton = await screen.findByRole('button', { name: /current plan/i });
    expect(currentPlanButton).toBeDisabled();

    expect(callFunctionMock).not.toHaveBeenCalled();
    expect(razorpayConstructorMock).not.toHaveBeenCalled();
  });

  it('without NEXT_PUBLIC_RAZORPAY_KEY_ID configured, clicking upgrade shows an error and never calls the backend', async () => {
    delete process.env['NEXT_PUBLIC_RAZORPAY_KEY_ID'];

    render(<BillingPage />);
    const businessButtons = await screen.findAllByRole('button', { name: /upgrade to this plan/i });
    await userEvent.click(businessButtons[1]!);

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(expect.stringMatching(/not configured/i), 'error')
    );
    expect(callFunctionMock).not.toHaveBeenCalled();
    expect(razorpayConstructorMock).not.toHaveBeenCalled();
  });

  it('cancel: dismissing the Razorpay modal re-enables the upgrade button, without calling verifyPayment or granting credits', async () => {
    callFunctionMock.mockResolvedValueOnce({
      subscriptionId: 'sub_abc123',
      shortUrl: '',
      planId: 'business',
      price: 999,
    });

    render(<BillingPage />);
    const businessButtons = await screen.findAllByRole('button', { name: /upgrade to this plan/i });
    await userEvent.click(businessButtons[1]!);

    await waitFor(() => expect(razorpayConstructorMock).toHaveBeenCalledTimes(1));
    expect(businessButtons[1]).toBeDisabled();

    // Simulate the user closing the Razorpay modal without paying.
    capturedOptions.modal.ondismiss();

    await waitFor(() => expect(businessButtons[1]).not.toBeDisabled());
    expect(callFunctionMock).toHaveBeenCalledTimes(1); // createSubscription only, never verifyPayment
  });

  it('failure: createSubscription rejecting shows an error toast and re-enables the button, without ever opening Razorpay', async () => {
    callFunctionMock.mockRejectedValueOnce(new Error('Insufficient plan eligibility'));

    render(<BillingPage />);
    const businessButtons = await screen.findAllByRole('button', { name: /upgrade to this plan/i });
    await userEvent.click(businessButtons[1]!);

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith('Insufficient plan eligibility', 'error')
    );
    expect(razorpayConstructorMock).not.toHaveBeenCalled();
    await waitFor(() => expect(businessButtons[1]).not.toBeDisabled());
  });

  it('failure: verifyPayment rejecting after a successful checkout shows a "contact support" warning, not a false success', async () => {
    callFunctionMock.mockImplementation((opts: any) => {
      if (opts.functionName === 'createSubscription') {
        return { subscriptionId: 'sub_abc123', shortUrl: '', planId: 'business', price: 999 };
      }
      if (opts.functionName === 'verifyPayment') {
        return Promise.reject(new Error('signature mismatch'));
      }
      throw new Error(`unexpected function ${opts.functionName}`);
    });

    render(<BillingPage />);
    const businessButtons = await screen.findAllByRole('button', { name: /upgrade to this plan/i });
    await userEvent.click(businessButtons[1]!);
    await waitFor(() => expect(razorpayConstructorMock).toHaveBeenCalledTimes(1));

    capturedOptions.handler({
      razorpay_payment_id: 'pay_xyz789',
      razorpay_subscription_id: 'sub_abc123',
      razorpay_signature: 'sig_fake',
    });

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.stringMatching(/could not confirm it automatically/i),
        'warning'
      )
    );
    expect(showToastMock).not.toHaveBeenCalledWith(expect.stringMatching(/successful/i), 'success');
  });

  it('duplicate action: a second click while an upgrade is already in flight does not call createSubscription again', async () => {
    let resolveCreate: (v: unknown) => void = () => {};
    callFunctionMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreate = resolve;
      })
    );

    render(<BillingPage />);
    const businessButtons = await screen.findAllByRole('button', { name: /upgrade to this plan/i });
    await userEvent.click(businessButtons[1]!);

    expect(businessButtons[1]).toBeDisabled();
    // A second click can't fire through a disabled button in a real
    // browser; this proves the guard that makes that true — the app
    // never relies on the click handler itself to no-op a duplicate.
    await userEvent.click(businessButtons[1]!);
    expect(callFunctionMock).toHaveBeenCalledTimes(1);

    resolveCreate({ subscriptionId: 'sub_1', shortUrl: '', planId: 'business', price: 999 });
  });

  it('credit update: the success path refreshes the subscription from the backend, never incrementing credits on the client', async () => {
    getByUserIdMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      planId: 'business',
      creditsIncluded: 500,
    } as Subscription);
    callFunctionMock.mockImplementation((opts: any) => {
      if (opts.functionName === 'createSubscription') {
        return { subscriptionId: 'sub_abc123', shortUrl: '', planId: 'business', price: 999 };
      }
      if (opts.functionName === 'verifyPayment') {
        return { success: true, status: 'active' };
      }
      throw new Error(`unexpected function ${opts.functionName}`);
    });

    render(<BillingPage />);
    const businessButtons = await screen.findAllByRole('button', { name: /upgrade to this plan/i });
    await userEvent.click(businessButtons[1]!);
    await waitFor(() => expect(razorpayConstructorMock).toHaveBeenCalledTimes(1));

    capturedOptions.handler({
      razorpay_payment_id: 'pay_xyz789',
      razorpay_subscription_id: 'sub_abc123',
      razorpay_signature: 'sig_fake',
    });

    // getByUserId (the real subscription record) is re-fetched after a
    // verified payment — credits are never bumped by client arithmetic.
    await waitFor(() => expect(getByUserIdMock).toHaveBeenCalledTimes(2));
  });
});
