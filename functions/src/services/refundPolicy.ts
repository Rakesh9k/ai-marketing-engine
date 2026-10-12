/**
 * BASELINE refund / dispute rules (approved as an engineering baseline 2026-10-12; the customer-facing policy still
 * needs legal review). Pure functions, no I/O.
 *
 *  - Payment failed: nothing is granted (handled by the payment webhook).
 *  - Refund REQUESTED by the customer: recorded only; no automatic decision.
 *  - Refund SUCCEEDED (Cashfree says so): the matching adjustment is applied exactly once, and only for a FULL refund
 *      * credit pack:   the credits from that pack that are still UNSPENT are removed. Credits already used for
 *                       generated campaigns are never clawed back.
 *      * subscription:  the days that order bought are taken off the paid-through date; if nothing is left, access
 *                       ends now and the account falls to Free.
 *    A PARTIAL refund changes nothing automatically; it is flagged for a person.
 *  - DISPUTE / chargeback: the account is flagged for review. No credits or access are changed or deleted.
 *  - Payment succeeded but could not be applied: stays flagged for manual review until refunded or resolved.
 */
import { TERM_DAYS, type BillingCycle } from './prepaidTerm';

const MONEY_EPSILON = 0.005;

/** True when the refunds so far cover the whole order. */
export function isFullRefund(orderAmount: number, refundedTotal: number): boolean {
  return orderAmount > 0 && refundedTotal + MONEY_EPSILON >= orderAmount;
}

/** Unspent credits that may be removed for a refunded credit pack: never more than the pack, never spent credits. */
export function creditsToRevoke(packCredits: number, allowance: number, used: number): number {
  const unspent = Math.max(0, allowance - used);
  return Math.max(0, Math.min(packCredits, unspent));
}

/** The paid-through date after taking one refunded order's days off. `ended` means no paid time is left. */
export function shortenedTermEnd(
  currentEndIso: string | undefined,
  cycle: BillingCycle,
  now: Date
): { endIso: string; ended: boolean } {
  const termDays = TERM_DAYS[cycle];
  const end = currentEndIso ? new Date(currentEndIso).getTime() : now.getTime();
  const newEnd = end - termDays * 86_400_000;
  if (!Number.isFinite(newEnd) || newEnd <= now.getTime()) {
    return { endIso: now.toISOString(), ended: true };
  }
  return { endIso: new Date(newEnd).toISOString(), ended: false };
}

/** Only these statuses mean Cashfree actually returned the money. Anything else is recorded but never acted on. */
export const isRefundSucceeded = (status: string | undefined): boolean => status === 'SUCCESS';

/** A dispute that is still open (not yet won/lost/accepted). */
export function isDisputeOpen(status: string | undefined): boolean {
  if (!status) return true;
  return !/_(MERCHANT_WON|MERCHANT_LOST|MERCHANT_ACCEPTED|INSUFFICIENT_EVIDENCE)$/.test(status);
}

export const isDisputeLost = (status: string | undefined): boolean =>
  !!status && /_(MERCHANT_LOST|MERCHANT_ACCEPTED|INSUFFICIENT_EVIDENCE)$/.test(status);
