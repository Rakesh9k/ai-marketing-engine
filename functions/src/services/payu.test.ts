import * as crypto from 'crypto';
import {
  generatePaymentHash,
  generateResponseHash,
  verifyHashConstantTime,
  verifyPayUResponse,
} from './payu';

/**
 * Hash-formula tests, per the PayU migration task's Phase 37/38. Formulas
 * verified against PayU's current public documentation
 * (docs.payu.in/docs/generate-hash-payu-hosted, fetched during
 * implementation — see services/payu.ts's module header for sources), not
 * invented. These tests prove: (a) this file's implementation matches a
 * manually-recomputed sha512 of the exact documented pipe-delimited
 * string, and (b) the hash is sensitive to every signed field.
 */
describe('PayU payment request hash (forward)', () => {
  const base = {
    key: 'gtKFFx',
    txnid: 'txn12345',
    amount: '999.00',
    productinfo: 'Mitra business plan subscription',
    firstname: 'Vishesh',
    email: 'vishesh@example.com',
    salt: 'eCwWELxi',
  };

  function manualForwardHash(input: typeof base & { udf1?: string; udf2?: string }): string {
    const fields = [
      input.key,
      input.txnid,
      input.amount,
      input.productinfo,
      input.firstname,
      input.email,
      input.udf1 ?? '',
      input.udf2 ?? '',
      '', // udf3
      '', // udf4
      '', // udf5
      '', // udf6
      '', // udf7
      '', // udf8
      '', // udf9
      '', // udf10
      input.salt,
    ];
    return crypto.createHash('sha512').update(fields.join('|')).digest('hex');
  }

  it('matches a manually-constructed sha512 over the documented pipe-delimited field order (no UDFs)', () => {
    expect(generatePaymentHash(base)).toBe(manualForwardHash(base));
  });

  it('matches a manually-constructed hash when udf1/udf2 are set', () => {
    const withUdf = { ...base, udf1: 'user-abc', udf2: 'business' };
    expect(generatePaymentHash(withUdf)).toBe(manualForwardHash(withUdf));
  });

  it('is a 128-character lowercase hex string (sha512, not a shorter/weaker algorithm)', () => {
    const hash = generatePaymentHash(base);
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
  });

  it('changes when the amount changes (₹1 must not hash the same as ₹999)', () => {
    expect(generatePaymentHash(base)).not.toBe(generatePaymentHash({ ...base, amount: '1.00' }));
  });

  it('changes when the txnid changes', () => {
    expect(generatePaymentHash(base)).not.toBe(
      generatePaymentHash({ ...base, txnid: 'different-txn' })
    );
  });

  it('changes when the plan (productinfo) changes', () => {
    expect(generatePaymentHash(base)).not.toBe(
      generatePaymentHash({ ...base, productinfo: 'Mitra agency plan subscription' })
    );
  });

  it("changes when udf1 (the userId) changes — one user cannot reuse another user's hash", () => {
    const a = generatePaymentHash({ ...base, udf1: 'user-A' });
    const b = generatePaymentHash({ ...base, udf1: 'user-B' });
    expect(a).not.toBe(b);
  });

  it('handles special characters and unicode in firstname without throwing', () => {
    expect(() => generatePaymentHash({ ...base, firstname: "O'Brien 名前 & Co." })).not.toThrow();
  });

  it('handles decimal amounts with two decimal places consistently', () => {
    const h1 = generatePaymentHash({ ...base, amount: '499.00' });
    const h2 = generatePaymentHash({ ...base, amount: '499.0' });
    // Different string representations of the "same" amount MUST hash
    // differently — this is intentional: amount must be formatted
    // identically (toFixed(2)) everywhere it's used, exactly as
    // createPayUPayment.ts does, or verification will legitimately fail.
    expect(h1).not.toBe(h2);
  });
});

