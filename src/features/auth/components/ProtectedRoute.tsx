'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStatus } from '@/features/auth/hooks/useAuth';
import { useAuthFlowBusy } from '@/features/auth/authFlowState';
import { MitraMark } from '@/components/ui/MitraMark';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, fallback = null }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const authStatus = useAuthStatus();

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [authStatus, router, pathname]);

  if (authStatus === 'loading') {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-label="Loading"
      >
        <MitraMark size="lg" state="loading" decorative />
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({
  children,
  fallback = null,
  redirectTo = '/dashboard',
  smartRedirect = false,
  redirectParam = null,
}: ProtectedRouteProps & {
  redirectTo?: string;
  /**
   * Decide the destination from the account's state (has a business? email verified?) instead of
   * using the fixed `redirectTo`. Used by /login and /signup so every entry point routes alike.
   */
  smartRedirect?: boolean;
  /** Raw `?redirect=` value; sanitised before use. Only read when `smartRedirect` is on. */
  redirectParam?: string | null;
}) {
  const router = useRouter();
  const authStatus = useAuthStatus();
  // Don't tear the page down while a sign-in is mid-flight: a brand-new Google user is
  // "authenticated" before they have accepted the Terms, and the consent card lives in `children`.
  const flowBusy = useAuthFlowBusy();
  const settled = authStatus === 'authenticated' && !flowBusy;

  useEffect(() => {
    if (!settled) return;
    if (!smartRedirect) {
      router.push(redirectTo);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [{ resolvePostAuthDestination }, { getCurrentUser }] = await Promise.all([
        import('@/features/auth/utils/postAuthRouting'),
        import('@/features/auth/services/authService'),
      ]);
      const destination = await resolvePostAuthDestination(getCurrentUser(), redirectParam);
      if (!cancelled) router.replace(destination);
    })();
    return () => {
      cancelled = true;
    };
  }, [settled, router, redirectTo, smartRedirect, redirectParam]);

  // While a smart redirect resolves (one Firestore read) keep the spinner up, not a blank page.
  if (authStatus === 'loading' || (settled && smartRedirect)) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-label="Loading"
      >
        <MitraMark size="lg" state="loading" decorative />
      </div>
    );
  }

  if (settled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
