'use client';

import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';
import { PublicOnlyRoute } from '@/features/auth/components/ProtectedRoute';

export default function ForgotPasswordPage() {
  return (
    <PublicOnlyRoute>
      <AuthLayout
        title="Forgot your password?"
        description="Enter your email and we'll send you a reset link"
      >
        <ForgotPasswordForm />
      </AuthLayout>
    </PublicOnlyRoute>
  );
}
