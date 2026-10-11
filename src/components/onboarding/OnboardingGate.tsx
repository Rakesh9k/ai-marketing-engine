'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  isConversationalOnboardingEnabled,
  ONBOARDING_CONVERSATIONAL_PATH,
  ONBOARDING_LEGACY_PATH,
} from '@/lib/config/onboarding';
import { getCurrentUser } from '@/features/auth/services/authService';
import {
  resolvePostAuthDestination,
  VERIFY_EMAIL_PATH,
} from '@/features/auth/utils/postAuthRouting';
import { MitraMark } from '@/components/ui/MitraMark';

/**
 * Sits inside ProtectedRoute for /onboarding. Password sign-ups must verify their email before
 * setting up a business; Google users pass straight through. This is the UX half of the rule —
 * createBusiness enforces it server-side, so skipping this screen buys nothing.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void resolvePostAuthDestination(getCurrentUser()).then((destination) => {
      if (cancelled) return;
      if (destination === VERIFY_EMAIL_PATH) {
        router.replace(VERIFY_EMAIL_PATH);
      } else if (isConversationalOnboardingEnabled() && pathname === ONBOARDING_LEGACY_PATH) {
        // Every link to the original wizard (dashboard "Create Business", help, etc.) lands in the
        // conversational onboarding once it is switched on.
        router.replace(ONBOARDING_CONVERSATIONAL_PATH);
      } else if (
        !isConversationalOnboardingEnabled() &&
        pathname === ONBOARDING_CONVERSATIONAL_PATH
      ) {
        // The flag is the single switch. While it is off the conversation must not be reachable by
        // typing its URL either: it is not part of the controlled rollout until it is switched on.
        router.replace(ONBOARDING_LEGACY_PATH);
      } else {
        setAllowed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (!allowed) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-label="Loading"
      >
        <MitraMark size="lg" state="loading" decorative />
      </div>
    );
  }

  return <>{children}</>;
}
