/**
 * Prepaid fixed-term lifecycle through the real callables, webhook and scheduler on the Firestore emulator
 * (only Cashfree's HTTP API is stubbed): checkout -> signed webhook -> term; renewal extends exactly once; other
 * plans refused; a conflicting paid order is flagged, never silently applied; ended terms stop granting credits
 * and never block a new purchase; the daily job tidies records without touching renewed or Paddle ones.
 */
const CF_SECRET = 'test_cashfree_secret_for_prepaid_term_tests';
process.env['CASHFREE_APP_ID'] = 'test_app_id';
process.env['CASHFREE_SECRET_KEY'] = CF_SECRET;
process.env['CASHFREE_WEBHOOK_SECRET'] = CF_SECRET;
process.env['CASHFREE_ENVIRONMENT'] = 'sandbox';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { createCashfreeCheckout } from './createCashfreeCheckout';
import { cashfreeWebhook } from '../webhooks/cashfreeWebhook';
import { expireEndedSubscriptions } from './expireSubscriptions';
import { getUsageDocId } from '../../services/firestore';
import { reserveCreditsForOperation } from '../../services/usageControl';
import { getPlanPrice, getMonthlyCredits } from '../../config/pricing';

const DAY = 86_400_000;
const NOW = new Date();
const periodStart = new Date(NOW.getFullYear(), NOW.getMonth(), 1);
let seq = 0;
const uniq = (p: string) => `${p}_pt_${Date.now()}_${++seq}`;
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString();

