'use client';

import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';
import { PublicOnlyRoute } from '@/features/auth/components/ProtectedRoute';

export default function ForgotPasswordPage() {
  return (
    <PublicOnlyRoute>
      <AuthLayout
        mode="forgot-password"
        topRightLink={{ text: 'Remember your password?', href: '/login', label: 'Log in' }}
      >
        <ForgotPasswordForm />
      </AuthLayout>
    </PublicOnlyRoute>
  );
}
