/**
 * Server-authoritative phone normalisation for onboarding. The browser has a mirror
 * (src/features/onboarding/engine/phone.ts) so the owner sees a problem at the question rather than at
 * the end; tests/onboardingPhoneParity.test.ts fails if the two ever disagree.
 *
 * Output is a canonical `+<country code><number>` string (E.164), which is also exactly what a
 * wa.me link needs. Mitra is built for the Indian market, so a number typed without a country code
 * is read as Indian only when it is unmistakably an Indian mobile (10 digits starting 6-9, with an
 * optional leading 0 or 91). Anything else without a `+` is rejected rather than guessed: guessing
 * the wrong country would put a customer on the wrong person's WhatsApp.
 */

const INDIAN_MOBILE = /^[6-9][0-9]{9}$/;

/**
 * People often write the national trunk "0" after the country code ("+91 040 2345 6789"), which is
 * not a valid international number. For India (+91) it is dropped; other countries are taken as given.
 */
function withoutIndianTrunkZero(digits: string): string | null {
  const cleaned = digits.startsWith('910') ? `91${digits.slice(3)}` : digits;
  return cleaned.length >= 8 && cleaned.length <= 15 && cleaned[0] !== '0' ? `+${cleaned}` : null;
}

export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  // Only digits, spaces, dashes, dots, parentheses, and an optional leading + are allowed.
  if (!/^\+?[0-9\s().-]+$/.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 0) return null;

  if (trimmed.startsWith('+')) {
    return withoutIndianTrunkZero(digits);
  }

  // "00" is the international call prefix: 0091 98765 43210 == +91 98765 43210.
  if (digits.startsWith('00')) {
    const rest = digits.slice(2);
    return rest.length >= 8 && rest.length <= 15 && rest[0] !== '0' ? `+${rest}` : null;
  }

  if (INDIAN_MOBILE.test(digits)) return `+91${digits}`;
  if (digits.length === 11 && digits[0] === '0' && INDIAN_MOBILE.test(digits.slice(1))) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91') && INDIAN_MOBILE.test(digits.slice(2))) {
    return `+${digits}`;
  }
  return null;
}

export const isValidPhone = (raw: string): boolean => normalizePhone(raw) !== null;
