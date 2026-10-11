import type { BillingCycle } from '@/types';

/**
 * Display-side rules for FIXED-TERM PREPAID access (no automatic renewal). The server decides entitlement
 * (functions/src/services/prepaidTerm.ts); this only mirrors it so the page tells the truth about the paid-through
 * date. If the two ever disagree the server wins: it refuses the purchase / withholds the credits.
 */
export const TERM_DAYS: Record<BillingCycle, number> = { monthly: 30, yearly: 365 };

interface TermLike {
  status?: string;
  currentPeriodEnd?: unknown;
}

const ENTITLED = new Set(['active', 'trialing', 'past_due']);

/** The paid-through instant of a subscription record, or null when unknown. */
export function termEnd(sub: TermLike | null | undefined): Date | null {
  const raw = sub?.currentPeriodEnd;
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True while the paid-through date is in the future and the status entitles. */
export function isTermLive(sub: TermLike | null | undefined, now = new Date()): boolean {
  if (!sub?.status || !ENTITLED.has(sub.status)) return false;
  const end = termEnd(sub);
  return !end || end.getTime() > now.getTime();
}

export function formatAccessDate(date: Date | null): string {
  return date
    ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'the end of your current term';
}

export const termLabel = (cycle: BillingCycle): string =>
  cycle === 'yearly' ? '365 days' : '30 days';

/** What the customer actually pays for ONE term (the yearly price is the total for 365 days, not per month). */
export const termPriceINR = (plan: { price: number; yearlyPrice: number }, cycle: BillingCycle) =>
  cycle === 'yearly' ? plan.yearlyPrice : plan.price;

export const NO_AUTO_RENEW_NOTE = 'One-time payment. Does not renew automatically.';
