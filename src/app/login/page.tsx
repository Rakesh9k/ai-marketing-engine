'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { PublicOnlyRoute } from '@/features/auth/components/ProtectedRoute';
import { MitraMark } from '@/components/ui/MitraMark';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  return (
    <PublicOnlyRoute>
      <AuthLayout
        mode="login"
        title="Welcome Back"
        subtitle="Sign in to your Mitra account"
      >
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
          className="flex min-h-screen items-center justify-center bg-[#FDFBF8]"
          role="status"
          aria-label="Loading"
        >
          <MitraMark size="lg" state="loading" decorative />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
