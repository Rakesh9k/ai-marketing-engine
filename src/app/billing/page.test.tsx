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

const submitPayUCheckoutMock = jest.fn();
jest.mock('@/lib/payu/submitCheckout', () => ({
  submitPayUCheckout: (...args: unknown[]) => submitPayUCheckoutMock(...args),
}));

import BillingPage from './page';

const FAKE_PAYU_PAYMENT = {
  action: 'https://test.payu.in/_payment',
  key: 'test-merchant-key',
  txnid: 'txn_abc123',
  amount: '999.00',
  productinfo: 'Mitra business plan subscription',
  firstname: 'Test',
  email: 'owner@example.test',
  phone: '9999999999',
  surl: 'https://cloudfunctions.net/payuCallback',
  furl: 'https://cloudfunctions.net/payuCallback',
  udf1: 'user_1',
  udf2: 'business',
  hash: 'fake-hash-value',
};

/**
 * PayU migration — proves the billing UI drives createPayUPayment then
 * hands the exact returned params to submitPayUCheckout (the real
 * implementation of which builds+submits a hidden HTML form; that DOM/
 * navigation behavior is mocked here, not the application logic that
 * decides what to submit and when). Credits/subscription state changes are
 * never asserted from client-side arithmetic — only from a re-fetch of the
 * subscription record, since the actual grant happens exclusively in
 * payuWebhook.ts server-side.
 */
describe('BillingPage — PayU checkout wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthMock.mockReturnValue({ user: { uid: 'user_1', email: 'owner@example.test' } });
    getByUserIdMock.mockResolvedValue(null); // starts on the free plan
    window.history.replaceState({}, '', '/billing');
  });

  it('clicking "Upgrade to this Plan" calls createPayUPayment with only the planId, then submits the returned PayU checkout params', async () => {
    callFunctionMock.mockResolvedValueOnce(FAKE_PAYU_PAYMENT);

    render(<BillingPage />);
    const businessButtons = await screen.findAllByRole('button', { name: /upgrade to this plan/i });
    await userEvent.click(businessButtons[1]!); // starter, business, agency in PLAN_DETAILS key order

    await waitFor(() => expect(callFunctionMock).toHaveBeenCalledTimes(1));
    expect(callFunctionMock).toHaveBeenCalledWith({
      functionName: 'createPayUPayment',
      data: { planId: 'business' },
    });

    await waitFor(() => expect(submitPayUCheckoutMock).toHaveBeenCalledTimes(1));
    expect(submitPayUCheckoutMock).toHaveBeenCalledWith(FAKE_PAYU_PAYMENT);
  });

  it('the free plan and the current plan are never purchasable — no createPayUPayment call, no checkout submitted', async () => {
    getByUserIdMock.mockResolvedValue({ planId: 'starter' } as Subscription);

    render(<BillingPage />);

    const freeButton = await screen.findByRole('button', { name: /free plan/i });
    expect(freeButton).toBeDisabled();

    const currentPlanButton = await screen.findByRole('button', { name: /current plan/i });
    expect(currentPlanButton).toBeDisabled();

    expect(callFunctionMock).not.toHaveBeenCalled();
    expect(submitPayUCheckoutMock).not.toHaveBeenCalled();
  });

  it('failure: createPayUPayment rejecting shows an error toast, re-enables the button, and never submits checkout', async () => {
    callFunctionMock.mockRejectedValueOnce(new Error('Payments are not fully configured yet.'));

    render(<BillingPage />);
    const businessButtons = await screen.findAllByRole('button', { name: /upgrade to this plan/i });
    await userEvent.click(businessButtons[1]!);

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith('Payments are not fully configured yet.', 'error')
    );
    expect(submitPayUCheckoutMock).not.toHaveBeenCalled();
    await waitFor(() => expect(businessButtons[1]).not.toBeDisabled());
  });

  it('duplicate action: a second click while an upgrade is already in flight does not call createPayUPayment again', async () => {
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
    // browser; this proves the guard that makes that true.
    await userEvent.click(businessButtons[1]!);
    expect(callFunctionMock).toHaveBeenCalledTimes(1);

    resolveCreate(FAKE_PAYU_PAYMENT);
  });

  it('returning from PayU with payu=success shows a success toast and refreshes the subscription from the backend', async () => {
    window.history.replaceState({}, '', '/billing?payu=success&txnid=txn_abc123');
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
    // Credits are never computed client-side — only re-read from Firestore
    // via a second subscription fetch (the first is the page's initial load).
    await waitFor(() => expect(getByUserIdMock).toHaveBeenCalledTimes(2));
    // The query string is cleaned up so a refresh doesn't re-show the toast.
    expect(window.location.search).toBe('');
  });

  it('returning from PayU with payu=failure shows a "not completed" warning, not a success message', async () => {
    window.history.replaceState({}, '', '/billing?payu=failure&txnid=txn_abc123');

    render(<BillingPage />);

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(expect.stringMatching(/not completed/i), 'warning')
    );
    expect(showToastMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/payment received/i),
      'success'
    );
  });

  it('returning from PayU with payu=pending shows a processing message, grants nothing client-side', async () => {
    window.history.replaceState({}, '', '/billing?payu=pending&txnid=txn_abc123');

    render(<BillingPage />);

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(expect.stringMatching(/being processed/i), 'info')
    );
  });

  it('returning from PayU with payu=unverified (tampered/invalid hash on the redirect) warns rather than claiming success', async () => {
    window.history.replaceState({}, '', '/billing?payu=unverified&txnid=txn_abc123');

    render(<BillingPage />);

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.stringMatching(/could not verify/i),
        'warning'
      )
    );
  });

  it('with no payu query param present, no PayU-return toast fires', async () => {
    render(<BillingPage />);
    await screen.findAllByRole('button', { name: /upgrade to this plan/i });
    expect(showToastMock).not.toHaveBeenCalled();
  });
});
