import React from 'react';
import { render, screen, act } from '@testing-library/react';

const getCurrentUserMock = jest.fn();
const subscribeToAuthStateMock = jest.fn();
const logoutMock = jest.fn();
const loginWithEmailPasswordMock = jest.fn();

jest.mock('@/features/auth/services/authService', () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
  subscribeToAuthState: (...args: unknown[]) => subscribeToAuthStateMock(...args),
  logout: (...args: unknown[]) => logoutMock(...args),
  loginWithEmailPassword: (...args: unknown[]) => loginWithEmailPasswordMock(...args),
}));

import { useAuth, useAuthStatus } from './useAuth';

/**
 * Phase 35 — Priority 1 (Auth): session persistence (a returning user with
 * a live Firebase session is authenticated immediately, not shown a
 * login screen), auth status transitions, and logout.
 */
function StatusProbe() {
  const { status, user } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="uid">{user?.uid || ''}</span>
    </div>
  );
}

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    subscribeToAuthStateMock.mockReturnValue(() => {});
  });

  it('session persistence: a user with an existing session is authenticated on mount, without a login flash', () => {
    getCurrentUserMock.mockReturnValue({ uid: 'returning_user' });
    render(<StatusProbe />);

    // No 'loading' flash should be observable to the caller by the time
    // the effect runs synchronously in this test render.
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('uid')).toHaveTextContent('returning_user');
  });

  it('a visitor with no session becomes unauthenticated once Firebase reports it, never stuck on loading', () => {
    getCurrentUserMock.mockReturnValue(null);
    let capturedCallback: ((user: unknown) => void) | undefined;
    subscribeToAuthStateMock.mockImplementation((cb: (user: unknown) => void) => {
      capturedCallback = cb;
      return () => {};
    });
    render(<StatusProbe />);

    // Firebase always fires onAuthStateChanged once after initialising, with
    // null when there is no session.
    act(() => {
      capturedCallback?.(null);
    });

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  // Regression (found in production, Phase 19C): on a hard load or refresh of
  // a protected URL, auth.currentUser is null until the persisted session has
  // been restored. Reporting 'unauthenticated' at that point made
  // ProtectedRoute redirect a signed-in user to /login (and on to /dashboard).
  it('does NOT report unauthenticated before Firebase has resolved the persisted session', () => {
    getCurrentUserMock.mockReturnValue(null);
    let capturedCallback: ((user: unknown) => void) | undefined;
    subscribeToAuthStateMock.mockImplementation((cb: (user: unknown) => void) => {
      capturedCallback = cb;
      return () => {};
    });
    render(<StatusProbe />);

    expect(screen.getByTestId('status')).toHaveTextContent('loading');

    // Firebase then restores the saved session and reports the user.
    act(() => {
      capturedCallback?.({ uid: 'restored_user' });
    });

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('uid')).toHaveTextContent('restored_user');
  });

  it('reacts to a later auth-state change (e.g. session established async) via the subscription', () => {
    getCurrentUserMock.mockReturnValue(null);
    let capturedCallback: ((user: unknown) => void) | undefined;
    subscribeToAuthStateMock.mockImplementation((cb: (user: unknown) => void) => {
      capturedCallback = cb;
      return () => {};
    });
    render(<StatusProbe />);
    expect(screen.getByTestId('status')).toHaveTextContent('loading');

    act(() => {
      capturedCallback?.({ uid: 'newly_signed_in' });
    });

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('uid')).toHaveTextContent('newly_signed_in');
  });

  it('reacts to a sign-out via the subscription, clearing the user', () => {
    getCurrentUserMock.mockReturnValue({ uid: 'u1' });
    let capturedCallback: ((user: unknown) => void) | undefined;
    subscribeToAuthStateMock.mockImplementation((cb: (user: unknown) => void) => {
      capturedCallback = cb;
      return () => {};
    });
    render(<StatusProbe />);
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');

    act(() => {
      capturedCallback?.(null);
    });

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('uid')).toHaveTextContent('');
  });

  it('logout() calls the underlying auth service', async () => {
    logoutMock.mockResolvedValue(undefined);
    let hookResult: ReturnType<typeof useAuth> | undefined;
    function Probe() {
      hookResult = useAuth();
      return null;
    }
    getCurrentUserMock.mockReturnValue({ uid: 'u1' });
    render(<Probe />);

    await act(async () => {
      await hookResult!.logout();
    });

    expect(logoutMock).toHaveBeenCalled();
  });

  it('login() surfaces a rejection from the auth service (auth failure) to the caller', async () => {
    loginWithEmailPasswordMock.mockRejectedValue(new Error('bad credentials'));
    let hookResult: ReturnType<typeof useAuth> | undefined;
    function Probe() {
      hookResult = useAuth();
      return null;
    }
    getCurrentUserMock.mockReturnValue(null);
    render(<Probe />);

    await expect(hookResult!.login('a@b.com', 'wrong')).rejects.toThrow('bad credentials');
  });
});

describe('useAuthStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    subscribeToAuthStateMock.mockReturnValue(() => {});
  });

  it('reports the same persisted session status as useAuth, independently', () => {
    getCurrentUserMock.mockReturnValue({ uid: 'u1' });
    function Probe() {
      return <span data-testid="status">{useAuthStatus()}</span>;
    }
    render(<Probe />);
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  });

  it('stays loading (not unauthenticated) until the first auth callback, then follows it', () => {
    getCurrentUserMock.mockReturnValue(null);
    let capturedCallback: ((user: unknown) => void) | undefined;
    subscribeToAuthStateMock.mockImplementation((cb: (user: unknown) => void) => {
      capturedCallback = cb;
      return () => {};
    });
    function Probe() {
      return <span data-testid="status">{useAuthStatus()}</span>;
    }
    render(<Probe />);
    expect(screen.getByTestId('status')).toHaveTextContent('loading');

    act(() => {
      capturedCallback?.({ uid: 'restored_user' });
    });
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');

    act(() => {
      capturedCallback?.(null);
    });
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });
});
