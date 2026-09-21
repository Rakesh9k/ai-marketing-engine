import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const signupWithEmailPasswordMock = jest.fn();
const sendVerificationEmailMock = jest.fn();
jest.mock('@/features/auth/services/authService', () => ({
  signupWithEmailPassword: (...args: unknown[]) => signupWithEmailPasswordMock(...args),
  sendVerificationEmail: (...args: unknown[]) => sendVerificationEmailMock(...args),
}));

import { SignupForm } from './SignupForm';

describe('SignupForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/email/i), 'owner@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
  }

  it('rejects a weak password (missing uppercase/number) before calling the signup service', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/email/i), 'owner@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'weakpass');
    await user.type(screen.getByLabelText(/confirm password/i), 'weakpass');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/uppercase letter/i)).toBeInTheDocument();
    expect(signupWithEmailPasswordMock).not.toHaveBeenCalled();
  });

  it('rejects mismatched password confirmation before calling the signup service', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/email/i), 'owner@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password2');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(signupWithEmailPasswordMock).not.toHaveBeenCalled();
  });

  it('on valid input, calls the signup service and shows the verification-email notice, not a dashboard redirect', async () => {
    signupWithEmailPasswordMock.mockResolvedValue({ user: { uid: 'u1' } });
    const user = userEvent.setup();
    render(<SignupForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(signupWithEmailPasswordMock).toHaveBeenCalledWith('owner@example.com', 'Password1')
    );
    expect(await screen.findByText(/verification email sent/i)).toBeInTheDocument();
  });

  it('shows an auth-failure message and stays on the form when the signup service rejects', async () => {
    signupWithEmailPasswordMock.mockRejectedValue({ code: 'auth/email-already-in-use' });
    const user = userEvent.setup();
    render(<SignupForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/verification email sent/i)).not.toBeInTheDocument();
  });

  it('the "resend verification email" action calls the resend service', async () => {
    signupWithEmailPasswordMock.mockResolvedValue({ user: { uid: 'u1' } });
    sendVerificationEmailMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SignupForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    const resendButton = await screen.findByRole('button', { name: /resend verification email/i });
    await user.click(resendButton);

    await waitFor(() => expect(sendVerificationEmailMock).toHaveBeenCalled());
  });
});
