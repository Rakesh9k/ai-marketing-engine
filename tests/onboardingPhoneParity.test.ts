/**
 * The server (authoritative) and the browser (to show errors at the question) each carry a copy of
 * the phone normaliser. They must never disagree: if the browser accepted a number the server
 * rejects, the owner would only find out when they press "confirm".
 */
import { normalizePhone as server } from '../functions/src/onboarding/phone';
import {
  formatPhoneForDisplay,
  normalizePhone as browser,
} from '@/features/onboarding/engine/phone';

const INPUTS = [
  '9876543210',
  '98765 43210',
  '98765-43210',
  '09876543210',
  '919876543210',
  '+91 98765 43210',
  '+91 040 2345 6789',
  '+91 0 98765 43210',
  '0091 98765 43210',
  '+44 7700 900123',
  '+1 (415) 555-0132',
  '00 44 7700 900123',
  '',
  '   ',
  'call me',
  '12345',
  '5876543210',
  '1234567890',
  '040 2345 6789',
  '+91 98765 43210 99999999',
  '+0 98765 43210',
  '+',
  '<script>',
  '(+91) 98765 43210',
  '98765 43210; DROP TABLE',
];

describe('phone normalisation parity (server <-> browser)', () => {
  it.each(INPUTS)('agrees on %p', (input) => {
    expect(browser(input)).toBe(server(input));
  });
});

describe('formatPhoneForDisplay', () => {
  it('groups Indian mobiles and leaves other numbers as normalised', () => {
    expect(formatPhoneForDisplay('+919876543210')).toBe('+91 98765 43210');
    expect(formatPhoneForDisplay('+447700900123')).toBe('+447700900123');
  });
});