describeIfEmulator('prepaid fixed-term lifecycle (Cashfree)', () => {
  const db = admin.firestore();
  const realFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    process.env['ACTIVE_PAYMENT_PROVIDER'] = 'cashfree';
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (_u: string, init: { body: string }) => {
      const sent = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          order_id: sent.order_id,
          payment_session_id: `s_${sent.order_id}`,
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

  const usageRef = (u: string) => db.collection('usage').doc(getUsageDocId(u, periodStart));
  const usageOf = async (u: string) => (await usageRef(u).get()).data()!;
  async function seedUser(userId: string, extra: Record<string, unknown> = {}) {
    await db
      .collection('users')
      .doc(userId)
      .set({
        userId,
        email: `${userId}@example.com`,
        displayName: 'T',
        role: 'owner',
        businessIds: [],
        ...extra,
      });
    await usageRef(userId).set({
      usageId: usageRef(userId).id,
      userId,
      planId: 'free',
      creditsUsed: 0,
      creditsIncluded: 140,
      campaignsCreated: 0,
    });
  }
  const call = (fn: unknown, data: Record<string, unknown>, uid: string) =>
    (fn as { run: (r: unknown) => Promise<any> }).run({ data, auth: { uid, token: {} } });
  async function postWebhook(payload: unknown) {
    const raw = JSON.stringify(payload);
    const ts = String(Math.floor(Date.now() / 1000));
    const req: any = {
      method: 'POST',
      headers: {
        'x-webhook-signature': crypto
          .createHmac('sha256', CF_SECRET)
          .update(ts + raw)
          .digest('base64'),
        'x-webhook-timestamp': ts,
      },
      rawBody: Buffer.from(raw),
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
  const paid = (orderId: string, userId: string, amount: number) => ({
    type: 'PAYMENT_SUCCESS_WEBHOOK',
    data: {
      order: { order_id: orderId, order_amount: amount, order_currency: 'INR' },
      payment: {
        cf_payment_id: uniq('cfpay'),
        payment_status: 'SUCCESS',
        payment_amount: amount,
        payment_currency: 'INR',
      },
      customer_details: { customer_id: userId },
    },
  });
  /** checkout + payment webhook for one term */
  async function buy(userId: string, planId: 'starter' | 'business', cycle: 'monthly' | 'yearly') {
    const co = await call(createCashfreeCheckout, { planId, billingCycle: cycle }, userId);
    const status = await postWebhook(paid(co.orderId, userId, getPlanPrice(planId, cycle)));
    expect(status).toBe(200);
    return co;
  }
  const subOf = async (userId: string) => {
    const user = (await db.collection('users').doc(userId).get()).data()!;
    return {
      id: user['subscriptionId'] as string,
      data: (await db.collection('subscriptions').doc(user['subscriptionId']).get()).data()!,
    };
  };

  describe('purchase', () => {
    it('monthly = 30 days, yearly = 365 days, never auto-renewing; the checkout response says so', async () => {
      const m = uniq('u');
      await seedUser(m);
      const co = await call(
        createCashfreeCheckout,
        { planId: 'starter', billingCycle: 'monthly' },
        m
      );
      expect(co).toMatchObject({ autoRenew: false, termDays: 30, renewal: false });
      expect(Math.abs(new Date(co.accessEndsAt).getTime() - (Date.now() + 30 * DAY))).toBeLessThan(
        10_000
      );
      await postWebhook(paid(co.orderId, m, getPlanPrice('starter', 'monthly')));
      const { data } = await subOf(m);
      expect(data).toMatchObject({
        planId: 'starter',
        billingCycle: 'monthly',
        status: 'active',
        termDays: 30,
        autoRenew: false,
        cancelAtPeriodEnd: false,
        provider: 'cashfree',
      });
      expect(
        Math.abs(new Date(data['currentPeriodEnd']).getTime() - (Date.now() + 30 * DAY))
      ).toBeLessThan(10_000);

      const y = uniq('u');
      await seedUser(y);
      await buy(y, 'starter', 'yearly');
      const yearly = (await subOf(y)).data;
      expect(yearly['termDays']).toBe(365);
      expect(
        Math.abs(new Date(yearly['currentPeriodEnd']).getTime() - (Date.now() + 365 * DAY))
      ).toBeLessThan(10_000);
    });
  });

  describe('renewal', () => {
    it('buying the same plan again extends from the current end date, once per order, even if the webhook repeats', async () => {
      const userId = uniq('u');
      await seedUser(userId);
      await buy(userId, 'starter', 'monthly');
      const firstEnd = new Date((await subOf(userId)).data['currentPeriodEnd']).getTime();

      const co = await call(
        createCashfreeCheckout,
        { planId: 'starter', billingCycle: 'monthly' },
        userId
      );
      expect(co.renewal).toBe(true);
      expect(Math.abs(new Date(co.accessEndsAt).getTime() - (firstEnd + 30 * DAY))).toBeLessThan(
        10_000
      );

      const payload = paid(co.orderId, userId, getPlanPrice('starter', 'monthly'));
      expect(await postWebhook(payload)).toBe(200);
      const after = (await subOf(userId)).data;
      expect(new Date(after['currentPeriodEnd']).getTime()).toBe(firstEnd + 30 * DAY);
      expect(after['renewals']).toBe(1);

      // The same delivery again, and the sibling ORDER_PAID event: access is NOT extended a second time.
      expect(await postWebhook(payload)).toBe(200);
      expect(await postWebhook({ ...payload, type: 'ORDER_PAID_WEBHOOK' })).toBe(200);
      const again = (await subOf(userId)).data;
      expect(new Date(again['currentPeriodEnd']).getTime()).toBe(firstEnd + 30 * DAY);
      expect(again['renewals']).toBe(1);
    });

    it('a renewal does not stack paid CREDITS inside the same calendar month (allowance is set, not added)', async () => {
      const userId = uniq('u');
      await seedUser(userId);
      await buy(userId, 'starter', 'monthly');
      await buy(userId, 'starter', 'monthly');
      expect((await usageOf(userId))['creditsIncluded']).toBe(getMonthlyCredits('starter'));
    });
  });

  describe('what is refused or flagged', () => {
    it('a different plan or billing period is refused while a term is live, naming the date', async () => {
      const userId = uniq('u');
      await seedUser(userId);
      await buy(userId, 'starter', 'monthly');
      await expect(
        call(createCashfreeCheckout, { planId: 'business', billingCycle: 'monthly' }, userId)
      ).rejects.toMatchObject({
        code: 'failed-precondition',
        message: expect.stringMatching(/already have access until .*renew the same plan/i),
      });
      await expect(
        call(createCashfreeCheckout, { planId: 'starter', billingCycle: 'yearly' }, userId)
      ).rejects.toMatchObject({ code: 'failed-precondition' });
    });

    it('a live term from ANOTHER provider blocks Cashfree purchases entirely', async () => {
      const userId = uniq('u');
      const subId = uniq('sub_paddle');
      await seedUser(userId, { subscriptionId: subId });
      await db
        .collection('subscriptions')
        .doc(subId)
        .set({
          subscriptionId: subId,
          userId,
          provider: 'paddle',
          planId: 'starter',
          billingCycle: 'monthly',
          status: 'active',
          currentPeriodEnd: iso(10),
        });
      await expect(
        call(createCashfreeCheckout, { planId: 'starter', billingCycle: 'monthly' }, userId)
      ).rejects.toMatchObject({
        code: 'failed-precondition',
        message: expect.stringMatching(/another payment method/i),
      });
    });

    it('two checkouts opened before either is paid: the second PAID order for another plan is flagged, not applied over the first', async () => {
      const userId = uniq('u');
      await seedUser(userId);
      const a = await call(
        createCashfreeCheckout,
        { planId: 'starter', billingCycle: 'monthly' },
        userId
      );
      const b = await call(
        createCashfreeCheckout,
        { planId: 'business', billingCycle: 'monthly' },
        userId
      );
      // (opening the second expired the first pending order; Cashfree can still deliver its payment)
      await postWebhook(paid(a.orderId, userId, getPlanPrice('starter', 'monthly')));
      const before = await usageOf(userId);
      expect(await postWebhook(paid(b.orderId, userId, getPlanPrice('business', 'monthly')))).toBe(
        200
      );
      const grant = (await db.collection('cashfree_grants').doc(b.orderId).get()).data()!;
      expect(grant).toMatchObject({ status: 'flagged', needsManualReview: true });
      expect(grant['reason']).toMatch(/live term/);
      expect((await usageOf(userId))['planId']).toBe(before['planId']);
      expect((await subOf(userId)).data['planId']).toBe('starter');
    });

    it('a refund is recorded but never changes the paid-through date or status', async () => {
      const userId = uniq('u');
      await seedUser(userId);
      const co = await buy(userId, 'starter', 'monthly');
      const before = (await subOf(userId)).data;
      const refundId = uniq('rf');
      await postWebhook({
        type: 'REFUND_STATUS_WEBHOOK',
        data: {
          order: { order_id: co.orderId, order_amount: 1, order_currency: 'INR' },
          refund: {
            refund_id: refundId,
            refund_status: 'SUCCESS',
            refund_amount: getPlanPrice('starter', 'monthly'),
          },
        },
      });
      expect(
        (await db.collection('cashfree_refunds').doc(refundId).get()).data()!['needsManualReview']
      ).toBe(true);
      const after = (await subOf(userId)).data;
      expect(after['currentPeriodEnd']).toBe(before['currentPeriodEnd']);
      expect(after['status']).toBe('active');
    });
  });

  describe('expiry', () => {
    async function seedExpiredBusinessTerm(userId: string, usedCredits: number, daysAgo = 1) {
      const subId = uniq('sub_cf');
      await seedUser(userId, { subscriptionId: subId });
      await db
        .collection('subscriptions')
        .doc(subId)
        .set({
          subscriptionId: subId,
          userId,
          provider: 'cashfree',
          planId: 'business',
          billingCycle: 'monthly',
          status: 'active',
          cancelAtPeriodEnd: false,
          currentPeriodEnd: iso(-daysAgo),
        });
      await usageRef(userId).update({
        planId: 'business',
        creditsIncluded: 1200 + 300,
        bonusCredits: 300,
        creditsUsed: usedCredits,
      });
      return subId;
    }

    it('an ended term stops granting paid credits at the moment credits are spent, before any scheduler runs', async () => {
      const userId = uniq('u');
      await seedExpiredBusinessTerm(userId, 500); // paid plan (1200) + 300 top-up, 500 used
      // Free allowance 140 + 300 top-up = 440 < 500 used -> nothing left, instead of 1000 left on the paid plan.
      await expect(
        reserveCreditsForOperation(userId, uniq('op'), 'campaign_generation', 100)
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS' });
      const usage = await usageOf(userId);
      expect(usage['planId']).toBe('free');
      expect(usage['creditsIncluded']).toBe(140 + 300);
      expect(usage['bonusCredits']).toBe(300); // top-up credits are kept
    });

    it('with credits left under the Free allowance the user can still work, as Free', async () => {
      const userId = uniq('u');
      await seedExpiredBusinessTerm(userId, 0);
      const r = await reserveCreditsForOperation(userId, uniq('op'), 'campaign_generation', 100);
      expect(r).toBeDefined();
      expect((await usageOf(userId))['planId']).toBe('free');
    });

    it('a live term is untouched by the reconciliation', async () => {
      const userId = uniq('u');
      await seedUser(userId);
      await buy(userId, 'business', 'monthly');
      await reserveCreditsForOperation(userId, uniq('op'), 'campaign_generation', 100);
      expect((await usageOf(userId))['planId']).toBe('business');
    });

    it('an ended term never blocks buying again, and the new term starts now', async () => {
      const userId = uniq('u');
      await seedExpiredBusinessTerm(userId, 0, 3); // status still 'active' in the record, end date 3 days ago
      const co = await call(
        createCashfreeCheckout,
        { planId: 'starter', billingCycle: 'monthly' },
        userId
      ); // a DIFFERENT plan is fine now
      expect(co.renewal).toBe(false);
      await postWebhook(paid(co.orderId, userId, getPlanPrice('starter', 'monthly')));
      const { data } = await subOf(userId);
      expect(data['planId']).toBe('starter');
      expect(
        Math.abs(new Date(data['currentPeriodEnd']).getTime() - (Date.now() + 30 * DAY))
      ).toBeLessThan(10_000);
      expect((await usageOf(userId))['planId']).toBe('starter');
    });

    it('the daily job ends non-renewed terms (not only cancelled ones), drops paid credits, keeps top-ups, and is idempotent', async () => {
      const userId = uniq('u');
      const subId = await seedExpiredBusinessTerm(userId, 100);
      const r1 = await expireEndedSubscriptions();
      expect(r1.expired).toBeGreaterThanOrEqual(1);
      const sub = (await db.collection('subscriptions').doc(subId).get()).data()!;
      expect(sub).toMatchObject({ status: 'canceled', endedReason: 'term_ended' });
      expect(
        (await db.collection('users').doc(userId).get()).data()!['subscriptionId']
      ).toBeUndefined();
      const usage = await usageOf(userId);
      expect(usage).toMatchObject({
        planId: 'free',
        creditsIncluded: 140 + 300,
        bonusCredits: 300,
        creditsUsed: 100,
      });
      const r2 = await expireEndedSubscriptions();
      expect((await usageOf(userId))['creditsIncluded']).toBe(440);
      expect(r2.expired).toBe(0);
    });

    it('the job leaves live terms, Paddle-managed subscriptions, and a pointer that now targets a NEWER subscription alone', async () => {
      const liveUser = uniq('u');
      await seedUser(liveUser);
      await buy(liveUser, 'starter', 'monthly');

      const paddleUser = uniq('u');
      const paddleSub = uniq('sub_paddle');
      await seedUser(paddleUser, { subscriptionId: paddleSub });
      await db
        .collection('subscriptions')
        .doc(paddleSub)
        .set({
          subscriptionId: paddleSub,
          userId: paddleUser,
          provider: 'paddle',
          planId: 'starter',
          status: 'active',
          currentPeriodEnd: iso(-2),
        });

      const renewedUser = uniq('u');
      const oldSub = uniq('sub_old');
      const newSub = uniq('sub_new');
      await seedUser(renewedUser, { subscriptionId: newSub });
      await db
        .collection('subscriptions')
        .doc(oldSub)
        .set({
          subscriptionId: oldSub,
          userId: renewedUser,
          provider: 'cashfree',
          planId: 'starter',
          billingCycle: 'monthly',
          status: 'active',
          currentPeriodEnd: iso(-2),
        });
      await db
        .collection('subscriptions')
        .doc(newSub)
        .set({
          subscriptionId: newSub,
          userId: renewedUser,
          provider: 'cashfree',
          planId: 'business',
          billingCycle: 'monthly',
          status: 'active',
          currentPeriodEnd: iso(20),
        });

      await expireEndedSubscriptions();
      expect((await subOf(liveUser)).data['status']).toBe('active');
      expect((await db.collection('subscriptions').doc(paddleSub).get()).data()!['status']).toBe(
        'active'
      );
      expect((await db.collection('subscriptions').doc(oldSub).get()).data()!['status']).toBe(
        'canceled'
      );
      expect((await db.collection('users').doc(renewedUser).get()).data()!['subscriptionId']).toBe(
        newSub
      ); // kept
    });
  });
});
