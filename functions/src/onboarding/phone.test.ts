import { isValidPhone, normalizePhone } from './phone';

describe('normalizePhone', () => {
  it.each([
    // An unmistakable Indian mobile, in the ways people actually type it.
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['98765-43210', '+919876543210'],
    ['09876543210', '+919876543210'],
    ['0 98765 43210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['+91-98765-43210', '+919876543210'],
    // The national trunk "0" after the country code is dropped for India, as people do write it.
    ['+91 040 2345 6789', '+914023456789'],
    ['+91 0 98765 43210', '+919876543210'],
    ['(+91) 98765 43210', null], // parentheses around the plus are ambiguous: rejected, not guessed
    ['0091 98765 43210', '+919876543210'],
    ['  +91 98765 43210  ', '+919876543210'],
    // Any number with an explicit country code is accepted as given.
    ['+44 7700 900123', '+447700900123'],
    ['+1 (415) 555-0132', '+14155550132'],
    ['00 44 7700 900123', '+447700900123'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    'call me',
    '12345',
    '98765', // too short
    '5876543210', // 10 digits but not an Indian mobile, and no country code: not guessed
    '1234567890',
    '040 2345 6789', // an STD landline written without a country code: not guessed
    '+91 98765 43210 99999999', // too long for any phone number
    '+0 98765 43210', // country codes never start with 0
    '+',
    '9876543210x12',
    '<script>',
    '98765 43210; DROP TABLE',
  ])('rejects %p', (input) => {
    expect(normalizePhone(input)).toBeNull();
    expect(isValidPhone(input)).toBe(false);
  });

  it('is idempotent: a normalised number normalises to itself', () => {
    for (const raw of ['98765 43210', '+44 7700 900123', '0091 98765 43210']) {
      const once = normalizePhone(raw)!;
      expect(normalizePhone(once)).toBe(once);
    }
  });

  it('produces exactly what a wa.me link needs: digits with a country code and a leading +', () => {
    expect(normalizePhone('98765 43210')).toMatch(/^\+[1-9][0-9]{7,14}$/);
  });
});
