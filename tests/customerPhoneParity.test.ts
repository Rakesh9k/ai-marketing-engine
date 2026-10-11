/**
 * The server (authoritative) and the browser (to show errors at the field) each carry the Cashfree customer-phone
 * rule. They must never disagree: a number the browser accepts but the server rejects would fail after Pay.
 */
import { cashfreeCustomerPhone as server } from '../functions/src/services/customerPhone';
import { cashfreeCustomerPhone as browser, phoneProblemCode } from '@/lib/validation/customerPhone';

const INPUTS = [
  '9812345670',
  '+91 98123 45670',
  '+919812345670',
  '919812345670',
  '09812345670',
  '0091 98123-45670',
  '(98123) 45670',
  ' 6000012345 ',
  '',
  '   ',
  '12345',
  '98123456',
  '981234567012',
  '5812345670',
  'abcdefghij',
  '98123 4567x',
  '+44 7911 123456',
  '+1 415 555 2671',
  '+91 1234567890',
  '9999999999',
  '8888888888',
  '9876543210',
  '6789012345',
  '7654321098',
  '9876501234',
  '+91 98765 43210',
];

describe('customer phone: browser and server agree', () => {
  it.each(INPUTS)('%p', (input) => {
    expect(browser(input)).toBe(server(input));
  });
  it('null/undefined', () => {
    expect(browser(null)).toBeNull();
    expect(browser(undefined)).toBeNull();
  });
});

describe('phoneProblemCode', () => {
  it('reads the server error codes only', () => {
    expect(phoneProblemCode({ details: { code: 'PHONE_REQUIRED' } })).toBe('PHONE_REQUIRED');
    expect(phoneProblemCode({ details: { code: 'INVALID_PHONE' } })).toBe('INVALID_PHONE');
    expect(phoneProblemCode({ details: { code: 'OTHER' } })).toBeNull();
    expect(phoneProblemCode(new Error('x'))).toBeNull();
    expect(phoneProblemCode(null)).toBeNull();
  });
});
