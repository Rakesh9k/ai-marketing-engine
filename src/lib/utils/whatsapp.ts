/**
 * WhatsApp share-link construction, kept separate from
 * functions/src/services/ai/truthCheck.ts's normalizePhone: that helper
 * strips a phone number to its last 10 digits for fact-comparison purposes
 * (Truth Check just needs to know two numbers refer to the same phone) and
 * deliberately drops any country code — it would produce "9876543210" for
 * wa.me, which is not a valid WhatsApp destination. wa.me requires the
 * full international-format digit string (country code + number, no
 * leading "+" or punctuation), so this is a distinct concern with its own
 * normalization rules, not a duplicate of that utility.
 */

/**
 * Normalizes a business phone/WhatsApp number to the digit-only,
 * country-code-prefixed format wa.me requires (e.g. "919876543210").
 * Only handles Indian numbers with reasonably unambiguous input, since
 * that's the only market this product currently serves (see
 * Localization.country in campaign data). Returns null when the number
 * can't be normalized with confidence, so callers can fail gracefully
 * instead of silently guessing at a wrong destination.
 */
export function normalizeWhatsAppNumber(rawPhone: string | undefined | null): string | null {
  if (!rawPhone) return null;

  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return null;

  // Bare 10-digit Indian mobile number, e.g. "98765 43210" -> "919876543210"
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // Domestic trunk-prefixed, e.g. "098765 43210" -> "919876543210"
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }

  // Already has the country code, e.g. "+91 98765 43210" -> "919876543210"
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  // Anything else (wrong length, unrecognized prefix) can't be normalized
  // with confidence — better to say WhatsApp is unavailable than guess.
  return null;
}

/**
 * Builds a safe https://wa.me/<number>?text=<message> URL from an
 * authoritative business phone number and the campaign's actual WhatsApp
 * message text. Returns null if the number can't be normalized or the
 * message is empty, so the caller can show a clear "unavailable" state
 * instead of opening a broken or numberless wa.me link.
 */
export function buildWhatsAppShareUrl(
  rawPhone: string | undefined | null,
  message: string | undefined | null
): string | null {
  if (!message || !message.trim()) return null;

  const normalized = normalizeWhatsAppNumber(rawPhone);
  if (!normalized) return null;

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
