'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { PublicOnlyRoute } from '@/features/auth/components/ProtectedRoute';
import { MitraMark } from '@/components/ui/MitraMark';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  // Where to go after sign-in is decided once, by PublicOnlyRoute (business? email verified?
  // safe ?redirect=?), instead of the form hard-navigating to an unvalidated query value.
  return (
    <PublicOnlyRoute smartRedirect redirectParam={redirect}>
      <AuthLayout mode="login" title="Welcome Back" subtitle="Sign in to your Mitra account">
        <LoginForm />
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
