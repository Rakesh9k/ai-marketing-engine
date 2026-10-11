'use client';

import type { ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';

// Onboarding needs a signed-in user (it previously rendered the whole wizard for anonymous
// visitors, who then failed at submit) and, for password accounts, a verified email.
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      {/* reducedMotion="user": transform animations are switched off for visitors who ask for it. */}
      <MotionConfig reducedMotion="user">
        <OnboardingGate>{children}</OnboardingGate>
      </MotionConfig>
    </ProtectedRoute>
  );
}
