import crypto from 'crypto';
import * as admin from 'firebase-admin';
import { cashfreeWebhook, processCashfreeEvent } from './cashfreeWebhook';
import { getUsageDocId } from '../../services/firestore';
import { PRICING, getPlanPrice } from '../../config/pricing';

const APP_ID = 'test_cashfree_app_id';
const SECRET_KEY = 'test_cashfree_secret_key_12345';

process.env['CASHFREE_APP_ID'] = APP_ID;
process.env['CASHFREE_SECRET_KEY'] = SECRET_KEY;
process.env['CASHFREE_WEBHOOK_SECRET'] = SECRET_KEY;
process.env['CASHFREE_ENVIRONMENT'] = 'sandbox';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

const FREE_CREDITS = PRICING.subscriptionTiers.free.monthlyCredits;
const NOW = new Date();
const periodStart = new Date(NOW.getFullYear(), NOW.getMonth(), 1);

let seq = 0;
const uniq = (p: string) => `${p}_cf_${Date.now()}_${++seq}`;

function signWebhook(body: string, timestamp: string, key = SECRET_KEY) {
  return crypto
    .createHmac('sha256', key)
    .update(timestamp + body)
    .digest('base64');
}

describeIfEmulator('cashfreeWebhook (Firestore emulator)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  async function seedUser(userId: string) {
    await db
      .collection('users')
      .doc(userId)
      .set({ userId, email: `${userId}@example.com` });
    await db
      .collection('usage')
      .doc(getUsageDocId(userId, periodStart))
      .set({
        usageId: getUsageDocId(userId, periodStart),
        userId,
        planId: 'free',
        creditsUsed: 0,
        creditsIncluded: FREE_CREDITS,
        campaignsCreated: 0,
      });
  }

  const usageOf = async (userId: string) =>
    (await db.collection('usage').doc(getUsageDocId(userId, periodStart)).get()).data()!;

  async function seedPendingTxn(
    orderId: string,
    userId: string,
    kind: 'subscription' | 'credit_pack',
    planId = 'starter',
    credits = 500
  ) {
    await db
      .collection('transactions')
      .doc(orderId)
      .set({
        transactionId: orderId,
        userId,
        type: kind === 'credit_pack' ? 'credit_purchase' : 'subscription',
        amount: credits,
        currency: 'INR',
        balanceAfter: 0,
        status: 'pending',
        provider: 'cashfree',
        cashfreeOrderId: orderId,
        metadata: {
          kind,
          planId: kind === 'subscription' ? planId : null,
          billingCycle: 'monthly',
          credits,
          priceINR: kind === 'subscription' ? getPlanPrice(planId as 'business', 'monthly') : 999,
        },
      });
  }

  describe('one-time credit pack fulfillment', () => {
    it('grants credit pack idempotently and records cashfree_grants document', async () => {
      const userId = uniq('u');
      const orderId = uniq('ord');
      await seedUser(userId);
      await seedPendingTxn(orderId, userId, 'credit_pack', undefined, 500);

      const payload = {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: { order_id: orderId, order_amount: 999, order_currency: 'INR' },
          payment: {
            cf_payment_id: 'cf_pay_111',
            payment_status: 'SUCCESS',
            payment_amount: 999,
            payment_currency: 'INR',
          },
          customer_details: { customer_id: userId },
        },
      };

      await processCashfreeEvent(payload);
      await processCashfreeEvent(payload); // duplicate webhook

      const usage = await usageOf(userId);
      expect(usage['bonusCredits']).toBe(500);
      expect(usage['creditsIncluded']).toBe(FREE_CREDITS + 500);

      const txn = (await db.collection('transactions').doc(orderId).get()).data()!;
      expect(txn['status']).toBe('completed');
      expect(txn['cashfreePaymentId']).toBe('cf_pay_111');

      const grant = (await db.collection('cashfree_grants').doc(orderId).get()).data()!;
      expect(grant['status']).toBe('granted');
      expect(grant['credits']).toBe(500);
    });
  });

  describe('subscription plan fulfillment', () => {
    it('grants plan entitlement, updates subscription and user docs idempotently', async () => {
      const userId = uniq('u');
      const orderId = uniq('ord');
      await seedUser(userId);
      await seedPendingTxn(orderId, userId, 'subscription', 'business', 1200);

      const payload = {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: {
            order_id: orderId,
            order_amount: getPlanPrice('business', 'monthly'),
            order_currency: 'INR',
          },
          payment: {
            cf_payment_id: 'cf_pay_222',
            payment_status: 'SUCCESS',
            payment_amount: getPlanPrice('business', 'monthly'),
            payment_currency: 'INR',
          },
          customer_details: { customer_id: userId },
        },
      };

      await processCashfreeEvent(payload);

      const usage = await usageOf(userId);
      expect(usage['planId']).toBe('business');
      expect(usage['creditsIncluded']).toBe(1200);

      const userDoc = (await db.collection('users').doc(userId).get()).data()!;
      expect(userDoc['subscriptionId']).toBe(`sub_cf_${userId}_business`);

      const subDoc = (
        await db.collection('subscriptions').doc(`sub_cf_${userId}_business`).get()
      ).data()!;
      expect(subDoc['status']).toBe('active');
      expect(subDoc['provider']).toBe('cashfree');
    });
  });

  describe('HTTP webhook onRequest', () => {
    it('verifies signature header and handles valid request', async () => {
      const userId = uniq('u');
      const orderId = uniq('ord');
      await seedUser(userId);
      await seedPendingTxn(orderId, userId, 'credit_pack', undefined, 500);

      const payload = {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: { order_id: orderId, order_amount: 999, order_currency: 'INR' },
          payment: {
            cf_payment_id: 'cf_pay_333',
            payment_status: 'SUCCESS',
            payment_amount: 999,
            payment_currency: 'INR',
          },
          customer_details: { customer_id: userId },
        },
      };

      const rawBody = JSON.stringify(payload);
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = signWebhook(rawBody, timestamp);

      const req: any = {
        method: 'POST',
        headers: {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp,
        },
        rawBody: Buffer.from(rawBody),
        body: payload,
      };

      const res: any = {
        _status: 0,
        status(c: number) {
          this._status = c;
          return this;
        },
        send() {
          return this;
        },
      };

      await (cashfreeWebhook as any)(req, res);
      expect(res._status).toBe(200);

      const usage = await usageOf(userId);
      expect(usage['bonusCredits']).toBe(500);
    });

    it.each([
      ['shorter than expected', (s: string) => s.slice(0, s.length - 4)],
      ['longer than expected', (s: string) => s + 'AAAA'],
      ['correct length but wrong', (s: string) => 'A'.repeat(s.length)],
    ])('rejects a signature %s with 400 and changes no state', async (_label, mutate) => {
      const userId = uniq('u');
      const orderId = uniq('ord');
      await seedUser(userId);
      await seedPendingTxn(orderId, userId, 'credit_pack', undefined, 500);
      const before = await usageOf(userId);

      const payload = {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: { order_id: orderId, order_amount: 999, order_currency: 'INR' },
          payment: {
            cf_payment_id: 'cf_pay_bad',
            payment_status: 'SUCCESS',
            payment_amount: 999,
            payment_currency: 'INR',
          },
          customer_details: { customer_id: userId },
        },
      };
      const rawBody = JSON.stringify(payload);
      const timestamp = String(Math.floor(Date.now() / 1000));
      const req: any = {
        method: 'POST',
        headers: {
          'x-webhook-signature': mutate(signWebhook(rawBody, timestamp)),
          'x-webhook-timestamp': timestamp,
        },
        rawBody: Buffer.from(rawBody),
        body: payload,
      };
      const res: any = {
        _status: 0,
        status(c: number) {
          this._status = c;
          return this;
        },
        send() {
          return this;
        },
      };

      await (cashfreeWebhook as any)(req, res);
      expect(res._status).toBe(400);
      expect(await usageOf(userId)).toEqual(before);
      const txn = (await db.collection('transactions').doc(orderId).get()).data()!;
      expect(txn['status']).toBe('pending');
      expect(
        (await db.collection('cashfree_grants').get()).docs.some((d) => d.id.includes('cf_pay_bad'))
      ).toBe(false);
    });

    it('rejects request with invalid signature', async () => {
      const payload = { type: 'PAYMENT_SUCCESS_WEBHOOK' };
      const rawBody = JSON.stringify(payload);
      const timestamp = String(Math.floor(Date.now() / 1000));

      const req: any = {
        method: 'POST',
        headers: {
          'x-webhook-signature': 'invalid_sig',
          'x-webhook-timestamp': timestamp,
        },
        rawBody: Buffer.from(rawBody),
        body: payload,
      };

      const res: any = {
        _status: 0,
        status(c: number) {
          this._status = c;
          return this;
        },
        send() {
          return this;
        },
      };

      await (cashfreeWebhook as any)(req, res);
      expect(res._status).toBe(400);
    });
  });
});
