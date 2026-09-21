import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const sendPasswordResetMock = jest.fn();
jest.mock('@/features/auth/services/authService', () => ({
  sendPasswordReset: (...args: unknown[]) => sendPasswordResetMock(...args),
}));

import { ForgotPasswordForm } from './ForgotPasswordForm';

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an invalid email before calling the reset service', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(sendPasswordResetMock).not.toHaveBeenCalled();
  });

  it('on success, shows a "check your email" confirmation without revealing whether the account exists', async () => {
    sendPasswordResetMock.mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    render(<ForgotPasswordForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/email/i), 'owner@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('shows an error message and stays on the form when the reset service rejects', async () => {
    sendPasswordResetMock.mockRejectedValue({ code: 'auth/network-request-failed' });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/email/i), 'owner@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
  });

  it('"Back to login" from the confirmation screen returns to the empty form', async () => {
    sendPasswordResetMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/email/i), 'owner@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    await screen.findByText(/check your email/i);

    await user.click(screen.getByRole('button', { name: /back to login/i }));

    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveValue('');
  });
});
