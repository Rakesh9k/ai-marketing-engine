/**
 * Cashfree is the approved active gateway (2026-10-11). This suite proves, on the Firestore emulator and
 * through the real callables / HTTP handlers (only Cashfree's HTTP API is stubbed), that:
 *
 *   1. checkout -> signed webhook -> credit/entitlement grant works end to end for a plan and a credit pack;
 *   2. a replayed webhook, a short payment, a wrong currency and a non-SUCCESS status never grant (or grant twice);
 *   3. the browser return URL cannot be pointed at another site;
 *   4. refunds are recorded for review and never silently revoke credits;
 *   5. PADDLE CANNOT GRANT while Cashfree is active (checkout refuses; a correctly signed Paddle event is
 *      acknowledged but changes nothing), and symmetrically Cashfree cannot grant while Paddle is active;
 *   6. a live subscription from either provider blocks a second purchase from the other.
 *
 * NOT covered (needs real credentials): a transaction against Cashfree's real sandbox. See the audit report.
 */
const CF_SECRET = 'test_cashfree_secret_for_unit_tests_only';
process.env['CASHFREE_APP_ID'] = 'test_app_id';
process.env['CASHFREE_SECRET_KEY'] = CF_SECRET;
process.env['CASHFREE_WEBHOOK_SECRET'] = CF_SECRET;
process.env['CASHFREE_ENVIRONMENT'] = 'sandbox';
const PADDLE_SECRET = 'pdl_ntfset_test_secret_for_provider_switch';
process.env['PADDLE_API_KEY'] = 'pdl_sdbx_apikey_test_only';
process.env['PADDLE_WEBHOOK_SECRET'] = PADDLE_SECRET;
process.env['PADDLE_ENVIRONMENT'] = 'sandbox';
process.env['PADDLE_PRICE_ID_PACK_500'] = 'pri_pack_500';
process.env['PADDLE_PRICE_ID_STARTER_MONTHLY'] = 'pri_starter_m';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { createCashfreeCheckout } from './createCashfreeCheckout';
import { createPaddleCheckout } from './createPaddleCheckout';
import { cashfreeWebhook } from '../webhooks/cashfreeWebhook';
import { paddleWebhook } from '../webhooks/paddleWebhook';
import { getUsageDocId } from '../../services/firestore';
import { PRICING, getPlanPrice, getMonthlyCredits } from '../../config/pricing';

const NOW = new Date();
const periodStart = new Date(NOW.getFullYear(), NOW.getMonth(), 1);
let seq = 0;
const uniq = (p: string) => `${p}_sw_${Date.now()}_${++seq}`;

