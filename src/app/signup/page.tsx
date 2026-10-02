'use client';

import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { SignupForm } from '@/features/auth/components/SignupForm';
import { PublicOnlyRoute } from '@/features/auth/components/ProtectedRoute';

export default function SignupPage() {
  return (
    <PublicOnlyRoute>
      <AuthLayout
        mode="signup"
        title="Let's make something for your business."
        subtitle="Get started with Mitra in under a minute."
      >
        <SignupForm />
      </AuthLayout>
    </PublicOnlyRoute>
  );
}
