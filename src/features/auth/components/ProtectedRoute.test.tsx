import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';

const useAuthStatusMock = jest.fn();
jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuthStatus: () => useAuthStatusMock(),
}));

const pushMock = jest.fn();
const replaceMock = jest.fn();
const resolveMock = jest.fn();
jest.mock('@/features/auth/utils/postAuthRouting', () => ({
  resolvePostAuthDestination: (...args: unknown[]) => resolveMock(...args),
}));
jest.mock('@/features/auth/services/authService', () => ({
  getCurrentUser: () => ({ uid: 'u1' }),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  usePathname: () => '/dashboard',
}));

import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';
import { beginAuthFlow } from '@/features/auth/authFlowState';

/**
 * Phase 35 — Priority 1 (Auth): unauthorized route access and auth loading
 * state. Behavior only — never asserts on the spinner's CSS classes, only
 * its accessible role/label and what the user would actually see.
 */
describe('ProtectedRoute', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a loading indicator while auth status is unresolved, and renders nothing else', () => {
    useAuthStatusMock.mockReturnValue('loading');
    render(
      <ProtectedRoute>
        <div>Secret dashboard content</div>
      </ProtectedRoute>
    );
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    expect(screen.queryByText('Secret dashboard content')).not.toBeInTheDocument();
  });

  it('redirects to /login with a return path when the user is unauthenticated, without rendering protected content', async () => {
    useAuthStatusMock.mockReturnValue('unauthenticated');
    render(
      <ProtectedRoute>
        <div>Secret dashboard content</div>
      </ProtectedRoute>
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login?redirect=%2Fdashboard'));
    expect(screen.queryByText('Secret dashboard content')).not.toBeInTheDocument();
  });

  it('renders the protected content once authenticated, and never redirects', async () => {
    useAuthStatusMock.mockReturnValue('authenticated');
    render(
      <ProtectedRoute>
        <div>Secret dashboard content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Secret dashboard content')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 0));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('renders a custom fallback instead of nothing while redirecting an unauthenticated user', () => {
    useAuthStatusMock.mockReturnValue('unauthenticated');
    render(
      <ProtectedRoute fallback={<div>Redirecting...</div>}>
        <div>Secret dashboard content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Redirecting...')).toBeInTheDocument();
  });
});

describe('PublicOnlyRoute', () => {
  beforeEach(() => jest.clearAllMocks());

  it('redirects an already-authenticated user away from a public-only page (e.g. /login) to /dashboard', async () => {
    useAuthStatusMock.mockReturnValue('authenticated');
    render(
      <PublicOnlyRoute>
        <div>Login form</div>
      </PublicOnlyRoute>
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
    expect(screen.queryByText('Login form')).not.toBeInTheDocument();
  });

  it('renders the public content (e.g. the login form) for an unauthenticated visitor', () => {
    useAuthStatusMock.mockReturnValue('unauthenticated');
    render(
      <PublicOnlyRoute>
        <div>Login form</div>
      </PublicOnlyRoute>
    );
    expect(screen.getByText('Login form')).toBeInTheDocument();
  });

  it('smartRedirect sends the user wherever the post-auth resolver says, passing the ?redirect value', async () => {
    useAuthStatusMock.mockReturnValue('authenticated');
    resolveMock.mockResolvedValue('/onboarding');
    render(
      <PublicOnlyRoute smartRedirect redirectParam="/campaigns/new">
        <div>Signup form</div>
      </PublicOnlyRoute>
    );
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/onboarding'));
    expect(resolveMock).toHaveBeenCalledWith({ uid: 'u1' }, '/campaigns/new');
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Signup form')).not.toBeInTheDocument();
  });

  it('does not redirect or unmount while a sign-in is still mid-flight (new Google user consent)', async () => {
    useAuthStatusMock.mockReturnValue('authenticated');
    resolveMock.mockResolvedValue('/onboarding');
    let release!: () => void;
    act(() => {
      release = beginAuthFlow();
    });
    render(
      <PublicOnlyRoute smartRedirect>
        <div>Consent card</div>
      </PublicOnlyRoute>
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText('Consent card')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();

    act(() => release());
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/onboarding'));
  });
});
