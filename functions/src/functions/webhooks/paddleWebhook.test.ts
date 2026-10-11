/**
 * paddleWebhook — real Firestore emulator. Self-skips without FIRESTORE_EMULATOR_HOST.
 * Only Paddle's network is absent: events are hand-built (camelCase, as the SDK's
 * unmarshal produces) and dispatched through processPaddleEvent; one test goes through
 * the real onRequest handler with a genuinely signed raw body.
 *
 * Env vars must be set BEFORE getEnvConfig() first reads them (it caches).
 */
const WEBHOOK_SECRET = 'pdl_ntfset_test_secret_for_unit_tests';
process.env['ACTIVE_PAYMENT_PROVIDER'] = 'paddle'; // these tests exercise the Paddle path, which is inert unless Paddle is the active provider
process.env['PADDLE_API_KEY'] = 'pdl_sdbx_apikey_test_only';
process.env['PADDLE_WEBHOOK_SECRET'] = WEBHOOK_SECRET;
process.env['PADDLE_ENVIRONMENT'] = 'sandbox';
process.env['PADDLE_PRICE_ID_STARTER_MONTHLY'] = 'pri_starter_m';
process.env['PADDLE_PRICE_ID_STARTER_YEARLY'] = 'pri_starter_y';
process.env['PADDLE_PRICE_ID_BUSINESS_MONTHLY'] = 'pri_business_m';
process.env['PADDLE_PRICE_ID_PRO_MONTHLY'] = 'pri_pro_m';
process.env['PADDLE_PRICE_ID_PRO_YEARLY'] = 'pri_pro_y';
process.env['PADDLE_PRICE_ID_AGENCY_MONTHLY'] = 'pri_agency_m';
process.env['PADDLE_PRICE_ID_PACK_500'] = 'pri_pack_500';
process.env['PADDLE_PRICE_ID_PACK_1200'] = 'pri_pack_1200';
process.env['PADDLE_PRICE_ID_PACK_3000'] = 'pri_pack_3000';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { paddleWebhook, processPaddleEvent } from './paddleWebhook';
import { resolveEntitledPlan } from '../../services/billing';
import { reserveCreditsForOperation } from '../../services/usageControl';
import { getUsageDocId } from '../../services/firestore';
import { PRICING } from '../../config/pricing';

const FREE_CREDITS = PRICING.subscriptionTiers.free.monthlyCredits;

const NOW = new Date();
const periodStart = new Date(NOW.getFullYear(), NOW.getMonth(), 1);
const FUTURE = new Date(Date.now() + 20 * 86400_000).toISOString();

let seq = 0;
const uniq = (p: string) => `${p}_${Date.now()}_${++seq}`;

function txnEvent(over: {
  id: string;
  priceId: string;
  userId?: string | null;
  customerId?: string;
  subscriptionId?: string | null;
  origin?: string;
  occurredAt?: string;
  total?: string;
}) {
  return {
    eventId: uniq('evt'),
    notificationId: uniq('ntf'),
    eventType: 'transaction.completed',
    occurredAt: over.occurredAt ?? new Date().toISOString(),
    data: {
      id: over.id,
      status: 'completed',
      customerId: over.customerId ?? 'ctm_default',
      customData: over.userId === null ? null : { firebaseUid: over.userId },
      currencyCode: 'INR',
      origin: over.origin ?? 'web',
      subscriptionId: over.subscriptionId ?? null,
      billingPeriod: over.subscriptionId
        ? { startsAt: new Date().toISOString(), endsAt: FUTURE }
        : null,
      items: [{ price: { id: over.priceId }, quantity: 1 }],
      details: { totals: { total: over.total ?? '99900' } },
    },
  } as any;
}

function subEvent(
  type: string,
  over: {
    id: string;
    priceId: string;
    userId?: string;
    customerId?: string;
    status?: string;
    scheduledChange?: { action: string } | null;
    occurredAt?: string;
  }
) {
  return {
    eventId: uniq('evt'),
    notificationId: uniq('ntf'),
    eventType: type,
    occurredAt: over.occurredAt ?? new Date().toISOString(),
    data: {
      id: over.id,
      status: over.status ?? 'active',
      customerId: over.customerId ?? 'ctm_default',
      customData: over.userId ? { firebaseUid: over.userId } : null,
      canceledAt: type === 'subscription.canceled' ? new Date().toISOString() : null,
      currentBillingPeriod: { startsAt: new Date().toISOString(), endsAt: FUTURE },
      scheduledChange: over.scheduledChange ?? null,
      items: [{ price: { id: over.priceId } }],
    },
  } as any;
}

