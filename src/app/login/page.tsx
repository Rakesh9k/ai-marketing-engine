'use client';

import { Suspense } from 'react';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { PublicOnlyRoute } from '@/features/auth/components/ProtectedRoute';

function LoginPageContent() {
  const { useSearchParams } = require('next/navigation');
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  return (
    <PublicOnlyRoute>
      <AuthLayout title="Welcome back" description="Sign in to continue to your dashboard">
        <LoginForm onSuccess={() => (window.location.href = redirect)} />
      </AuthLayout>
    </PublicOnlyRoute>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
