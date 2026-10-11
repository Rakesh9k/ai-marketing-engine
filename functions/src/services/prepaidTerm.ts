/**
 * Fixed-term PREPAID access (Cashfree launch model, decided 2026-10-11). Pure functions, no I/O.
 *
 *  - Monthly = 30 days of access, Yearly = 365 days, counted from payment confirmation.
 *  - Plans NEVER renew or charge automatically. When the term ends the user is on Free; they choose to buy again.
 *  - RENEWING the same plan + cycle while the term is still live EXTENDS access from the current end date (the days
 *    already paid for are not lost). The grant is applied once per order (the webhook's grant ledger).
 *  - A DIFFERENT plan or cycle while a term is live is refused (no proration / in-place switching); buy it after the
 *    current term ends.
 *  - After the end date nothing in the subscription entitles the user, whether or not any scheduler has run yet.
 *  - Refunds and disputes never change access automatically; they are recorded for manual review.
 */
export type BillingCycle = 'monthly' | 'yearly';

export const TERM_DAYS: Record<BillingCycle, number> = { monthly: 30, yearly: 365 };
const DAY_MS = 86_400_000;

export interface TermSubscription {
  planId?: string;
  billingCycle?: string;
  provider?: string;
  status?: string;
  currentPeriodEnd?: string;
}

const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due']);

/** True while the paid-through date is in the future and the status entitles. */
export function isTermLive(sub: TermSubscription | undefined | null, now = new Date()): boolean {
  if (!sub) return false;
  if (!sub.status || !ENTITLED_STATUSES.has(sub.status)) return false;
  if (!sub.currentPeriodEnd) return true; // legacy record with no end date: provider-managed, still entitled
  return new Date(sub.currentPeriodEnd).getTime() > now.getTime();
}

export type PurchaseDecision =
  | { allowed: true; kind: 'new' | 'renewal'; newEnd: string; termDays: number }
  | {
      allowed: false;
      reason: 'different_plan_or_cycle_live' | 'other_provider_live';
      liveEnd?: string;
    };

/** What a purchase of `planId`/`cycle` does given the user's current subscription. */
export function decidePurchase(
  current: TermSubscription | undefined | null,
  planId: string,
  cycle: BillingCycle,
  now = new Date(),
  provider = 'cashfree'
): PurchaseDecision {
  const termDays = TERM_DAYS[cycle];
  if (isTermLive(current, now)) {
    // A live term bought through ANOTHER provider can never be extended here, whatever the plan.
    if (current!.provider && current!.provider !== provider) {
      return {
        allowed: false,
        reason: 'other_provider_live',
        ...(current!.currentPeriodEnd ? { liveEnd: current!.currentPeriodEnd } : {}),
      };
    }
    const sameTerm = current!.planId === planId && (current!.billingCycle ?? 'monthly') === cycle;
    if (!sameTerm) {
      return {
        allowed: false,
        reason: 'different_plan_or_cycle_live',
        ...(current!.currentPeriodEnd ? { liveEnd: current!.currentPeriodEnd } : {}),
      };
    }
    const base = current!.currentPeriodEnd
      ? Math.max(new Date(current!.currentPeriodEnd).getTime(), now.getTime())
      : now.getTime();
    return {
      allowed: true,
      kind: 'renewal',
      newEnd: new Date(base + termDays * DAY_MS).toISOString(),
      termDays,
    };
  }
  return {
    allowed: true,
    kind: 'new',
    newEnd: new Date(now.getTime() + termDays * DAY_MS).toISOString(),
    termDays,
  };
}

export const renewalRuleText =
  'Access lasts for the term you pay for (30 days monthly, 365 days yearly) and does not renew automatically. ' +
  'Renewing the same plan before it ends adds the new term after your current end date.';
