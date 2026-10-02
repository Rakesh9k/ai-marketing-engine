/**
 * payuWebhook — real Firestore emulator (hash verification, idempotency
 * claim, and credit grant all use real Firestore reads/writes). Self-skips
 * without FIRESTORE_EMULATOR_HOST. The network call to PayU's
 * verify_payment API (verifyPaymentWithPayU) is mocked — there is no real
 * PayU test account in this environment — everything else (hash
 * construction/verification, idempotency, amount reconciliation, credit
 * grant) is the real implementation.
 *
 * process.env['PAYU_MERCHANT_KEY']/['PAYU_SALT'] must be set BEFORE
 * services/payu.ts's getPayUConfig() is first called (getEnvConfig() caches
 * on first read), so they're set at the very top of this file.
 */
const TEST_KEY = 'test-merchant-key';
const TEST_SALT = 'test-payu-salt-for-webhook-tests';
process.env['PAYU_MERCHANT_KEY'] = TEST_KEY;
process.env['PAYU_SALT'] = TEST_SALT;
process.env['PAYU_ENVIRONMENT'] = 'test';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

const verifyPaymentWithPayUMock = jest.fn();
jest.mock('./../../services/payu', () => {
  const actual = jest.requireActual('./../../services/payu');
  return {
    ...actual,
    verifyPaymentWithPayU: (...args: unknown[]) => verifyPaymentWithPayUMock(...args),
  };
});

import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { payuWebhook } from './payuWebhook';
import { generateResponseHash } from '../../services/payu';

function makeReqRes(bodyObj: Record<string, unknown>) {
  const req: any = { method: 'POST', body: bodyObj };
  const res: any = {
    _status: 0,
    _body: undefined,
    status(code: number) {
      this._status = code;
      return this;
    },
    send(body: unknown) {
      this._body = body;
      return this;
    },
  };
  return { req, res };
}

function signedPayload(
  overrides: Partial<{
    txnid: string;
    amount: string;
    status: string;
    productinfo: string;
    firstname: string;
    email: string;
    udf1: string;
    udf2: string;
    mihpayid: string;
  }>
) {
  const fields = {
    key: TEST_KEY,
    txnid: overrides.txnid ?? 'txn-default',
    amount: overrides.amount ?? '999.00',
    productinfo: overrides.productinfo ?? 'Mitra business plan subscription',
    firstname: overrides.firstname ?? 'Test User',
    email: overrides.email ?? 'test@example.com',
    status: overrides.status ?? 'success',
    udf1: overrides.udf1,
    udf2: overrides.udf2,
  };
  const hash = generateResponseHash({ ...fields, salt: TEST_SALT });
  return { ...fields, hash, mihpayid: overrides.mihpayid ?? 'mihpay123' };
}

