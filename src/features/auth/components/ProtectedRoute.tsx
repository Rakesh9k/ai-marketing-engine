'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStatus } from '@/features/auth/hooks/useAuth';
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

export function PublicOnlyRoute({ children, fallback = null }: ProtectedRouteProps) {
  const router = useRouter();
  const authStatus = useAuthStatus();

  useEffect(() => {
    if (authStatus === 'authenticated') {
      router.push('/dashboard');
    }
  }, [authStatus, router]);

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

  if (authStatus === 'authenticated') {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
