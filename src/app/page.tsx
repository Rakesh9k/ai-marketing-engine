'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStatus } from '@/features/auth/hooks/useAuth';
import { LandingPage } from '@/features/landing/LandingPage';

/**
 * Phase 17: previously this route did nothing but redirect — authenticated
 * users to /dashboard, unauthenticated users straight to /login — so there
 * was no actual public landing page anywhere in the app.
 *
 * The existing authenticated -> /dashboard redirect (previously handled by
 * this same effect, and identical to what PublicOnlyRoute does for
 * /login and /signup) is preserved unchanged. Deliberately NOT reusing
 * PublicOnlyRoute's spinner-gated render here, though: that component
 * blocks all children behind a full-screen spinner until Firebase Auth's
 * client SDK resolves — appropriate for an auth form with nothing
 * meaningful to show first, wrong for a public marketing page whose whole
 * job is to communicate the value proposition within the first few
 * seconds. The landing page now renders immediately; an authenticated
 * visitor is redirected to /dashboard in the background once auth status
 * resolves, rather than staring at a blank spinner first.
 */
export default function Home() {
  const router = useRouter();
  const authStatus = useAuthStatus();

  useEffect(() => {
    if (authStatus === 'authenticated') {
      router.push('/dashboard');
    }
  }, [authStatus, router]);

  return <LandingPage />;
}
