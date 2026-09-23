import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const signupWithEmailPasswordMock = jest.fn();
const sendVerificationEmailMock = jest.fn();
const signInWithGoogleMock = jest.fn();
const logoutMock = jest.fn();
jest.mock('@/features/auth/services/authService', () => ({
  signupWithEmailPassword: (...args: unknown[]) => signupWithEmailPasswordMock(...args),
  sendVerificationEmail: (...args: unknown[]) => sendVerificationEmailMock(...args),
  signInWithGoogle: (...args: unknown[]) => signInWithGoogleMock(...args),
  logout: (...args: unknown[]) => logoutMock(...args),
}));

const callFunctionMock = jest.fn();
jest.mock('@/services/api', () => ({
  callFunction: (...args: unknown[]) => callFunctionMock(...args),
}));

const getAdditionalUserInfoMock = jest.fn();
jest.mock('firebase/auth', () => ({
  getAdditionalUserInfo: (...args: unknown[]) => getAdditionalUserInfoMock(...args),
}));

import { SignupForm } from './SignupForm';

describe('SignupForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callFunctionMock.mockResolvedValue({ success: true });
  });

  async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/email/i), 'owner@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
    await user.click(screen.getByRole('checkbox'));
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

  it('records Terms/Privacy consent acceptance server-side after a successful signup', async () => {
    signupWithEmailPasswordMock.mockResolvedValue({ user: { uid: 'u1' } });
    const user = userEvent.setup();
    render(<SignupForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(callFunctionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'recordConsentAcceptance',
          data: { accepted: true },
        })
      )
    );
  });

  it('blocks submission with a validation message when the Terms/Privacy checkbox is not checked', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);
    await user.type(screen.getByLabelText(/email/i), 'owner@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/must agree to the terms/i)).toBeInTheDocument();
    expect(signupWithEmailPasswordMock).not.toHaveBeenCalled();
  });

  it('the Google button stays disabled until the Terms/Privacy checkbox is checked', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeDisabled();

    await user.click(screen.getByRole('checkbox'));

    expect(screen.getByRole('button', { name: /continue with google/i })).not.toBeDisabled();
  });

  it('a brand-new Google user must explicitly accept consent before Google signup completes', async () => {
    signInWithGoogleMock.mockResolvedValue({ user: { uid: 'g3' } });
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: true });
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(await screen.findByText(/review and accept our policies/i)).toBeInTheDocument();

    // Two checkboxes are now on screen: the original signup Terms/Privacy
    // checkbox (already checked) and this new inline consent-confirmation
    // checkbox inside the Google consent panel (unchecked) — the second one.
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1] as HTMLElement);
    await user.click(screen.getByRole('button', { name: /agree & continue/i }));

    await waitFor(() =>
      expect(callFunctionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'recordConsentAcceptance',
          data: { accepted: true },
        })
      )
    );
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
