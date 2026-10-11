import type { User } from 'firebase/auth';
import { businessService } from '@/services/database';
import { onboardingPath } from '@/lib/config/onboarding';

/**
 * One decision for "where does this signed-in person go?", shared by login, signup, the landing
 * page and the onboarding gate. Before this, each entry point hard-coded its own destination
 * (/dashboard, /onboarding, ?redirect=) and two of them raced each other on login.
 *
 * States:
 *   - has a usable business            -> the requested page, else /dashboard (never interrupted)
 *   - no business, password email not verified -> /verify-email
 *   - no business                      -> /onboarding
 *
 * Verification is only demanded of password accounts that have no business yet. Existing users who
 * already have a business are never locked out of their dashboard by this rule.
 */

export const VERIFY_EMAIL_PATH = '/verify-email';
export const ONBOARDING_PATH = '/onboarding';
export const DASHBOARD_PATH = '/dashboard';

/** Pages a post-auth redirect must never target (would loop or be pointless). */
const AUTH_PAGES = ['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password'];

/**
 * Accepts only same-origin, absolute-path redirects. `?redirect=` previously flowed straight into
 * `window.location.href`, so `?redirect=https://evil.example` (or `//evil.example`) was an open
 * redirect after login.
 */
export function sanitizeRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//') || value.startsWith('/\\')) return null;
  // Control characters / backslashes can be normalised by browsers into a different host.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\\]/.test(value)) return null;
  const path = value.split(/[?#]/)[0] ?? '';
  if (AUTH_PAGES.some((p) => path === p || path.startsWith(`${p}/`))) return null;
  return value;
}

type VerifiableUser = Pick<User, 'emailVerified' | 'providerData'>;

/** True for password accounts whose email is still unverified. Google etc. assert the email. */
export function requiresEmailVerification(user: VerifiableUser | null | undefined): boolean {
  if (!user) return false;
  if (user.emailVerified) return false;
  return user.providerData.some((p) => p.providerId === 'password');
}

export interface PostAuthFacts {
  /** null = the lookup failed, so we genuinely don't know. */
  hasBusiness: boolean | null;
  needsEmailVerification: boolean;
  redirect?: string | null;
  /** Send new owners to the conversational onboarding instead of the original wizard. */
  conversational?: boolean;
}

export function decidePostAuthDestination(facts: PostAuthFacts): string {
  const requested = sanitizeRedirect(facts.redirect) ?? DASHBOARD_PATH;

  if (facts.hasBusiness === true) return requested;
  // Unknown (lookup failed): never lock out or re-onboard someone who may already have a business.
  // The dashboard shows a "create business" prompt if they truly have none, and /onboarding
  // re-checks everything through its own gate.
  if (facts.hasBusiness === null) return requested;
  if (facts.needsEmailVerification) return VERIFY_EMAIL_PATH;
  return facts.conversational ? '/onboarding/v2' : ONBOARDING_PATH;
}

export async function resolvePostAuthDestination(
  user: User | null,
  redirect?: string | null
): Promise<string> {
  let hasBusiness: boolean | null;
  try {
    const businesses = user ? await businessService.getByUserId(user.uid) : [];
    hasBusiness = businesses.some((b) => b.status !== 'archived' && !!b.category);
  } catch (error) {
    console.error('Post-auth business lookup failed', error);
    hasBusiness = null;
  }

  return decidePostAuthDestination({
    hasBusiness,
    needsEmailVerification: requiresEmailVerification(user),
    redirect,
    conversational: onboardingPath() !== ONBOARDING_PATH,
  });
}