describeIfEmulator('payuWebhook (Firestore emulator, network to PayU mocked)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    verifyPaymentWithPayUMock.mockResolvedValue({
      txnid: 'txn-default',
      status: 'success',
      amount: '999.00',
      mihpayid: 'mihpay123',
      raw: {},
    });
  });

  async function seedPendingTransaction(
    txnid: string,
    userId: string,
    planId: string,
    amount: number
  ) {
    await db
      .collection('transactions')
      .doc(txnid)
      .set({
        transactionId: txnid,
        userId,
        type: 'subscription',
        amount,
        currency: 'INR',
        balanceAfter: 0,
        description: `Subscription payment for ${planId} plan`,
        provider: 'payu',
        payuTxnId: txnid,
        status: 'pending',
        metadata: { planId },
        createdAt: new Date().toISOString(),
      });
  }

  it('rejects a webhook with an invalid hash (tampered payload) without granting credits', async () => {
    const txnid = `txn-${crypto.randomUUID()}`;
    await seedPendingTransaction(txnid, 'user-1', 'business', 999);

    const payload = signedPayload({ txnid, udf1: 'user-1', udf2: 'business' });
    payload.amount = '1.00'; // tampered after hashing

    const { req, res } = makeReqRes(payload);
    await payuWebhook(req, res);

    expect(res._status).toBe(400);
    const txn = await db.collection('transactions').doc(txnid).get();
    expect(txn.data()!['status']).toBe('pending'); // untouched
  });

  it('a valid success webhook grants credits exactly once and marks the transaction completed', async () => {
    const txnid = `txn-${crypto.randomUUID()}`;
    const userId = `user-${crypto.randomUUID()}`;
    await seedPendingTransaction(txnid, userId, 'business', 999);
    verifyPaymentWithPayUMock.mockResolvedValue({
      txnid,
      status: 'success',
      amount: '999.00',
      mihpayid: 'mihpay123',
      raw: {},
    });

    const payload = signedPayload({ txnid, udf1: userId, udf2: 'business' });
    const { req, res } = makeReqRes(payload);
    await payuWebhook(req, res);

    expect(res._status).toBe(200);
    const txn = await db.collection('transactions').doc(txnid).get();
    expect(txn.data()!['status']).toBe('completed');

    const sub = await db.collection('subscriptions').doc(txnid).get();
    expect(sub.exists).toBe(true);
    expect(sub.data()!['planId']).toBe('business');
    expect(sub.data()!['provider']).toBe('payu');
    expect(sub.data()!['creditsIncluded']).toBe(1200);
  });

  it('the exact same webhook delivered twice grants credits only once (idempotency)', async () => {
    const txnid = `txn-${crypto.randomUUID()}`;
    const userId = `user-${crypto.randomUUID()}`;
    await seedPendingTransaction(txnid, userId, 'starter', 499);
    verifyPaymentWithPayUMock.mockResolvedValue({
      txnid,
      status: 'success',
      amount: '499.00',
      mihpayid: 'mihpay456',
      raw: {},
    });

    const payload = signedPayload({
      txnid,
      amount: '499.00',
      udf1: userId,
      udf2: 'starter',
    });

    const first = makeReqRes(payload);
    const second = makeReqRes(payload);
    await payuWebhook(first.req, first.res);
    await payuWebhook(second.req, second.res);

    expect(first.res._status).toBe(200);
    expect(second.res._status).toBe(200);

    const sub = await db.collection('subscriptions').doc(txnid).get();
    expect(sub.data()!['creditsIncluded']).toBe(500); // not 1000
  });

  it('concurrent duplicate delivery of the same event grants credits exactly once', async () => {
    const txnid = `txn-${crypto.randomUUID()}`;
    const userId = `user-${crypto.randomUUID()}`;
    await seedPendingTransaction(txnid, userId, 'starter', 499);
    verifyPaymentWithPayUMock.mockResolvedValue({
      txnid,
      status: 'success',
      amount: '499.00',
      mihpayid: 'mihpay789',
      raw: {},
    });

    const payload = signedPayload({ txnid, amount: '499.00', udf1: userId, udf2: 'starter' });
    const a = makeReqRes(payload);
    const b = makeReqRes(payload);
    const c = makeReqRes(payload);

    await Promise.all([
      payuWebhook(a.req, a.res),
      payuWebhook(b.req, b.res),
      payuWebhook(c.req, c.res),
    ]);

    const sub = await db.collection('subscriptions').doc(txnid).get();
    expect(sub.data()!['creditsIncluded']).toBe(500);
  });

  it("refuses to grant credits when the received amount does not match Mitra's own expected amount", async () => {
    const txnid = `txn-${crypto.randomUUID()}`;
    const userId = `user-${crypto.randomUUID()}`;
    await seedPendingTransaction(txnid, userId, 'business', 999); // expects ₹999

    // A validly-hashed payload, but for ₹1 instead of the expected ₹999 —
    // simulates a compromised/rogue sender who knows the salt would still
    // be caught by comparing against Mitra's OWN persisted expectation.
    const payload = signedPayload({ txnid, amount: '1.00', udf1: userId, udf2: 'business' });
    const { req, res } = makeReqRes(payload);
    await payuWebhook(req, res);

    expect(res._status).toBe(200); // webhook ack'd, but...
    const txn = await db.collection('transactions').doc(txnid).get();
    expect(txn.data()!['status']).toBe('flagged_amount_mismatch');

    const sub = await db.collection('subscriptions').doc(txnid).get();
    expect(sub.exists).toBe(false); // no credits granted, no subscription created
  });

  it('a failure status never grants credits', async () => {
    const txnid = `txn-${crypto.randomUUID()}`;
    const userId = `user-${crypto.randomUUID()}`;
    await seedPendingTransaction(txnid, userId, 'business', 999);

    const payload = signedPayload({ txnid, status: 'failure', udf1: userId, udf2: 'business' });
    const { req, res } = makeReqRes(payload);
    await payuWebhook(req, res);

    expect(res._status).toBe(200);
    const txn = await db.collection('transactions').doc(txnid).get();
    expect(txn.data()!['status']).toBe('failed');
    const sub = await db.collection('subscriptions').doc(txnid).get();
    expect(sub.exists).toBe(false);
  });

  it("one user's txnid cannot be used to credit a different user — credits land on the transaction's own recorded userId, not a client-suppliable field", async () => {
    const txnid = `txn-${crypto.randomUUID()}`;
    const ownerId = `user-owner-${crypto.randomUUID()}`;
    const attackerId = `user-attacker-${crypto.randomUUID()}`;
    await seedPendingTransaction(txnid, ownerId, 'business', 999);

    // "Attacker" crafts a validly-hashed payload claiming udf1 = their own
    // id — but userId is read from Mitra's own transaction record, not udf1.
    const payload = signedPayload({ txnid, udf1: attackerId, udf2: 'business' });
    const { req, res } = makeReqRes(payload);
    await payuWebhook(req, res);

    expect(res._status).toBe(200);
    const sub = await db.collection('subscriptions').doc(txnid).get();
    expect(sub.data()!['userId']).toBe(ownerId);

    const attackerDoc = await db.collection('users').doc(attackerId).get();
    expect(attackerDoc.exists).toBe(false);
  });

  it('a webhook for an unknown txnid (no matching Mitra transaction) is a safe no-op', async () => {
    const payload = signedPayload({ txnid: `unknown-${crypto.randomUUID()}` });
    const { req, res } = makeReqRes(payload);
    await payuWebhook(req, res);

    expect(res._status).toBe(200); // ack'd so PayU doesn't retry forever
  });
});
