'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { subscribeToAuthState, getCurrentUser } from '@/features/auth/services/authService';
import type { AuthState, AuthStatus } from '@/features/auth/types';

export function useAuth(): AuthState & {
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    user: null,
  });

  useEffect(() => {
    const initialUser = getCurrentUser();
    if (initialUser) {
      setState({ status: 'authenticated', user: initialUser });
    } else {
      setState({ status: 'unauthenticated', user: null });
    }

    const unsubscribe = subscribeToAuthState((user) => {
      if (user) {
        setState({ status: 'authenticated', user });
      } else {
        setState({ status: 'unauthenticated', user: null });
      }
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { loginWithEmailPassword } = await import('@/features/auth/services/authService');
    const result = await loginWithEmailPassword(email, password);
    return result.user;
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const { signupWithEmailPassword } = await import('@/features/auth/services/authService');
    const result = await signupWithEmailPassword(email, password);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    const { logout: authLogout } = await import('@/features/auth/services/authService');
    await authLogout();
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { sendPasswordReset: authSendPasswordReset } =
      await import('@/features/auth/services/authService');
    await authSendPasswordReset(email);
  }, []);

  return {
    ...state,
    login,
    signup,
    logout,
    sendPasswordReset,
  };
}

export function useAuthStatus(): AuthStatus {
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    const initialUser = getCurrentUser();
    setStatus(initialUser ? 'authenticated' : 'unauthenticated');

    const unsubscribe = subscribeToAuthState((user) => {
      setStatus(user ? 'authenticated' : 'unauthenticated');
    });

    return unsubscribe;
  }, []);

  return status;
}
