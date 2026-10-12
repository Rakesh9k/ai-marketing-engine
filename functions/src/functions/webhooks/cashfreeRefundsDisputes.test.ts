/**
 * Refund / dispute baseline (Cashfree). Emulator-backed. Payload shapes follow Cashfree's webhook docs as read on
 * 2026-10-12 (refund: data.refund.{refund_id,order_id,refund_status,refund_amount}; dispute: data.dispute +
 * data.order_details); they are NOT yet confirmed against real sandbox deliveries.
 */
process.env['CASHFREE_APP_ID'] = 'test_cashfree_app_id';
process.env['CASHFREE_SECRET_KEY'] = 'test_cashfree_secret_key_12345';
process.env['CASHFREE_WEBHOOK_SECRET'] = 'test_cashfree_secret_key_12345';
process.env['CASHFREE_ENVIRONMENT'] = 'sandbox';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import * as admin from 'firebase-admin';
import { processCashfreeEvent } from './cashfreeWebhook';
import { requestRefund } from '../subscriptions/requestRefund';
import { collectBillingReview } from '../../services/billingReview';
import { getUsageDocId } from '../../services/firestore';
import { PRICING, getPlanPrice } from '../../config/pricing';

const FREE = PRICING.subscriptionTiers.free.monthlyCredits;
const NOW = new Date();
const periodStart = new Date(NOW.getFullYear(), NOW.getMonth(), 1);
let seq = 0;
const uniq = (p: string) => `${p}_rf_${Date.now()}_${++seq}`;
const PACK = 500;
const PACK_PRICE = 999;

