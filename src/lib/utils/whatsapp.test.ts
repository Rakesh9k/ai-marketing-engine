import { normalizeWhatsAppNumber, buildWhatsAppShareUrl } from './whatsapp';

describe('normalizeWhatsAppNumber', () => {
  it('normalizes a formatted Indian number with spaces and a leading + to wa.me digit format', () => {
    expect(normalizeWhatsAppNumber('+91 98765 43210')).toBe('919876543210');
  });

  it('prepends the country code to a bare 10-digit Indian mobile number', () => {
    expect(normalizeWhatsAppNumber('9876543210')).toBe('919876543210');
  });

  it('strips a domestic trunk-prefix 0 and prepends the country code', () => {
    expect(normalizeWhatsAppNumber('09876543210')).toBe('919876543210');
  });

  it('accepts a number already in raw wa.me digit form', () => {
    expect(normalizeWhatsAppNumber('919876543210')).toBe('919876543210');
  });

  it('returns null for a missing number rather than guessing', () => {
    expect(normalizeWhatsAppNumber(undefined)).toBeNull();
    expect(normalizeWhatsAppNumber(null)).toBeNull();
    expect(normalizeWhatsAppNumber('')).toBeNull();
  });

  it('returns null for an unrecognizable / too-short number rather than silently altering it', () => {
    expect(normalizeWhatsAppNumber('12345')).toBeNull();
    expect(normalizeWhatsAppNumber('abcdefghij')).toBeNull();
  });
});

describe('buildWhatsAppShareUrl — golden test (Phase 9 §49)', () => {
  const BUSINESS_PHONE = '+91 98765 43210';
  const MESSAGE = 'Hi! Get 10% OFF on your next order 🎉';

  it('builds a wa.me URL with the normalized number and correctly encoded message', () => {
    const url = buildWhatsAppShareUrl(BUSINESS_PHONE, MESSAGE);
    expect(url).not.toBeNull();
    expect(url).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
  });

  it('round-trips: decoding the URL-encoded text yields back the exact original message', () => {
    const url = buildWhatsAppShareUrl(BUSINESS_PHONE, MESSAGE)!;
    // URLSearchParams.get() already percent-decodes once — this is the
    // "decoded" value a consumer of the URL would see, so it must equal
    // the original message exactly (not decodeURIComponent'd a second
    // time, which would double-decode and corrupt multi-byte sequences).
    const decoded = new URL(url).searchParams.get('text') || '';
    expect(decoded).toBe(MESSAGE);
  });

  it('correctly encodes spaces, line breaks, emoji, ₹, and mixed-language text', () => {
    const complexMessage =
      'Namaste! 🎉 Weekend biryani offer\n₹299 matrame — order cheddam, mee koసం special discount!';
    const url = buildWhatsAppShareUrl(BUSINESS_PHONE, complexMessage)!;
    expect(url).not.toContain(' ');
    expect(url).not.toContain('\n');
    const decoded = new URL(url).searchParams.get('text') || '';
    expect(decoded).toBe(complexMessage);
  });

  it('returns null (never a numberless or malformed URL) when the message is empty', () => {
    expect(buildWhatsAppShareUrl(BUSINESS_PHONE, '')).toBeNull();
    expect(buildWhatsAppShareUrl(BUSINESS_PHONE, undefined)).toBeNull();
  });

  it('returns null (never guesses at wa.me/?text=... with no destination) when the phone cannot be normalized', () => {
    expect(buildWhatsAppShareUrl('', MESSAGE)).toBeNull();
    expect(buildWhatsAppShareUrl(undefined, MESSAGE)).toBeNull();
    expect(buildWhatsAppShareUrl('123', MESSAGE)).toBeNull();
  });
});
