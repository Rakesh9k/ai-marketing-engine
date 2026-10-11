import { cashfreeCustomerPhone, isObviouslyFake } from './customerPhone';

describe('cashfreeCustomerPhone: only a REAL Indian mobile number, as 10 national digits', () => {
  it.each([
    ['9812345670', '9812345670'],
    ['+91 98123 45670', '9812345670'],
    ['+919812345670', '9812345670'],
    ['919812345670', '9812345670'],
    ['09812345670', '9812345670'],
    ['0091 98123-45670', '9812345670'],
    ['(98123) 45670', '9812345670'],
    ['  6000012345 ', '6000012345'],
  ])('accepts %p', (input, expected) => {
    expect(cashfreeCustomerPhone(input)).toBe(expected);
  });

  it.each([
    ['', 'empty'],
    ['   ', 'blank'],
    [undefined, 'undefined'],
    [null, 'null'],
    ['12345', 'too short'],
    ['98123456', '8 digits'],
    ['981234567012', '12 digits that are not 91 + mobile'],
    ['5812345670', 'does not start 6-9'],
    ['abcdefghij', 'letters'],
    ['98123 4567x', 'letter inside'],
    ['+44 7911 123456', 'a non-Indian number (Cashfree takes 10 national digits)'],
    ['+1 415 555 2671', 'a US number'],
    ['+91 1234567890', 'invalid Indian mobile'],
  ])('rejects %p (%s)', (input, _why) => {
    expect(cashfreeCustomerPhone(input as never)).toBeNull();
  });

  it.each(['9999999999', '8888888888', '6666666666', '9876543210', '6789012345', '7654321098'])(
    'rejects the obviously fake %s, as if missing',
    (fake) => {
      expect(isObviouslyFake(fake)).toBe(true);
      expect(cashfreeCustomerPhone(fake)).toBeNull();
      expect(cashfreeCustomerPhone(`+91${fake}`)).toBeNull();
    }
  );

  it('does not reject ordinary numbers that merely contain a pattern', () => {
    for (const ok of ['9812345670', '9876501234', '9000090000', '8123456789']) {
      expect(isObviouslyFake(ok)).toBe(false);
      expect(cashfreeCustomerPhone(ok)).toBe(ok);
    }
  });
});
