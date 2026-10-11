import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Onboarding requires a verified email for password sign-ups. Google (and any other federated
 * provider) asserts the email itself, so those tokens are trusted as-is; only the `password`
 * provider needs the `email_verified` claim.
 *
 * This is the real enforcement. The client gate (verify-email redirect) is a UX convenience —
 * a caller can skip the UI and invoke the callable directly, so the callable checks the ID
 * token the platform already verified. The claim only refreshes when the client forces a new
 * token (VerifyEmailContent does `getIdToken(true)` after the user confirms).
 */
export function requireVerifiedEmail(token: unknown): void {
  const t = (token ?? {}) as {
    email_verified?: boolean;
    firebase?: { sign_in_provider?: string };
  };
  const provider = t.firebase?.sign_in_provider;
  // Fail closed: an unknown/missing provider is treated like a password account.
  const federated = provider !== undefined && provider !== 'password' && provider !== 'custom';
  if (federated || t.email_verified === true) return;

  throw new HttpsError(
    'failed-precondition',
    'Please verify your email address before setting up your business.',
    { code: 'EMAIL_NOT_VERIFIED' }
  );
}
