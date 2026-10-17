import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const callFunctionMock = jest.fn();
jest.mock('@/services/api', () => ({
  callFunction: (...args: unknown[]) => callFunctionMock(...args),
}));
const openMock = jest.fn();
jest.mock('@/lib/cashfree/initCashfree', () => ({
  openCashfreeCheckout: (...args: unknown[]) => openMock(...args),
}));

import { useCashfreeCheckout } from './useCashfreeCheckout';
import { CheckoutPhonePrompt } from './CheckoutPhonePrompt';

const onError = jest.fn();
function Harness() {
  const { start, phonePrompt, submitPhone, cancelPhone, pendingKey } = useCashfreeCheckout(onError);
  return (
    <div>
      <button onClick={() => start({ kind: 'pack', credits: 500 })}>buy</button>
      <CheckoutPhonePrompt
        prompt={phonePrompt}
        busy={pendingKey !== null}
        onSubmit={submitPhone}
        onCancel={cancelPhone}
      />
    </div>
  );
}
const phoneError = (code: string) => Object.assign(new Error('x'), { details: { code } });
const session = {
  orderId: 'o',
  paymentSessionId: 's',
  environment: 'sandbox',
  amountINR: 1,
  currency: 'INR',
};

beforeEach(() => {
  callFunctionMock.mockReset();
  openMock.mockReset();
  onError.mockReset();
});

describe('checkout asks for a real phone number instead of inventing one', () => {
  it('PHONE_REQUIRED opens the prompt; a bad number is refused in the browser without a server call', async () => {
    callFunctionMock.mockRejectedValueOnce(phoneError('PHONE_REQUIRED'));
    render(<Harness />);
    await userEvent.click(screen.getByText('buy'));
    const input = await screen.findByLabelText('Mobile number');
    expect(onError).not.toHaveBeenCalled();

    await userEvent.type(input, '9999999999');
    await userEvent.click(screen.getByText('Continue to payment'));
    expect(await screen.findByText(/valid 10-digit Indian mobile number/)).toBeTruthy();
    expect(callFunctionMock).toHaveBeenCalledTimes(1); // only the first attempt
    expect(openMock).not.toHaveBeenCalled();
  });

  it('a valid number is sent with the retry and checkout opens', async () => {
    callFunctionMock
      .mockRejectedValueOnce(phoneError('PHONE_REQUIRED'))
      .mockResolvedValueOnce(session);
    render(<Harness />);
    await userEvent.click(screen.getByText('buy'));
    await userEvent.type(await screen.findByLabelText('Mobile number'), '98123 45670');
    await userEvent.click(screen.getByText('Continue to payment'));
    await waitFor(() => expect(openMock).toHaveBeenCalledTimes(1));
    expect(callFunctionMock.mock.calls[1]![0].data.customerPhone).toBe('98123 45670');
    expect(callFunctionMock.mock.calls[0]![0].data.customerPhone).toBeUndefined();
    await waitFor(() => expect(screen.queryByLabelText('Mobile number')).toBeNull());
  });

  it('a server INVALID_PHONE keeps the prompt open with the help text', async () => {
    callFunctionMock
      .mockRejectedValueOnce(phoneError('PHONE_REQUIRED'))
      .mockRejectedValueOnce(phoneError('INVALID_PHONE'));
    render(<Harness />);
    await userEvent.click(screen.getByText('buy'));
    await userEvent.type(await screen.findByLabelText('Mobile number'), '98123 45670');
    await userEvent.click(screen.getByText('Continue to payment'));
    expect(await screen.findByText(/valid 10-digit Indian mobile number/)).toBeTruthy();
    expect(openMock).not.toHaveBeenCalled();
  });

  it('cancel closes the prompt; other errors still go to the toast', async () => {
    callFunctionMock
      .mockRejectedValueOnce(phoneError('PHONE_REQUIRED'))
      .mockRejectedValueOnce(new Error('boom'));
    render(<Harness />);
    await userEvent.click(screen.getByText('buy'));
    await screen.findByLabelText('Mobile number');
    await userEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByLabelText('Mobile number')).toBeNull();
    await userEvent.click(screen.getByText('buy'));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('boom', 'error'));
  });
});
