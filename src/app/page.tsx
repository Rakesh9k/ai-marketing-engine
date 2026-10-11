'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStatus } from '@/features/auth/hooks/useAuth';
import { useAuthFlowBusy } from '@/features/auth/authFlowState';
import { LandingPage } from '@/features/landing/LandingPage';

/**
 * Public landing page. It renders immediately (no spinner gate — its whole job is to communicate
 * the value proposition within the first seconds); a signed-in visitor is moved on in the
 * background once auth resolves.
 *
 * Where they go is decided by resolvePostAuthDestination (business? email verified?), the same
 * rule login and signup use — not a blanket /dashboard, which dropped a brand-new account on an
 * empty dashboard instead of onboarding. We wait while a sign-in from the landing nudge is still
 * mid-flight (a new Google user must finish the Terms step first).
 */
export default function Home() {
  const router = useRouter();
  const authStatus = useAuthStatus();
  const flowBusy = useAuthFlowBusy();

  useEffect(() => {
    if (authStatus !== 'authenticated' || flowBusy) return;
    let cancelled = false;
    void (async () => {
      const [{ resolvePostAuthDestination }, { getCurrentUser }] = await Promise.all([
        import('@/features/auth/utils/postAuthRouting'),
        import('@/features/auth/services/authService'),
      ]);
      const destination = await resolvePostAuthDestination(getCurrentUser());
      if (!cancelled) router.push(destination);
    })();
    return () => {
      cancelled = true;
    };
  }, [authStatus, flowBusy, router]);

  return <LandingPage />;
}
