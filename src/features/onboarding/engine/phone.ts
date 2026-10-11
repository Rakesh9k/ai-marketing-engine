/**
 * Browser mirror of functions/src/onboarding/phone.ts, so a bad number is caught at the question
 * and not when the owner presses "confirm". The server version is authoritative;
 * tests/onboardingPhoneParity.test.ts fails if the two ever disagree.
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
  if (!/^\+?[0-9\s().-]+$/.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 0) return null;

  if (trimmed.startsWith('+')) {
    return withoutIndianTrunkZero(digits);
  }

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

/** "+919876543210" -> "+91 98765 43210" (Indian mobiles); other numbers are shown as normalised. */
export function formatPhoneForDisplay(e164: string): string {
  const m = /^\+91([6-9][0-9]{4})([0-9]{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}