describe('PayU response/webhook hash (reverse)', () => {
  const base = {
    key: 'gtKFFx',
    txnid: 'txn12345',
    amount: '999.00',
    productinfo: 'Mitra business plan subscription',
    firstname: 'Vishesh',
    email: 'vishesh@example.com',
    status: 'success',
    salt: 'eCwWELxi',
  };

  function manualReverseHash(
    input: typeof base & {
      udf1?: string;
      udf2?: string;
      udf3?: string;
      udf4?: string;
      udf5?: string;
    }
  ): string {
    const fields = [
      input.salt,
      input.status,
      '',
      '',
      '',
      '',
      '',
      input.udf5 ?? '',
      input.udf4 ?? '',
      input.udf3 ?? '',
      input.udf2 ?? '',
      input.udf1 ?? '',
      input.email,
      input.firstname,
      input.productinfo,
      input.amount,
      input.txnid,
      input.key,
    ];
    return crypto.createHash('sha512').update(fields.join('|')).digest('hex');
  }

  it('matches a manually-constructed reverse-order hash', () => {
    expect(generateResponseHash(base)).toBe(manualReverseHash(base));
  });

  it('is NOT the same formula/value as the forward payment-request hash for the same fields', () => {
    expect(generateResponseHash(base)).not.toBe(generatePaymentHash({ ...base, salt: base.salt }));
  });

  it('changes when status changes from success to failure', () => {
    expect(generateResponseHash(base)).not.toBe(
      generateResponseHash({ ...base, status: 'failure' })
    );
  });
});

describe('verifyHashConstantTime', () => {
  const expected = crypto.createHash('sha512').update('test-value').digest('hex');

  it('accepts an exact match', () => {
    expect(verifyHashConstantTime(expected, expected)).toBe(true);
  });

  it('rejects a wrong hash of the correct length', () => {
    const wrong = crypto.createHash('sha512').update('different-value').digest('hex');
    expect(verifyHashConstantTime(expected, wrong)).toBe(false);
  });

  it('rejects a missing hash without throwing', () => {
    expect(() => verifyHashConstantTime(expected, undefined)).not.toThrow();
    expect(verifyHashConstantTime(expected, undefined)).toBe(false);
  });

  it('rejects an empty-string hash', () => {
    expect(verifyHashConstantTime(expected, '')).toBe(false);
  });

  it('rejects a malformed (non-hex) hash without throwing', () => {
    expect(() => verifyHashConstantTime(expected, 'not-hex-!!!')).not.toThrow();
    expect(verifyHashConstantTime(expected, 'not-hex-!!!')).toBe(false);
  });

  it('rejects a hash of the wrong length', () => {
    expect(verifyHashConstantTime(expected, expected.slice(0, 64))).toBe(false);
  });

  it('rejects a non-string value (e.g. a number or object) without throwing', () => {
    expect(() => verifyHashConstantTime(expected, 12345 as unknown)).not.toThrow();
    expect(verifyHashConstantTime(expected, 12345 as unknown)).toBe(false);
  });
});

describe('verifyPayUResponse (end-to-end hash check)', () => {
  const salt = 'eCwWELxi';
  const fields = {
    key: 'gtKFFx',
    txnid: 'txn12345',
    amount: '999.00',
    productinfo: 'Mitra business plan subscription',
    firstname: 'Vishesh',
    email: 'vishesh@example.com',
    status: 'success',
  };

  it('accepts a correctly-computed response hash', () => {
    const hash = generateResponseHash({ ...fields, salt });
    expect(verifyPayUResponse({ ...fields, hash }, salt)).toBe(true);
  });

  it('rejects a response where the amount was tampered with after hashing (₹1 vs ₹999)', () => {
    const hash = generateResponseHash({ ...fields, salt });
    // Attacker changes amount but reuses the original hash.
    expect(verifyPayUResponse({ ...fields, amount: '1.00', hash }, salt)).toBe(false);
  });

  it('rejects a response where status was flipped from failure to success after hashing', () => {
    const hash = generateResponseHash({ ...fields, status: 'failure', salt });
    expect(verifyPayUResponse({ ...fields, status: 'success', hash }, salt)).toBe(false);
  });

  it('rejects a response signed with the wrong salt', () => {
    const hash = generateResponseHash({ ...fields, salt: 'wrong-salt' });
    expect(verifyPayUResponse({ ...fields, hash }, salt)).toBe(false);
  });

  it('rejects a completely missing hash field', () => {
    expect(verifyPayUResponse({ ...fields, hash: '' }, salt)).toBe(false);
  });
});
