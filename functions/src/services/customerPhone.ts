import { normalizePhone } from '../onboarding/phone';

/**
 * The customer mobile number sent to Cashfree when an order is created.
 *
 * Cashfree's Create Order API (version 2023-08-01) marks `customer_details.customer_phone` REQUIRED and exactly
 * 10 characters (docs read 2026-10-11). The old code filled a missing/short number with 9999999999, which put a
 * fabricated phone number on real payment records. The rule now is:
 *
 *  - a REAL Indian mobile number is required (10 digits starting 6-9; +91 / 91 / 0 prefixes are accepted and
 *    removed, because Cashfree wants the 10 national digits only);
 *  - nothing is ever substituted: not a dummy, not a developer's number, not another customer's number;
 *  - an obviously fake number (one repeated digit, or a straight ascending / descending run such as 9876543210)
 *    is rejected as if it were missing.
 *
 * Returns the 10 national digits, or null when there is no usable number.
 */
export function cashfreeCustomerPhone(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const e164 = normalizePhone(raw);
  if (!e164 || !e164.startsWith('+91')) return null;
  const national = e164.slice(3);
  if (!/^[6-9][0-9]{9}$/.test(national)) return null;
  return isObviouslyFake(national) ? null : national;
}

/** One repeated digit (9999999999) or a straight run up or down by 1 (9876543210, 6789012345). */
export function isObviouslyFake(national: string): boolean {
  if (/^(\d)\1+$/.test(national)) return true;
  const d = [...national].map(Number);
  const steps = d.slice(1).map((n, i) => (n - d[i]! + 10) % 10);
  return steps.every((s) => s === 1) || steps.every((s) => s === 9);
}

export const PHONE_HELP =
  'Enter a valid 10-digit Indian mobile number (for example 9XXXXXXXXX). It is required to take the payment.';