describeIfEmulator('Cashfree refunds and disputes (baseline rules)', () => {
  const db = admin.firestore();
  afterAll(async () => {
    await admin.app().delete();
  });

  async function seedUser(userId: string, usageExtra: Record<string, unknown> = {}) {
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
        creditsIncluded: FREE,
        campaignsCreated: 0,
        ...usageExtra,
      });
  }
  const usageOf = async (u: string) =>
    (await db.collection('usage').doc(getUsageDocId(u, periodStart)).get()).data()!;

  async function pay(
    orderId: string,
    userId: string,
    kind: 'credit_pack' | 'subscription',
    opts: { planId?: string; price?: number } = {}
  ) {
    const planId = opts.planId ?? 'starter';
    const price =
      opts.price ??
      (kind === 'credit_pack' ? PACK_PRICE : getPlanPrice(planId as 'starter', 'monthly'));
    await db
      .collection('transactions')
      .doc(orderId)
      .set({
        transactionId: orderId,
        userId,
        type: kind === 'credit_pack' ? 'credit_purchase' : 'subscription',
        amount: price,
        currency: 'INR',
        status: 'pending',
        provider: 'cashfree',
        metadata: {
          kind,
          planId: kind === 'subscription' ? planId : null,
          billingCycle: 'monthly',
          credits: PACK,
          priceINR: price,
        },
      });
    await processCashfreeEvent({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: orderId, order_amount: price, order_currency: 'INR' },
        payment: {
          cf_payment_id: `cfp_${orderId}`,
          payment_status: 'SUCCESS',
          payment_amount: price,
          payment_currency: 'INR',
        },
        customer_details: { customer_id: userId },
      },
    });
    return price;
  }

  const refundEvent = (refundId: string, orderId: string, amount: number, status = 'SUCCESS') => ({
    type: 'REFUND_STATUS_WEBHOOK',
    // Real shape: order_id lives INSIDE data.refund; there is no data.order.
    data: {
      refund: {
        refund_id: refundId,
        order_id: orderId,
        refund_status: status,
        refund_amount: amount,
      },
    },
  });
  const auditFor = async (refId: string) =>
    (await db.collection('billing_audit').where('refId', '==', refId).get()).docs.map((d) =>
      d.data()
    );

  describe('credit pack refunds', () => {
    it('a full refund removes the unspent pack credits, once, and keeps the audit trail', async () => {
      const userId = uniq('u');
      const orderId = uniq('ord');
      await seedUser(userId);
      await pay(orderId, userId, 'credit_pack');
      expect((await usageOf(userId))['bonusCredits']).toBe(PACK);

      const ev = refundEvent(uniq('rf'), orderId, PACK_PRICE);
      await processCashfreeEvent(ev);
      await processCashfreeEvent(ev); // duplicate delivery

      const u = await usageOf(userId);
      expect(u['bonusCredits']).toBe(0);
      expect(u['creditsIncluded']).toBe(FREE);
      const refund = (
        await db.collection('cashfree_refunds').doc(ev.data.refund.refund_id).get()
      ).data()!;
      expect(refund).toMatchObject({ counted: true, needsManualReview: false });
      expect(refund['adjustment']).toMatchObject({ action: 'revoke_credits', revoked: PACK });
      const txn = (await db.collection('transactions').doc(orderId).get()).data()!;
      expect(txn['refundedAmount']).toBe(PACK_PRICE); // counted once, not twice
      expect(txn['reconciliation']).toMatchObject({ state: 'refunded' });
      const trail = await auditFor(ev.data.refund.refund_id);
      expect(trail.filter((a) => a['kind'] === 'refund_applied')).toHaveLength(1);
    });

    it('never claws back credits that were already spent', async () => {
      const userId = uniq('u');
      const orderId = uniq('ord');
      await seedUser(userId);
      await pay(orderId, userId, 'credit_pack');
      // 300 credits used (a generated campaign): allowance is FREE + 500, so only the unspent part can go.
      await db
        .collection('usage')
        .doc(getUsageDocId(userId, periodStart))
        .update({ creditsUsed: FREE + 300 });
      const ev = refundEvent(uniq('rf'), orderId, PACK_PRICE);
      await processCashfreeEvent(ev);
      const u = await usageOf(userId);
      expect(u['creditsUsed']).toBe(FREE + 300); // untouched
      expect(u['bonusCredits']).toBe(300); // 500 - 200 unspent removed
      expect(u['creditsIncluded']).toBe(FREE + 300);
      const refund = (
        await db.collection('cashfree_refunds').doc(ev.data.refund.refund_id).get()
      ).data()!;
      expect(refund['adjustment']).toMatchObject({ revoked: 200, keptBecauseSpent: 300 });
    });

    it('a partial refund changes nothing automatically and is flagged; completing it later applies once', async () => {
      const userId = uniq('u');
      const orderId = uniq('ord');
      await seedUser(userId);
      await pay(orderId, userId, 'credit_pack');
      const r1 = refundEvent(uniq('rf'), orderId, 400);
      await processCashfreeEvent(r1);
      expect((await usageOf(userId))['bonusCredits']).toBe(PACK);
      const first = (
        await db.collection('cashfree_refunds').doc(r1.data.refund.refund_id).get()
      ).data()!;
      expect(first).toMatchObject({ needsManualReview: true });
      expect(first['adjustment']).toMatchObject({ action: 'review' });

      const r2 = refundEvent(uniq('rf'), orderId, PACK_PRICE - 400);
      await processCashfreeEvent(r2);
      expect((await usageOf(userId))['bonusCredits']).toBe(0);
      const second = (
        await db.collection('cashfree_refunds').doc(r2.data.refund.refund_id).get()
      ).data()!;
      expect(second['adjustment']).toMatchObject({ action: 'revoke_credits' });
      // A later duplicate of either changes nothing.
      await processCashfreeEvent(r1);
      await processCashfreeEvent(r2);
      expect((await usageOf(userId))['bonusCredits']).toBe(0);
      expect(
        (await db.collection('transactions').doc(orderId).get()).data()!['refundedAmount']
      ).toBe(PACK_PRICE);
    });
  });

  describe('status handling', () => {
    it('a non-success status changes nothing; a late PENDING never undoes a SUCCESS', async () => {
      const userId = uniq('u');
      const orderId = uniq('ord');
      await seedUser(userId);
      await pay(orderId, userId, 'credit_pack');
      const id = uniq('rf');
      await processCashfreeEvent(refundEvent(id, orderId, PACK_PRICE, 'PENDING'));
      expect((await usageOf(userId))['bonusCredits']).toBe(PACK);
      await processCashfreeEvent(refundEvent(id, orderId, PACK_PRICE, 'SUCCESS'));
      expect((await usageOf(userId))['bonusCredits']).toBe(0);
      await processCashfreeEvent(refundEvent(id, orderId, PACK_PRICE, 'PENDING')); // out of order
      const doc = (await db.collection('cashfree_refunds').doc(id).get()).data()!;
      expect(doc['status']).toBe('SUCCESS');
      expect((await usageOf(userId))['bonusCredits']).toBe(0);
    });

    it('CANCELLED never revokes anything', async () => {
      const userId = uniq('u');
      const orderId = uniq('ord');
      await seedUser(userId);
      await pay(orderId, userId, 'credit_pack');
      await processCashfreeEvent(refundEvent(uniq('rf'), orderId, PACK_PRICE, 'CANCELLED'));
      expect((await usageOf(userId))['bonusCredits']).toBe(PACK);
    });

    it('legacy payload shape (order_id in data.order) is still understood', async () => {
      const userId = uniq('u');
      const orderId = uniq('ord');
      await seedUser(userId);
      await pay(orderId, userId, 'credit_pack');
      await processCashfreeEvent({
        type: 'REFUND_STATUS_WEBHOOK',
        data: {
          order: { order_id: orderId, order_amount: PACK_PRICE, order_currency: 'INR' },
          refund: { refund_id: uniq('rf'), refund_status: 'SUCCESS', refund_amount: PACK_PRICE },
        },
      });
      expect((await usageOf(userId))['bonusCredits']).toBe(0);
    });
  });

  describe('subscription refunds', () => {
    const subOf = async (userId: string) =>
      (await db.collection('subscriptions').doc(`sub_cf_${userId}_starter`).get()).data()!;

    it('a full refund of the only term ends paid access now and returns the account to Free', async () => {
      const userId = uniq('u');
      const orderId = uniq('ord');
      await seedUser(userId);
      await pay(orderId, userId, 'subscription');
      expect((await usageOf(userId))['planId']).toBe('starter');

      await processCashfreeEvent(
        refundEvent(uniq('rf'), orderId, getPlanPrice('starter', 'monthly'))
      );
      const sub = await subOf(userId);
      expect(sub['status']).toBe('refunded');
      expect(new Date(sub['currentPeriodEnd']).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
      expect((await usageOf(userId))['planId']).toBe('free');
    });

    it("refunding one of two stacked renewals removes only that order's days and keeps access", async () => {
      const userId = uniq('u');
      const o1 = uniq('ord');
      const o2 = uniq('ord');
      await seedUser(userId);
      await pay(o1, userId, 'subscription');
      await pay(o2, userId, 'subscription'); // renewal: extends from the current end
      const before = new Date((await subOf(userId))['currentPeriodEnd']).getTime();
      expect(before - Date.now()).toBeGreaterThan(55 * 86_400_000);

      await processCashfreeEvent(refundEvent(uniq('rf'), o2, getPlanPrice('starter', 'monthly')));
      const sub = await subOf(userId);
      expect(sub['status']).toBe('active');
      expect(before - new Date(sub['currentPeriodEnd']).getTime()).toBe(30 * 86_400_000);
      expect((await usageOf(userId))['planId']).toBe('starter');
    });

    it('does not reverse the same order twice (a second refund id for the same order)', async () => {
      const userId = uniq('u');
      const o1 = uniq('ord');
      const o2 = uniq('ord');
      await seedUser(userId);
      await pay(o1, userId, 'subscription');
      await pay(o2, userId, 'subscription');
      const price = getPlanPrice('starter', 'monthly');
      await processCashfreeEvent(refundEvent(uniq('rf'), o2, price));
      const afterFirst = (await subOf(userId))['currentPeriodEnd'];
      await processCashfreeEvent(refundEvent(uniq('rf'), o2, price)); // different refund id, same order
      expect((await subOf(userId))['currentPeriodEnd']).toBe(afterFirst);
    });
  });

  describe('payment that could not be applied, and unknown orders', () => {
    it('a refund of an order that was never granted resolves the manual-review flag', async () => {
      const userId = uniq('u');
      const orderId = uniq('ord');
      await seedUser(userId);
      await db
        .collection('transactions')
        .doc(orderId)
        .set({
          transactionId: orderId,
          userId,
          status: 'pending',
          provider: 'cashfree',
          metadata: { kind: 'credit_pack', credits: PACK, priceINR: PACK_PRICE },
        });
      await db.collection('cashfree_grants').doc(orderId).set({
        orderId,
        userId,
        status: 'flagged',
        reason: 'the user already has a live term on another subscription',
        needsManualReview: true,
      });
      expect((await collectBillingReview()).some((i) => i.refId === orderId)).toBe(true);

      await processCashfreeEvent(refundEvent(uniq('rf'), orderId, PACK_PRICE));
      const grant = (await db.collection('cashfree_grants').doc(orderId).get()).data()!;
      expect(grant).toMatchObject({ needsManualReview: false, resolution: 'refunded' });
      expect((await collectBillingReview()).some((i) => i.refId === orderId)).toBe(false);
      expect((await usageOf(userId))['bonusCredits']).toBeUndefined();
    });

    it('a refund for an order we have no record of is recorded for review, not dropped or thrown', async () => {
      const id = uniq('rf');
      await expect(
        processCashfreeEvent(refundEvent(id, uniq('ghost'), 10))
      ).resolves.toBeUndefined();
      expect((await db.collection('cashfree_refunds').doc(id).get()).data()).toMatchObject({
        needsManualReview: true,
      });
      expect((await collectBillingReview()).some((i) => i.refId === id)).toBe(true);
    });
  });

  describe('disputes and chargebacks', () => {
    const disputeEvent = (
      type: string,
      disputeId: string,
      orderId: string,
      status: string,
      updatedAt: string
    ) => ({
      type,
      data: {
        dispute: {
          dispute_id: disputeId,
          dispute_type: 'CHARGEBACK',
          dispute_status: status,
          dispute_amount: PACK_PRICE,
          reason_code: '1402',
          updated_at: updatedAt,
          created_at: '2026-10-12T10:00:00+05:30',
        },
        order_details: { order_id: orderId },
      },
    });

    it('flags the order and the account, and changes no credits', async () => {
      const userId = uniq('u');
      const orderId = uniq('ord');
      const did = uniq('dp');
      await seedUser(userId);
      await pay(orderId, userId, 'credit_pack');
      const before = await usageOf(userId);

      await processCashfreeEvent(
        disputeEvent(
          'DISPUTE_CREATED',
          did,
          orderId,
          'CHARGEBACK_CREATED',
          '2026-10-12T10:00:00+05:30'
        )
      );
      expect(await usageOf(userId)).toEqual(before); // nothing silently changed
      expect((await db.collection('cashfree_disputes').doc(did).get()).data()).toMatchObject({
        open: true,
        needsManualReview: true,
        userId,
        orderId,
      });
      expect(
        (await db.collection('transactions').doc(orderId).get()).data()!['reconciliation']
      ).toMatchObject({
        state: 'disputed',
      });
      expect(
        (await db.collection('users').doc(userId).get()).data()!['billingReview']
      ).toMatchObject({
        open: true,
      });
      expect(
        (await collectBillingReview()).some((i) => i.refId === did && i.type === 'open_dispute')
      ).toBe(true);
    });

    it('duplicate and stale deliveries cannot overwrite a newer state or duplicate the audit trail', async () => {
      const userId = uniq('u');
      const orderId = uniq('ord');
      const did = uniq('dp');
      await seedUser(userId);
      await pay(orderId, userId, 'credit_pack');
      const created = disputeEvent(
        'DISPUTE_CREATED',
        did,
        orderId,
        'CHARGEBACK_CREATED',
        '2026-10-12T10:00:00+05:30'
      );
      const review = disputeEvent(
        'DISPUTE_UPDATED',
        did,
        orderId,
        'CHARGEBACK_UNDER_REVIEW',
        '2026-10-13T10:00:00+05:30'
      );
      await processCashfreeEvent(created);
      await processCashfreeEvent(review);
      await processCashfreeEvent(created); // late, older
      await processCashfreeEvent(review); // duplicate
      expect((await db.collection('cashfree_disputes').doc(did).get()).data()!['status']).toBe(
        'CHARGEBACK_UNDER_REVIEW'
      );
      const trail = (await auditFor(did)).filter((a) => a['kind'] === 'dispute');
      expect(trail).toHaveLength(2); // one entry per distinct (status, time)
    });

    it('closing it clears the account flag only when no other dispute is open; a lost dispute is surfaced', async () => {
      const userId = uniq('u');
      const o1 = uniq('ord');
      const o2 = uniq('ord');
      const d1 = uniq('dp');
      const d2 = uniq('dp');
      await seedUser(userId);
      await pay(o1, userId, 'credit_pack');
      await pay(o2, userId, 'credit_pack');
      await processCashfreeEvent(
        disputeEvent('DISPUTE_CREATED', d1, o1, 'CHARGEBACK_CREATED', '2026-10-12T10:00:00+05:30')
      );
      await processCashfreeEvent(
        disputeEvent('DISPUTE_CREATED', d2, o2, 'CHARGEBACK_CREATED', '2026-10-12T11:00:00+05:30')
      );
      await processCashfreeEvent(
        disputeEvent(
          'DISPUTE_CLOSED',
          d1,
          o1,
          'CHARGEBACK_MERCHANT_WON',
          '2026-10-14T10:00:00+05:30'
        )
      );
      expect((await db.collection('users').doc(userId).get()).data()!['billingReview'].open).toBe(
        true
      );
      await processCashfreeEvent(
        disputeEvent(
          'DISPUTE_CLOSED',
          d2,
          o2,
          'CHARGEBACK_MERCHANT_LOST',
          '2026-10-15T10:00:00+05:30'
        )
      );
      expect((await db.collection('users').doc(userId).get()).data()!['billingReview'].open).toBe(
        false
      );
      expect((await db.collection('cashfree_disputes').doc(d2).get()).data()).toMatchObject({
        lost: true,
        open: false,
        needsManualReview: true,
      });
      // credits were never touched by any of it
      expect((await usageOf(userId))['bonusCredits']).toBe(PACK * 2);
    });
  });

  describe('customer refund request', () => {
    const call = (userId: string, data: Record<string, unknown>) =>
      (requestRefund as unknown as { run: (r: unknown) => Promise<any> }).run({
        data,
        auth: { uid: userId, token: {} },
      });

    it('records one request per order, idempotently, and changes nothing else', async () => {
      const userId = uniq('u');
      const orderId = uniq('ord');
      await seedUser(userId);
      await pay(orderId, userId, 'credit_pack');
      const before = await usageOf(userId);

      const a = await call(userId, { orderId, reason: 'changed my mind' });
      const b = await call(userId, { orderId, reason: 'again' });
      expect(a).toMatchObject({ success: true, alreadyRequested: false, status: 'requested' });
      expect(b).toMatchObject({ alreadyRequested: true });
      const req = (await db.collection('refund_requests').doc(orderId).get()).data()!;
      expect(req).toMatchObject({ userId, status: 'requested', reason: 'changed my mind' });
      expect(await usageOf(userId)).toEqual(before);
      expect(
        (await auditFor(orderId)).filter((x) => x['kind'] === 'refund_requested')
      ).toHaveLength(1);
      expect(
        (await collectBillingReview()).some(
          (i) => i.type === 'refund_request' && i.refId === orderId
        )
      ).toBe(true);
    });

    it("refuses another customer's order and an unpaid order, identically for unknown orders", async () => {
      const owner = uniq('u');
      const other = uniq('u');
      const orderId = uniq('ord');
      await seedUser(owner);
      await seedUser(other);
      await pay(orderId, owner, 'credit_pack');
      await expect(call(other, { orderId })).rejects.toMatchObject({ code: 'not-found' });
      await expect(call(other, { orderId: uniq('nope') })).rejects.toMatchObject({
        code: 'not-found',
      });
      const pending = uniq('ord');
      await db
        .collection('transactions')
        .doc(pending)
        .set({
          userId: owner,
          provider: 'cashfree',
          status: 'pending',
          metadata: { priceINR: 1 },
        });
      await expect(call(owner, { orderId: pending })).rejects.toMatchObject({
        code: 'failed-precondition',
      });
      expect((await db.collection('refund_requests').doc(orderId).get()).exists).toBe(false);
    });
  });
});
