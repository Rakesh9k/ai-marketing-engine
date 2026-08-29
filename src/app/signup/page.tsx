'use client';

import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { SignupForm } from '@/features/auth/components/SignupForm';
import { PublicOnlyRoute } from '@/features/auth/components/ProtectedRoute';

export default function SignupPage() {
  return (
    <PublicOnlyRoute>
      <AuthLayout
        title="Create your account"
        description="Start building campaigns for your business"
      >
        <SignupForm />
      </AuthLayout>
    </PublicOnlyRoute>
  );
}
