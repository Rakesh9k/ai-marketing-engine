'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStatus } from '@/features/auth/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const authStatus = useAuthStatus();

  useEffect(() => {
    if (authStatus === 'authenticated') {
      router.push('/dashboard');
    } else if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <div
        className="border-brand-600 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
