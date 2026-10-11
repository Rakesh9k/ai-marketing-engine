import { normalizePhone } from '@/features/onboarding/engine/phone';

/**
 * Browser copy of functions/src/services/customerPhone.ts (the server is authoritative and re-checks).
 * It lets the customer see a problem at the field instead of after pressing Pay.
 * tests/customerPhoneParity.test.ts fails if the two ever disagree.
 *
 * Returns the 10 national digits of a real Indian mobile number, or null. Never substitutes anything.
 */
export function cashfreeCustomerPhone(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const e164 = normalizePhone(raw);
  if (!e164 || !e164.startsWith('+91')) return null;
  const national = e164.slice(3);
  if (!/^[6-9][0-9]{9}$/.test(national)) return null;
  return isObviouslyFake(national) ? null : national;
}

export function isObviouslyFake(national: string): boolean {
  if (/^(\d)\1+$/.test(national)) return true;
  const d = [...national].map(Number);
  const steps = d.slice(1).map((n, i) => (n - d[i]! + 10) % 10);
  return steps.every((s) => s === 1) || steps.every((s) => s === 9);
}

export const PHONE_HELP =
  'Enter a valid 10-digit Indian mobile number (for example 9XXXXXXXXX). It is required to take the payment.';

/** The error codes createCashfreeCheckout puts in `details.code` when the number is the problem. */
export function phoneProblemCode(error: unknown): 'PHONE_REQUIRED' | 'INVALID_PHONE' | null {
  const code = (error as { details?: { code?: unknown } } | null)?.details?.code;
  return code === 'PHONE_REQUIRED' || code === 'INVALID_PHONE' ? code : null;
}
