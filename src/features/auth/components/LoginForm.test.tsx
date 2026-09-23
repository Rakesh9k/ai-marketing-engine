import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const loginWithEmailPasswordMock = jest.fn();
const signInWithGoogleMock = jest.fn();
const logoutMock = jest.fn();
jest.mock('@/features/auth/services/authService', () => ({
  loginWithEmailPassword: (...args: unknown[]) => loginWithEmailPasswordMock(...args),
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

import { LoginForm } from './LoginForm';

/**
 * Phase 35 — Priority 1 (Auth). Tests user-visible behavior only: what
 * appears on screen and what gets called, never internal state or CSS.
 */
describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects submission with an empty email/password and never calls the login service', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(loginWithEmailPasswordMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid email format before calling the login service', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/^password/i), 'somepassword');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(loginWithEmailPasswordMock).not.toHaveBeenCalled();
  });

  it('calls the login service with the entered credentials and invokes onSuccess when it resolves', async () => {
    loginWithEmailPasswordMock.mockResolvedValue({ user: { uid: 'u1' } });
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    render(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/email/i), 'owner@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() =>
      expect(loginWithEmailPasswordMock).toHaveBeenCalledWith('owner@example.com', 'Password1')
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('shows an auth-failure message and never calls onSuccess when the login service rejects', async () => {
    loginWithEmailPasswordMock.mockRejectedValue({ code: 'auth/wrong-password' });
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    render(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/email/i), 'owner@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('disables the submit button while the login request is in flight (prevents duplicate submits)', async () => {
    let resolveLogin: (v: unknown) => void = () => {};
    loginWithEmailPasswordMock.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      })
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'owner@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1');
    const submitButton = screen.getByRole('button', { name: /log in/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    resolveLogin({ user: { uid: 'u1' } });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it('links to signup and forgot-password', () => {
    render(<LoginForm />);
    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: /forgot your password/i })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
  });

  it('an existing Google user is signed in and onSuccess is called without a consent prompt', async () => {
    signInWithGoogleMock.mockResolvedValue({ user: { uid: 'g1' } });
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: false });
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    render(<LoginForm onSuccess={onSuccess} />);

    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(callFunctionMock).not.toHaveBeenCalled();
  });

  it('a brand-new Google user is blocked on an explicit consent step before onSuccess fires', async () => {
    signInWithGoogleMock.mockResolvedValue({ user: { uid: 'g2' } });
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: true });
    callFunctionMock.mockResolvedValue({ success: true });
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    render(<LoginForm onSuccess={onSuccess} />);

    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(await screen.findByText(/review and accept our policies/i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();

    // Two checkboxes are now on screen: the form's existing "Remember me"
    // checkbox and the new inline Google consent-confirmation checkbox —
    // the latter is the one that just appeared.
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[checkboxes.length - 1] as HTMLElement);
    await user.click(screen.getByRole('button', { name: /agree & continue/i }));

    await waitFor(() =>
      expect(callFunctionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'recordConsentAcceptance',
          data: { accepted: true },
        })
      )
    );
    expect(onSuccess).toHaveBeenCalled();
  });
});