describeIfEmulator('payment provider switch: Cashfree active, Paddle inert', () => {
  const db = admin.firestore();
  const realFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    process.env['ACTIVE_PAYMENT_PROVIDER'] = 'cashfree';
    fetchMock.mockReset();
    // Stub Cashfree's order API: echo back the order we asked for.
    fetchMock.mockImplementation(async (_url: string, init: { body: string }) => {
      const sent = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          order_id: sent.order_id,
          payment_session_id: `session_${sent.order_id}`,
          order_status: 'ACTIVE',
        }),
        text: async () => '',
      };
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });
  afterAll(async () => {
    delete process.env['ACTIVE_PAYMENT_PROVIDER'];
    await admin.app().delete();
  });

  async function seedUser(userId: string, extra: Record<string, unknown> = {}) {
    await db
      .collection('users')
      .doc(userId)
      .set({
        userId,
        email: `${userId}@example.com`,
        displayName: 'Test User',
        billingPhone: '9812345670',
        role: 'owner',
        businessIds: [],
        ...extra,
      });
    await db
      .collection('usage')
      .doc(getUsageDocId(userId, periodStart))
      .set({
        usageId: getUsageDocId(userId, periodStart),
        userId,
        planId: 'free',
        creditsUsed: 0,
        creditsIncluded: PRICING.subscriptionTiers.free.monthlyCredits,
        campaignsCreated: 0,
      });
  }
  const usageOf = async (userId: string) =>
    (await db.collection('usage').doc(getUsageDocId(userId, periodStart)).get()).data()!;
  const callable = (fn: unknown, data: Record<string, unknown>, uid: string) =>
    (fn as { run: (r: unknown) => Promise<any> }).run({ data, auth: { uid, token: {} } });

  function cashfreeSign(
    body: string,
    ts = String(Math.floor(Date.now() / 1000)),
    secret = CF_SECRET
  ) {
    return {
      'x-webhook-signature': crypto
        .createHmac('sha256', secret)
        .update(ts + body)
        .digest('base64'),
      'x-webhook-timestamp': ts,
    };
  }
  async function postCashfree(payload: unknown, headers?: Record<string, string>) {
    const rawBody = JSON.stringify(payload);
    const req: any = {
      method: 'POST',
      headers: headers ?? cashfreeSign(rawBody),
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
    return res._status as number;
  }
  const paidPayload = (
    orderId: string,
    userId: string,
    amount: number,
    over: Record<string, unknown> = {}
  ) => ({
    type: 'PAYMENT_SUCCESS_WEBHOOK',
    data: {
      order: { order_id: orderId, order_amount: amount, order_currency: 'INR' },
      payment: {
        cf_payment_id: uniq('cfpay'),
        payment_status: 'SUCCESS',
        payment_amount: amount,
        payment_currency: 'INR',
        ...over,
      },
      customer_details: { customer_id: userId },
    },
  });

  describe('1. checkout -> signed webhook -> grant (Cashfree)', () => {
    it('a plan purchase: server prices the order, the webhook grants the plan once, replays are harmless', async () => {
      const userId = uniq('u');
      await seedUser(userId);
      const price = getPlanPrice('starter', 'monthly');

      const checkout = await callable(
        createCashfreeCheckout,
        {
          planId: 'starter',
          billingCycle: 'monthly',
          returnUrl: 'http://localhost:3000/billing?cashfree_order_id={order_id}',
        },
        userId
      );
      // The order sent to Cashfree carries the SERVER's price and purchaser, not anything client-supplied.
      const sent = JSON.parse(fetchMock.mock.calls[0]![1].body);
      expect(sent.order_amount).toBe(price);
      expect(sent.order_currency).toBe('INR');
      expect(sent.customer_details.customer_id).toBe(userId);
      expect(checkout.amountINR).toBe(price);

      const txn = (await db.collection('transactions').doc(checkout.orderId).get()).data()!;
      expect(txn['status']).toBe('pending');
      expect(txn['provider']).toBe('cashfree');
      // Checkout itself grants NOTHING.
      expect((await usageOf(userId))['planId']).toBe('free');

      const payload = paidPayload(checkout.orderId, userId, price);
      expect(await postCashfree(payload)).toBe(200);

      const usage = await usageOf(userId);
      expect(usage['planId']).toBe('starter');
      expect(usage['creditsIncluded']).toBe(getMonthlyCredits('starter'));
      const user = (await db.collection('users').doc(userId).get()).data()!;
      const sub = (await db.collection('subscriptions').doc(user['subscriptionId']).get()).data()!;
      expect(sub['provider']).toBe('cashfree');
      expect(sub['status']).toBe('active');
      expect(sub['userId']).toBe(userId);
      expect(
        (await db.collection('transactions').doc(checkout.orderId).get()).data()!['status']
      ).toBe('completed');
      expect(
        (await db.collection('cashfree_grants').doc(checkout.orderId).get()).data()!['status']
      ).toBe('granted');

      // Cashfree retries / sends ORDER_PAID as well: still exactly one grant.
      expect(await postCashfree(payload)).toBe(200);
      expect(await postCashfree({ ...payload, type: 'ORDER_PAID_WEBHOOK' })).toBe(200);
      expect((await usageOf(userId))['creditsIncluded']).toBe(getMonthlyCredits('starter'));
    });

    it('a credit pack: the webhook adds exactly the pack credits, once', async () => {
      const userId = uniq('u');
      await seedUser(userId);
      const pack = PRICING.topUpPacks[0]!;
      const checkout = await callable(createCashfreeCheckout, { creditPack: pack.credits }, userId);
      const payload = paidPayload(checkout.orderId, userId, pack.priceINR);
      expect(await postCashfree(payload)).toBe(200);
      expect(await postCashfree(payload)).toBe(200);
      expect((await usageOf(userId))['bonusCredits']).toBe(pack.credits);
    });

    it('the client success redirect alone cannot grant anything (no webhook => no entitlement)', async () => {
      const userId = uniq('u');
      await seedUser(userId);
      await callable(
        createCashfreeCheckout,
        { planId: 'business', billingCycle: 'monthly' },
        userId
      );
      expect((await usageOf(userId))['planId']).toBe('free');
      expect((await usageOf(userId))['bonusCredits']).toBeUndefined();
    });
  });

  describe('2. a grant must match the order the server created', () => {
    async function pendingPack(userId: string) {
      await seedUser(userId);
      const pack = PRICING.topUpPacks[0]!;
      const checkout = await callable(createCashfreeCheckout, { creditPack: pack.credits }, userId);
      return { pack, orderId: checkout.orderId as string };
    }

    it('a SHORT payment is acknowledged but grants nothing and is flagged', async () => {
      const userId = uniq('u');
      const { pack, orderId } = await pendingPack(userId);
      expect(await postCashfree(paidPayload(orderId, userId, pack.priceINR - 100))).toBe(200);
      expect((await usageOf(userId))['bonusCredits']).toBeUndefined();
      const grant = (await db.collection('cashfree_grants').doc(orderId).get()).data()!;
      expect(grant['status']).toBe('flagged');
      expect(grant['reason']).toMatch(/amount/);
      expect((await db.collection('transactions').doc(orderId).get()).data()!['status']).toBe(
        'pending'
      );
    });

    it('a payment that is not SUCCESS, or not in INR, grants nothing', async () => {
      const a = uniq('u');
      const A = await pendingPack(a);
      await postCashfree(paidPayload(A.orderId, a, A.pack.priceINR, { payment_status: 'FAILED' }));
      expect((await usageOf(a))['bonusCredits']).toBeUndefined();

      const b = uniq('u');
      const B = await pendingPack(b);
      await postCashfree(paidPayload(B.orderId, b, B.pack.priceINR, { payment_currency: 'USD' }));
      expect((await usageOf(b))['bonusCredits']).toBeUndefined();
    });

    it('an unknown order, or a webhook with a bad / missing / wrong-length signature, grants nothing', async () => {
      const userId = uniq('u');
      const { pack, orderId } = await pendingPack(userId);
      const payload = paidPayload(orderId, userId, pack.priceINR);
      const raw = JSON.stringify(payload);
      expect(await postCashfree(payload, cashfreeSign(raw, undefined, 'wrong-secret'))).toBe(400);
      expect(
        await postCashfree(payload, { 'x-webhook-signature': 'short', 'x-webhook-timestamp': '1' })
      ).toBe(400);
      expect(await postCashfree(payload, {} as never)).toBe(400);
      expect(await postCashfree(paidPayload('no_such_order', userId, 100))).toBe(200); // acked, nothing to grant
      expect((await usageOf(userId))['bonusCredits']).toBeUndefined();
    });
  });

  describe('3. return URL', () => {
    it('rejects a return URL on another site and creates no order', async () => {
      const userId = uniq('u');
      await seedUser(userId);
      await expect(
        callable(
          createCashfreeCheckout,
          { creditPack: 500, returnUrl: 'https://evil.example.com/steal' },
          userId
        )
      ).rejects.toMatchObject({ code: 'invalid-argument' });
      expect(fetchMock).not.toHaveBeenCalled();
      expect((await db.collection('transactions').where('userId', '==', userId).get()).size).toBe(
        0
      );
    });
  });

  describe('4. a full refund removes the unspent pack credits (baseline rule)', () => {
    it('records the refund and reverses the unspent pack credits exactly once', async () => {
      const userId = uniq('u');
      await seedUser(userId);
      const pack = PRICING.topUpPacks[0]!;
      const checkout = await callable(createCashfreeCheckout, { creditPack: pack.credits }, userId);
      await postCashfree(paidPayload(checkout.orderId, userId, pack.priceINR));
      const refundId = uniq('rf');
      expect(
        await postCashfree({
          type: 'REFUND_STATUS_WEBHOOK',
          data: {
            order: {
              order_id: checkout.orderId,
              order_amount: pack.priceINR,
              order_currency: 'INR',
            },
            refund: { refund_id: refundId, refund_status: 'SUCCESS', refund_amount: pack.priceINR },
          },
        })
      ).toBe(200);
      const refund = (await db.collection('cashfree_refunds').doc(refundId).get()).data()!;
      expect(refund['needsManualReview']).toBe(false);
      expect(refund['adjustment']).toMatchObject({ action: 'revoke_credits' });
      expect(
        (await db.collection('transactions').doc(checkout.orderId).get()).data()!['reconciliation']
      ).toMatchObject({ state: 'refunded' });
      expect((await usageOf(userId))['bonusCredits']).toBe(0); // unspent pack credits removed
    });
  });

  describe('5. only the active provider can grant', () => {
    function paddleSign(body: string) {
      const ts = Math.floor(Date.now() / 1000);
      return `ts=${ts};h1=${crypto.createHmac('sha256', PADDLE_SECRET).update(`${ts}:${body}`).digest('hex')}`;
    }
    function paddleTxnBody(userId: string, txnId: string, eventId: string) {
      return JSON.stringify({
        event_id: eventId,
        event_type: 'transaction.completed',
        occurred_at: new Date().toISOString(),
        notification_id: uniq('ntf'),
        data: {
          id: txnId,
          status: 'completed',
          customer_id: 'ctm_x',
          custom_data: { firebaseUid: userId },
          currency_code: 'INR',
          origin: 'web',
          subscription_id: null,
          payments: [],
          items: [
            {
              price: {
                id: 'pri_pack_500',
                product_id: 'pro_t',
                unit_price: { amount: '49900', currency_code: 'INR' },
                unit_price_overrides: [],
                quantity: { minimum: 1, maximum: 1 },
                billing_cycle: null,
                trial_period: null,
              },
              quantity: 1,
            },
          ],
          details: {
            tax_rates_used: [],
            line_items: [],
            totals: { subtotal: '49900', discount: '0', tax: '0', total: '49900' },
          },
        },
      });
    }
    async function postPaddle(body: string, signature = paddleSign(body)) {
      const req: any = {
        method: 'POST',
        headers: { 'paddle-signature': signature },
        rawBody: Buffer.from(body),
        body: JSON.parse(body),
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
      await (paddleWebhook as any)(req, res);
      return res._status as number;
    }

    it('Paddle checkout refuses while Cashfree is active', async () => {
      const userId = uniq('u');
      await seedUser(userId);
      await expect(
        callable(createPaddleCheckout, { creditPack: 500 }, userId)
      ).rejects.toMatchObject({
        code: 'failed-precondition',
      });
      expect((await db.collection('transactions').where('userId', '==', userId).get()).size).toBe(
        0
      );
    });

    it('a CORRECTLY SIGNED Paddle purchase event is acknowledged but grants nothing and is recorded for review', async () => {
      const userId = uniq('u');
      const txnId = uniq('txn');
      const eventId = uniq('evt');
      await seedUser(userId);
      await db
        .collection('transactions')
        .doc(txnId)
        .set({
          transactionId: txnId,
          userId,
          type: 'credit_purchase',
          status: 'pending',
          provider: 'paddle',
          metadata: { kind: 'credit_pack', credits: 500 },
        });
      expect(await postPaddle(paddleTxnBody(userId, txnId, eventId))).toBe(200);

      expect((await usageOf(userId))['bonusCredits']).toBeUndefined();
      expect((await usageOf(userId))['planId']).toBe('free');
      expect((await db.collection('paddle_grants').doc(txnId).get()).exists).toBe(false);
      expect((await db.collection('transactions').doc(txnId).get()).data()!['status']).toBe(
        'pending'
      );
      const ignored = (
        await db.collection('provider_ignored_events').doc(`paddle_${eventId}`).get()
      ).data()!;
      expect(ignored['needsManualReview']).toBe(true);
      expect(ignored['activeProvider']).toBe('cashfree');
    });

    it('an unsigned / wrongly signed Paddle event is still rejected (400), active or not', async () => {
      const body = paddleTxnBody(uniq('u'), uniq('txn'), uniq('evt'));
      expect(await postPaddle(body, 'ts=1;h1=deadbeef')).toBe(400);
    });

    it('symmetrically, with Paddle active, Cashfree checkout refuses and a signed Cashfree event grants nothing', async () => {
      process.env['ACTIVE_PAYMENT_PROVIDER'] = 'paddle';
      const userId = uniq('u');
      await seedUser(userId);
      await expect(
        callable(createCashfreeCheckout, { creditPack: 500 }, userId)
      ).rejects.toMatchObject({
        code: 'failed-precondition',
      });
      const orderId = uniq('ord');
      await db
        .collection('transactions')
        .doc(orderId)
        .set({
          transactionId: orderId,
          userId,
          status: 'pending',
          provider: 'cashfree',
          metadata: { kind: 'credit_pack', credits: 500, priceINR: 499 },
        });
      expect(await postCashfree(paidPayload(orderId, userId, 499))).toBe(200);
      expect((await usageOf(userId))['bonusCredits']).toBeUndefined();
      expect((await db.collection('cashfree_grants').doc(orderId).get()).exists).toBe(false);
    });
  });

  describe('6. one live subscription blocks a second purchase from either provider', () => {
    it('a live Paddle subscription blocks a Cashfree plan purchase', async () => {
      const userId = uniq('u');
      const subId = uniq('sub_paddle');
      await seedUser(userId, { subscriptionId: subId });
      await db.collection('subscriptions').doc(subId).set({
        subscriptionId: subId,
        userId,
        provider: 'paddle',
        planId: 'starter',
        status: 'active',
        cancelAtPeriodEnd: false,
      });
      await expect(
        callable(createCashfreeCheckout, { planId: 'business', billingCycle: 'monthly' }, userId)
      ).rejects.toMatchObject({ code: 'failed-precondition' });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
