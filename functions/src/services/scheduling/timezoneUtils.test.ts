import { isValidIANATimezone, validateScheduledTime } from './timezoneUtils';

describe('timezoneUtils', () => {
  describe('isValidIANATimezone', () => {
    it('returns true for valid IANA timezones', () => {
      expect(isValidIANATimezone('Asia/Kolkata')).toBe(true);
      expect(isValidIANATimezone('America/New_York')).toBe(true);
      expect(isValidIANATimezone('Europe/London')).toBe(true);
      expect(isValidIANATimezone('UTC')).toBe(true);
    });

    it('returns false for invalid timezones', () => {
      expect(isValidIANATimezone('Invalid/Zone')).toBe(false);
      expect(isValidIANATimezone('GMT+5:30')).toBe(false);
      expect(isValidIANATimezone('')).toBe(false);
    });
  });

  describe('validateScheduledTime', () => {
    it('validates future date with valid timezone', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const result = validateScheduledTime(futureDate, 'Asia/Kolkata');
      expect(result.valid).toBe(true);
      expect(result.utcIso).toBe(futureDate);
    });

    it('rejects invalid timezone', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const result = validateScheduledTime(futureDate, 'Invalid/Zone');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid or unrecognized IANA timezone');
    });

    it('rejects past scheduled date', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const result = validateScheduledTime(pastDate, 'Asia/Kolkata');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be in the future');
    });

    it('allows date within clock tolerance window', () => {
      const slightlyPastDate = new Date(Date.now() - 10000).toISOString();
      const result = validateScheduledTime(slightlyPastDate, 'Asia/Kolkata', 60000);
      expect(result.valid).toBe(true);
    });
  });
});
