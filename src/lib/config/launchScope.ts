/**
 * Launch scope — the single source of truth for which customer-facing routes
 * are NOT part of the launch product. Consumed by src/proxy.ts (the real
 * enforcement) and unit-tested in launchScope.test.ts.
 *
 * These are UX/scope controls enforced on the server per request; they are not
 * an authorization boundary. Real authorization for backend operations lives in
 * Cloud Functions + firestore.rules/storage.rules.
 *
 * Deferred code is intentionally preserved in the repo (see docs/LAUNCH_SCOPE.md);
 * only customer access is removed. To re-enable a feature, delete its entry here
 * and restore its navigation entry points.
 */

/** Customer routes for deferred features: requests are redirected to /dashboard. */
export const DEFERRED_ROUTE_PREFIXES = [
  '/creative', // Creative / Poster / Video Studio, template explorer
  '/assistant', // AI Assistant (simulated; not part of the validated flow)
  '/analytics', // Advanced analytics
  '/calendar', // Marketing calendar
  '/publishing', // Social publishing dashboard
  '/settings/social', // Meta / Instagram / Facebook connection
  '/auth/meta', // Meta OAuth callback
  '/whatsapp', // WhatsApp Hub (generic templates; WhatsApp share lives on the campaign page)
  '/content', // "Instant Content" (was backed by canned template text, not AI)
  '/notifications', // sample data only
  '/dashboard/activity', // sample data only
  '/create', // creation menu that advertised Poster Studio; /campaigns/new is the entry point
] as const;

/** Internal routes: never served to the public in production (404). */
export const INTERNAL_ROUTE_PREFIXES = ['/admin', '/dev'] as const;

/** Next.js API routes that are not part of launch (404). */
export const DEFERRED_API_PREFIXES = ['/api/generate-content'] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export type LaunchScopeDecision = 'allow' | 'redirect-dashboard' | 'not-found';

export function decideLaunchScope(pathname: string, isProduction: boolean): LaunchScopeDecision {
  if (DEFERRED_API_PREFIXES.some((p) => matchesPrefix(pathname, p))) return 'not-found';
  if (isProduction && INTERNAL_ROUTE_PREFIXES.some((p) => matchesPrefix(pathname, p))) {
    return 'not-found';
  }
  if (DEFERRED_ROUTE_PREFIXES.some((p) => matchesPrefix(pathname, p))) {
    return 'redirect-dashboard';
  }
  return 'allow';
}
