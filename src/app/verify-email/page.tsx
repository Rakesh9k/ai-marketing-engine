'use client';

import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { VerifyEmailContent } from '@/features/auth/components/VerifyEmailContent';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

export default function VerifyEmailPage() {
  return (
    <ProtectedRoute>
      <AuthLayout
        mode="verify-email"
        topRightLink={{ text: 'Need a different account?', href: '/login', label: 'Log in' }}
      >
        <VerifyEmailContent />
      </AuthLayout>
    </ProtectedRoute>
  );
}
