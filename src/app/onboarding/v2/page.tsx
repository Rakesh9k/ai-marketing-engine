'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { ConversationShell } from '@/features/onboarding/components/ConversationShell';

/**
 * The conversational onboarding (Business Understanding Engine): adaptive questions -> Business
 * Brain review -> explicit confirmation -> confirmOnboardingBusiness. It is complete end to end but
 * stays behind NEXT_PUBLIC_ONBOARDING_V2 (see lib/config/onboarding.ts): while the flag is off,
 * OnboardingGate sends this route to the original /onboarding wizard. It sits under the same
 * /onboarding layout, so sign-in and email verification are already enforced.
 */
export default function ConversationalOnboardingPage() {
  const { user } = useAuth();
  return <ConversationShell uid={user?.uid ?? null} />;
}
