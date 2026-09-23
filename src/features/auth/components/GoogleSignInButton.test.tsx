import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const signInWithGoogleMock = jest.fn();
const logoutMock = jest.fn();
jest.mock('@/features/auth/services/authService', () => ({
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

import { GoogleSignInButton } from './GoogleSignInButton';

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onSuccess immediately for an existing (returning) Google user, without touching consent', async () => {
    signInWithGoogleMock.mockResolvedValue({ user: { uid: 'g1' } });
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: false });
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    render(<GoogleSignInButton onSuccess={onSuccess} />);

    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(callFunctionMock).not.toHaveBeenCalled();
    expect(logoutMock).not.toHaveBeenCalled();
  });

  it('a new Google user is blocked until they explicitly check the consent box and confirm', async () => {
    signInWithGoogleMock.mockResolvedValue({ user: { uid: 'g2' } });
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: true });
    callFunctionMock.mockResolvedValue({ success: true });
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    render(<GoogleSignInButton onSuccess={onSuccess} />);

    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(await screen.findByText(/review and accept our policies/i)).toBeInTheDocument();
    // "Agree & continue" must stay disabled until the box is checked.
    expect(screen.getByRole('button', { name: /agree & continue/i })).toBeDisabled();
    expect(onSuccess).not.toHaveBeenCalled();

    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: /agree & continue/i })).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: /agree & continue/i }));

    await waitFor(() =>
      expect(callFunctionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'recordConsentAcceptance',
          data: { accepted: true },
        })
      )
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('canceling the consent step signs the newly-created Google user back out', async () => {
    signInWithGoogleMock.mockResolvedValue({ user: { uid: 'g3' } });
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: true });
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    render(<GoogleSignInButton onSuccess={onSuccess} />);

    await user.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(await screen.findByText(/review and accept our policies/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
    expect(callFunctionMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    // Back to the initial "Continue with Google" state.
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  function firebaseError(code: string): Error {
    const err = new Error(code) as Error & { code: string };
    err.code = code;
    return err;
  }

  it('maps a popup-closed-by-user error to a friendly message and does not call onSuccess', async () => {
    signInWithGoogleMock.mockRejectedValue(firebaseError('auth/popup-closed-by-user'));
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    render(<GoogleSignInButton onSuccess={onSuccess} />);

    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/cancelled/i);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('maps account-exists-with-different-credential to a clear collision message', async () => {
    signInWithGoogleMock.mockRejectedValue(
      firebaseError('auth/account-exists-with-different-credential')
    );
    const user = userEvent.setup();
    render(<GoogleSignInButton onSuccess={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/different sign-in method/i);
  });

  it('respects the disabled prop (e.g. signup page gating on the Terms checkbox)', () => {
    render(<GoogleSignInButton onSuccess={jest.fn()} disabled />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeDisabled();
    expect(signInWithGoogleMock).not.toHaveBeenCalled();
  });
});