describeIfEmulator('paddleWebhook (Firestore emulator)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  async function seedUser(userId: string, customerId = 'ctm_default') {
    await db
      .collection('users')
      .doc(userId)
      .set({ userId, email: `${userId}@example.com`, paddleCustomerId: customerId });
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

  async function seedPendingPack(txnId: string, userId: string) {
    await db.collection('transactions').doc(txnId).set({
      transactionId: txnId,
      userId,
      type: 'credit_purchase',
      amount: 500,
      currency: 'INR',
      balanceAfter: 0,
      status: 'pending',
      provider: 'paddle',
    });
  }

  describe('credit packs', () => {
    it('grants exactly once and records an auditable ledger + transaction', async () => {
      const userId = uniq('u');
      const txnId = uniq('txn');
      await seedUser(userId);
      await seedPendingPack(txnId, userId);

      const ev = txnEvent({ id: txnId, priceId: 'pri_pack_500', userId });
      await processPaddleEvent(ev);
      await processPaddleEvent(ev); // retry of same delivery
      await processPaddleEvent(txnEvent({ id: txnId, priceId: 'pri_pack_500', userId })); // different event ID, same txn

      const usage = await usageOf(userId);
      expect(usage['bonusCredits']).toBe(500);
      expect(usage['creditsIncluded']).toBe(FREE_CREDITS + 500); // free allowance + 500 pack

      const txn = (await db.collection('transactions').doc(txnId).get()).data()!;
      expect(txn['status']).toBe('completed');
      expect(txn['balanceAfter']).toBe(FREE_CREDITS + 500);
      const grant = (await db.collection('paddle_grants').doc(txnId).get()).data()!;
      expect(grant['status']).toBe('granted');
      expect(grant['credits']).toBe(500);
    });

    it('grants once under concurrent duplicate delivery', async () => {
      const userId = uniq('u');
      const txnId = uniq('txn');
      await seedUser(userId);
      await seedPendingPack(txnId, userId);

      await Promise.all(
        [1, 2, 3, 4].map(() =>
          processPaddleEvent(txnEvent({ id: txnId, priceId: 'pri_pack_500', userId }))
        )
      );
      expect((await usageOf(userId))['bonusCredits']).toBe(500);
    });

    it('credits come from the price ID, not custom_data or the paid amount', async () => {
      const userId = uniq('u');
      const txnId = uniq('txn');
      await seedUser(userId);
      await seedPendingPack(txnId, userId);
      const ev = txnEvent({ id: txnId, priceId: 'pri_pack_1200', userId, total: '1' });
      ev.data.customData.credits = 999999;
      await processPaddleEvent(ev);
      expect((await usageOf(userId))['bonusCredits']).toBe(1200);
    });

    it('refuses and flags a pack with no pending checkout record', async () => {
      const userId = uniq('u');
      const txnId = uniq('txn');
      await seedUser(userId);
      await processPaddleEvent(txnEvent({ id: txnId, priceId: 'pri_pack_500', userId }));
      expect((await usageOf(userId))['bonusCredits']).toBeUndefined();
      expect((await db.collection('paddle_grants').doc(txnId).get()).data()!['status']).toBe(
        'flagged'
      );
    });

    it('refuses a pack whose pending record belongs to another user', async () => {
      const victim = uniq('victim');
      const attacker = uniq('attacker');
      const txnId = uniq('txn');
      await seedUser(victim, 'ctm_v');
      await seedUser(attacker, 'ctm_a');
      await seedPendingPack(txnId, victim);
      await processPaddleEvent(
        txnEvent({ id: txnId, priceId: 'pri_pack_500', userId: attacker, customerId: 'ctm_a' })
      );
      expect((await usageOf(attacker))['bonusCredits']).toBeUndefined();
      expect((await usageOf(victim))['bonusCredits']).toBeUndefined();
      expect((await db.collection('paddle_grants').doc(txnId).get()).data()!['status']).toBe(
        'flagged'
      );
    });

    it('refuses when custom_data user and stored Paddle customer disagree', async () => {
      const userId = uniq('u');
      const txnId = uniq('txn');
      await seedUser(userId, 'ctm_real');
      await seedPendingPack(txnId, userId);
      await processPaddleEvent(
        txnEvent({ id: txnId, priceId: 'pri_pack_500', userId, customerId: 'ctm_other' })
      );
      expect((await usageOf(userId))['bonusCredits']).toBeUndefined();
    });

    it('top-up credits are actually spendable by the existing credit enforcement', async () => {
      const userId = uniq('u');
      const txnId = uniq('txn');
      await seedUser(userId);
      // Free user who has already spent 100 of 140: 40 left, a 140-credit campaign is rejected
      await db
        .collection('usage')
        .doc(getUsageDocId(userId, periodStart))
        .update({ creditsUsed: 100 });
      await expect(
        reserveCreditsForOperation(userId, uniq('op'), 'campaign_generation', 140)
      ).rejects.toMatchObject({ code: expect.any(String) });

      await seedPendingPack(txnId, userId);
      await processPaddleEvent(txnEvent({ id: txnId, priceId: 'pri_pack_500', userId }));

      const reservation = await reserveCreditsForOperation(
        userId,
        uniq('op'),
        'campaign_generation',
        140
      );
      expect(reservation.creditsReserved).toBe(140);
      expect(reservation.creditsRemaining).toBe(FREE_CREDITS + 500 - 100 - 140);
    });
  });

  describe('subscriptions', () => {
    it('first purchase: entitlement applied once regardless of event order or replays', async () => {
      const userId = uniq('u');
      const subId = uniq('sub');
      const txnId = uniq('txn');
      await seedUser(userId);

      const events = [
        subEvent('subscription.created', { id: subId, priceId: 'pri_starter_m', userId }),
        txnEvent({ id: txnId, priceId: 'pri_starter_m', userId, subscriptionId: subId }),
        subEvent('subscription.activated', { id: subId, priceId: 'pri_starter_m', userId }),
      ];
      for (const e of [events[1], events[0], events[2], events[1], events[2]])
        await processPaddleEvent(e);

      const usage = await usageOf(userId);
      expect(usage['planId']).toBe('starter');
      expect(usage['creditsIncluded']).toBe(500); // set, not incremented
      const sub = (await db.collection('subscriptions').doc(subId).get()).data()!;
      expect(sub).toMatchObject({
        status: 'active',
        planId: 'starter',
        provider: 'paddle',
        userId,
        billingCycle: 'monthly',
      });
      expect((await db.collection('users').doc(userId).get()).data()!['subscriptionId']).toBe(
        subId
      );
      expect((await db.collection('transactions').doc(txnId).get()).data()!['status']).toBe(
        'completed'
      );
    });

    it('works when only transaction.completed arrives (identity from customer ID, no custom_data)', async () => {
      const userId = uniq('u');
      const subId = uniq('sub');
      const onlyTxnCustomerId = uniq('ctm_only_txn');
      await seedUser(userId, onlyTxnCustomerId);
      await processPaddleEvent(
        txnEvent({
          id: uniq('txn'),
          priceId: 'pri_pro_m',
          userId: null,
          customerId: onlyTxnCustomerId,
          subscriptionId: subId,
        })
      );
      expect((await usageOf(userId))['planId']).toBe('pro');
    });

    it('renewal: identifies user via the stored subscription, is idempotent, keeps top-up credits', async () => {
      const userId = uniq('u');
      const subId = uniq('sub');
      await seedUser(userId);
      await processPaddleEvent(
        txnEvent({ id: uniq('txn'), priceId: 'pri_business_m', userId, subscriptionId: subId })
      );

      const packTxn = uniq('txn');
      await seedPendingPack(packTxn, userId);
      await processPaddleEvent(txnEvent({ id: packTxn, priceId: 'pri_pack_500', userId }));

      // Recurring transaction: no custom_data at all.
      const renewalId = uniq('txn');
      const renewal = txnEvent({
        id: renewalId,
        priceId: 'pri_business_m',
        userId: null,
        subscriptionId: subId,
        origin: 'subscription_recurring',
      });
      await processPaddleEvent(renewal);
      await processPaddleEvent(renewal);

      const usage = await usageOf(userId);
      expect(usage['planId']).toBe('business');
      expect(usage['bonusCredits']).toBe(500);
      expect(usage['creditsIncluded']).toBe(1200 + 500);
      const desc = async (id: string) =>
        (await db.collection('transactions').doc(id).get()).data()!['description'];
      expect(await desc(renewalId)).toBe('Business plan (monthly) — renewal');
      expect((await db.collection('paddle_grants').doc(renewalId).get()).data()!['origin']).toBe(
        'subscription_recurring'
      );
      const t = (await db.collection('transactions').doc(renewalId).get()).data()!;
      expect(t).toMatchObject({
        type: 'subscription',
        status: 'completed',
        provider: 'paddle',
        userId,
      });
    });

    it('plan change (subscription_update) moves the entitlement', async () => {
      const userId = uniq('u');
      const subId = uniq('sub');
      await seedUser(userId);
      await processPaddleEvent(
        txnEvent({ id: uniq('txn'), priceId: 'pri_starter_m', userId, subscriptionId: subId })
      );
      await processPaddleEvent(
        txnEvent({
          id: uniq('txn'),
          priceId: 'pri_agency_m',
          userId,
          subscriptionId: subId,
          origin: 'subscription_update',
        })
      );
      expect((await usageOf(userId))['planId']).toBe('agency');
      expect((await db.collection('subscriptions').doc(subId).get()).data()!['planId']).toBe(
        'agency'
      );
    });

    it('scheduled cancel sets cancelAtPeriodEnd, resume clears it, cancellation keeps earned credits', async () => {
      const userId = uniq('u');
      const subId = uniq('sub');
      await seedUser(userId);
      await processPaddleEvent(
        txnEvent({ id: uniq('txn'), priceId: 'pri_pro_m', userId, subscriptionId: subId })
      );
      const subRef = db.collection('subscriptions').doc(subId);

      await processPaddleEvent(
        subEvent('subscription.updated', {
          id: subId,
          priceId: 'pri_pro_m',
          userId,
          scheduledChange: { action: 'cancel' },
          occurredAt: new Date(Date.now() + 1000).toISOString(),
        })
      );
      expect((await subRef.get()).data()!['cancelAtPeriodEnd']).toBe(true);

      await processPaddleEvent(
        subEvent('subscription.updated', {
          id: subId,
          priceId: 'pri_pro_m',
          userId,
          scheduledChange: null,
          occurredAt: new Date(Date.now() + 2000).toISOString(),
        })
      );
      expect((await subRef.get()).data()!['cancelAtPeriodEnd']).toBe(false);

      await processPaddleEvent(
        subEvent('subscription.canceled', {
          id: subId,
          priceId: 'pri_pro_m',
          userId,
          status: 'canceled',
          occurredAt: new Date(Date.now() + 3000).toISOString(),
        })
      );
      expect((await subRef.get()).data()!['status']).toBe('canceled');
      expect((await db.collection('users').doc(userId).get()).data()!['subscriptionId']).toBeNull();
      // Already-granted credits for the period are not clawed back.
      expect((await usageOf(userId))['planId']).toBe('pro');
    });

    it('ignores stale (out-of-order) subscription events', async () => {
      const userId = uniq('u');
      const subId = uniq('sub');
      await seedUser(userId);
      await processPaddleEvent(
        txnEvent({ id: uniq('txn'), priceId: 'pri_pro_m', userId, subscriptionId: subId })
      );
      const later = new Date(Date.now() + 60_000).toISOString();
      await processPaddleEvent(
        subEvent('subscription.updated', {
          id: subId,
          priceId: 'pri_pro_m',
          userId,
          scheduledChange: { action: 'cancel' },
          occurredAt: later,
        })
      );
      await processPaddleEvent(
        subEvent('subscription.updated', {
          id: subId,
          priceId: 'pri_pro_m',
          userId,
          scheduledChange: null,
          occurredAt: new Date(Date.now() + 1000).toISOString(),
        })
      );
      expect(
        (await db.collection('subscriptions').doc(subId).get()).data()!['cancelAtPeriodEnd']
      ).toBe(true);
    });

    it('a late (retried) payment event after cancellation never resurrects the subscription', async () => {
      const userId = uniq('u');
      const subId = uniq('sub');
      await seedUser(userId);
      await processPaddleEvent(
        txnEvent({ id: uniq('txn'), priceId: 'pri_pro_m', userId, subscriptionId: subId })
      );
      await processPaddleEvent(
        subEvent('subscription.canceled', {
          id: subId,
          priceId: 'pri_pro_m',
          userId,
          status: 'canceled',
          occurredAt: new Date(Date.now() + 60_000).toISOString(),
        })
      );
      // A renewal payment whose delivery failed earlier is retried by Paddle after the cancel.
      await processPaddleEvent(
        txnEvent({
          id: uniq('txn'),
          priceId: 'pri_pro_m',
          userId,
          subscriptionId: subId,
          origin: 'subscription_recurring',
          occurredAt: new Date(Date.now() + 1000).toISOString(),
        })
      );
      expect((await db.collection('subscriptions').doc(subId).get()).data()!['status']).toBe(
        'canceled'
      );
      expect((await db.collection('users').doc(userId).get()).data()!['subscriptionId']).toBeNull();
    });

    it('refund: recorded once, flagged for review, transaction marked, credits untouched, replay-safe', async () => {
      const userId = uniq('u');
      const subId = uniq('sub');
      const txnId = uniq('txn');
      await seedUser(userId);
      await processPaddleEvent(
        txnEvent({ id: txnId, priceId: 'pri_pro_m', userId, subscriptionId: subId })
      );
      const creditsBefore = (await usageOf(userId))['creditsIncluded'];

      const adjustment = (status: string, occurredAt: string, id = 'adj_' + txnId) =>
        ({
          eventId: uniq('evt'),
          notificationId: uniq('ntf'),
          eventType: 'adjustment.updated',
          occurredAt,
          data: {
            id,
            action: 'refund',
            status,
            transactionId: txnId,
            subscriptionId: subId,
            customerId: 'ctm_default',
            currencyCode: 'INR',
            totals: { total: '99900' },
          },
        }) as any;

      const t1 = new Date(Date.now() + 1000).toISOString();
      const t2 = new Date(Date.now() + 2000).toISOString();
      await processPaddleEvent(adjustment('pending_approval', t1));
      const adjRef = db.collection('paddle_adjustments').doc('adj_' + txnId);
      expect((await adjRef.get()).data()!['needsManualReview']).toBe(false);

      await processPaddleEvent(adjustment('approved', t2));
      await processPaddleEvent(adjustment('approved', t2)); // replay
      await processPaddleEvent(adjustment('pending_approval', t1)); // stale, must not undo
      const adj = (await adjRef.get()).data()!;
      expect(adj['status']).toBe('approved');
      expect(adj['needsManualReview']).toBe(true);
      expect(adj['userId']).toBe(userId);
      const txn = (await db.collection('transactions').doc(txnId).get()).data()!;
      expect(txn['reconciliation']).toMatchObject({
        state: 'refunded',
        adjustmentId: adj['adjustmentId'],
      });
      // No policy exists for clawing back credits: nothing is silently revoked.
      expect((await usageOf(userId))['creditsIncluded']).toBe(creditsBefore);
    });

    it('payment failure fails a pending record but never a completed one or the entitlement', async () => {
      const userId = uniq('u');
      const pendingId = uniq('txn');
      await seedUser(userId);
      await seedPendingPack(pendingId, userId);
      await processPaddleEvent({
        ...txnEvent({ id: pendingId, priceId: 'pri_pack_500', userId }),
        eventType: 'transaction.payment_failed',
      });
      expect((await db.collection('transactions').doc(pendingId).get()).data()!['status']).toBe(
        'failed'
      );

      const doneId = uniq('txn');
      await seedPendingPack(doneId, userId);
      await processPaddleEvent(txnEvent({ id: doneId, priceId: 'pri_pack_500', userId }));
      await processPaddleEvent({
        ...txnEvent({ id: doneId, priceId: 'pri_pack_500', userId }),
        eventType: 'transaction.payment_failed',
      });
      expect((await db.collection('transactions').doc(doneId).get()).data()!['status']).toBe(
        'completed'
      );
    });

    it('ignores transactions for prices Mitra does not recognise', async () => {
      const userId = uniq('u');
      await seedUser(userId);
      await processPaddleEvent(
        txnEvent({ id: uniq('txn'), priceId: 'pri_unknown', userId, subscriptionId: uniq('sub') })
      );
      expect((await usageOf(userId))['planId']).toBe('free');
    });
  });

  describe('resolveEntitledPlan (new period must not demote a subscriber)', () => {
    async function seedSub(userId: string, over: Record<string, unknown>) {
      const subId = uniq('sub');
      await db
        .collection('subscriptions')
        .doc(subId)
        .set({ subscriptionId: subId, userId, ...over });
      await db
        .collection('users')
        .doc(userId)
        .set({ userId, subscriptionId: subId }, { merge: true });
    }

    it('yearly subscriber stays on their plan in later months of the year', async () => {
      const userId = uniq('u');
      await seedSub(userId, {
        planId: 'pro',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 200 * 86400_000).toISOString(),
      });
      expect(await resolveEntitledPlan(userId)).toBe('pro');
    });

    it('cancel-at-period-end keeps the plan until the period ends, then Free', async () => {
      const a = uniq('u');
      await seedSub(a, {
        planId: 'business',
        status: 'active',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: FUTURE,
      });
      expect(await resolveEntitledPlan(a)).toBe('business');

      const b = uniq('u');
      await seedSub(b, {
        planId: 'business',
        status: 'active',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: new Date(Date.now() - 1000).toISOString(),
      });
      expect(await resolveEntitledPlan(b)).toBe('free');
    });

    it('canceled / no subscription => Free', async () => {
      const a = uniq('u');
      await seedSub(a, { planId: 'agency', status: 'canceled', currentPeriodEnd: FUTURE });
      expect(await resolveEntitledPlan(a)).toBe('free');
      expect(await resolveEntitledPlan(uniq('nobody'))).toBe('free');
    });
  });

  describe('HTTP handler', () => {
    function sign(body: string, secret = WEBHOOK_SECRET) {
      const ts = Math.floor(Date.now() / 1000);
      const h1 = crypto.createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex');
      return `ts=${ts};h1=${h1}`;
    }
    function call(rawBody: string, signature: string | undefined) {
      const req: any = {
        method: 'POST',
        headers: signature ? { 'paddle-signature': signature } : {},
        rawBody: Buffer.from(rawBody),
        body: JSON.parse(rawBody),
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
      return (paddleWebhook as any)(req, res).then(() => res._status as number);
    }

    function wireEvent(userId: string, txnId: string) {
      return JSON.stringify({
        event_id: uniq('evt'),
        event_type: 'transaction.completed',
        occurred_at: new Date().toISOString(),
        notification_id: uniq('ntf'),
        data: {
          id: txnId,
          status: 'completed',
          customer_id: 'ctm_default',
          custom_data: { firebaseUid: userId },
          currency_code: 'INR',
          origin: 'web',
          subscription_id: null,
          payments: [],
          items: [
            {
              price: {
                id: 'pri_pack_500',
                product_id: 'pro_test',
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

    it('rejects a missing or wrong signature and grants nothing', async () => {
      const userId = uniq('u');
      const txnId = uniq('txn');
      await seedUser(userId);
      await seedPendingPack(txnId, userId);
      const body = wireEvent(userId, txnId);
      expect(await call(body, undefined)).toBe(400);
      expect(await call(body, sign(body, 'wrong-secret'))).toBe(400);
      expect((await usageOf(userId))['bonusCredits']).toBeUndefined();
    });

    it('accepts a correctly signed raw body, grants once, acks duplicates with 200', async () => {
      const userId = uniq('u');
      const txnId = uniq('txn');
      await seedUser(userId);
      await seedPendingPack(txnId, userId);
      const body = wireEvent(userId, txnId);
      expect(await call(body, sign(body))).toBe(200);
      expect(await call(body, sign(body))).toBe(200);
      expect((await usageOf(userId))['bonusCredits']).toBe(500);
    });
  });
});
