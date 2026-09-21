import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const useAuthStatusMock = jest.fn();
jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuthStatus: () => useAuthStatusMock(),
}));

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/dashboard',
}));

import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';

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
});
