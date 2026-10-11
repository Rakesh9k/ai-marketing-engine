'use client';

import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { SignupForm } from '@/features/auth/components/SignupForm';
import { PublicOnlyRoute } from '@/features/auth/components/ProtectedRoute';

// A brand-new account goes to email verification (password users) and then onboarding; someone
// who already has a business goes to the dashboard. PublicOnlyRoute decides, not this page.
export default function SignupPage() {
  return (
    <PublicOnlyRoute smartRedirect>
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
