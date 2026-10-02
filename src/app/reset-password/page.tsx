'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';
import { PublicOnlyRoute } from '@/features/auth/components/ProtectedRoute';
import { MitraMark } from '@/components/ui/MitraMark';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  return (
    <PublicOnlyRoute>
      <AuthLayout
        mode="reset-password"
        topRightLink={{ text: 'Remember your password?', href: '/login', label: 'Log in' }}
      >
        <ResetPasswordForm oobCode={oobCode} />
      </AuthLayout>
    </PublicOnlyRoute>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}
