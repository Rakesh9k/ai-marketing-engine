/**
 * Which onboarding a new owner gets. The conversational onboarding (/onboarding/v2) is complete
 * end to end, but stays OFF until it is deliberately switched on, because it has launch gates that
 * are not code: a real Google sign-in/consent check, and a real Gemini call (see
 * docs/ONBOARDING_DRAFT_MODEL.md). Off = everyone keeps getting the original wizard at /onboarding.
 *
 * NEXT_PUBLIC_ variables are inlined at build time, so flipping this needs a rebuild/redeploy.
 */
export const ONBOARDING_LEGACY_PATH = '/onboarding';
export const ONBOARDING_CONVERSATIONAL_PATH = '/onboarding/v2';

export function isConversationalOnboardingEnabled(): boolean {
  return process.env['NEXT_PUBLIC_ONBOARDING_V2'] === 'true';
}

/** Where a new owner who still needs to set up a business should go. */
export function onboardingPath(): string {
  return isConversationalOnboardingEnabled()
    ? ONBOARDING_CONVERSATIONAL_PATH
    : ONBOARDING_LEGACY_PATH;
}
