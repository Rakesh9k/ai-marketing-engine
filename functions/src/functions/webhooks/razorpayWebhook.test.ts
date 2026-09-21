/**
 * Phase 10 — Razorpay webhook signature + idempotency tests, run against
 * the real Firestore emulator (the handler makes real Firestore reads/
 * writes for the processed_webhook_events claim and for granting credits).
 * Self-skips without FIRESTORE_EMULATOR_HOST.
 *
 * process.env['RAZORPAY_WEBHOOK_SECRET'] must be set BEFORE
 * razorpayWebhook.ts is imported, since that module reads it once via
 * getEnvConfig() (cached) at module-load time.
 */
import * as crypto from 'crypto';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

const WEBHOOK_SECRET = 'test-webhook-secret-for-phase-10';
process.env['RAZORPAY_WEBHOOK_SECRET'] = WEBHOOK_SECRET;

import * as admin from 'firebase-admin';
import { razorpayWebhook } from './razorpayWebhook';

function sign(body: string): string {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

function makeReqRes(bodyObj: any, signatureOverride?: string) {
  const rawBody = Buffer.from(JSON.stringify(bodyObj));
  const req: any = {
    method: 'POST',
    url: '/razorpayWebhook',
    rawBody,
    body: bodyObj,
    headers: {
      'x-razorpay-signature': signatureOverride ?? sign(rawBody.toString()),
    },
  };
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

function paymentCapturedEvent(eventId: string, userId: string, planId: string, paymentId: string) {
  return {
    id: eventId,
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: `order_${paymentId}`,
          amount: 99900,
          created_at: Math.floor(Date.now() / 1000),
          notes: { userId, planId },
        },
      },
    },
  };
}

describeIfEmulator('razorpayWebhook (Firestore emulator, Phase 10)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  async function seedUsage(userId: string, planId = 'free') {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usageId = `${userId}_${periodStart.toISOString().split('T')[0]}`;
    await db.collection('usage').doc(usageId).set({
      usageId,
      userId,
      periodStart: periodStart.toISOString(),
      periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      planId,
      campaignsCreated: 0,
      creditsUsed: 0,
      imagesGenerated: 0,
      copyGenerations: 0,
      regenerations: 0,
      failedGenerations: 0,
      updatedAt: new Date().toISOString(),
    });
    return usageId;
  }

  it('rejects a webhook with an invalid/tampered signature — no processing occurs', async () => {
    const { req, res } = makeReqRes(
      paymentCapturedEvent('evt_bad_sig', 'user_x', 'business', 'pay_bad_sig'),
      'deadbeef-not-a-real-signature'
    );
    await razorpayWebhook(req as any, res as any);
    expect(res._status).toBe(400);

    const txSnap = await db.collection('transactions').doc('pay_bad_sig').get();
    expect(txSnap.exists).toBe(false); // nothing was granted
  });

  it('accepts a validly-signed webhook and grants credits for payment.captured', async () => {
    const userId = `user-${crypto.randomUUID()}`;
    await seedUsage(userId, 'free');
    const eventId = `evt_${crypto.randomUUID()}`;
    const paymentId = `pay_${crypto.randomUUID()}`;

    const { req, res } = makeReqRes(paymentCapturedEvent(eventId, userId, 'business', paymentId));
    await razorpayWebhook(req as any, res as any);

    expect(res._status).toBe(200);

    const txSnap = await db.collection('transactions').doc(paymentId).get();
    expect(txSnap.exists).toBe(true);
    expect(txSnap.data()!['status']).toBe('completed');

    // The plan actually granted: usage.planId is what checkGenerationEligibility
    // reads (see usageControl.ts) — this is the real, enforced entitlement.
    const usageDoc = await db
      .collection('usage')
      .doc(`${userId}_${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]}`)
      .get();
    expect(usageDoc.data()!['planId']).toBe('business');
  });

  it('CRITICAL (§29): the exact same webhook event delivered twice sequentially grants credits exactly once', async () => {
    const userId = `user-${crypto.randomUUID()}`;
    const usageId = await seedUsage(userId, 'free');
    const eventId = `evt_${crypto.randomUUID()}`;
    const paymentId = `pay_${crypto.randomUUID()}`;
    const event = paymentCapturedEvent(eventId, userId, 'business', paymentId);

    const first = makeReqRes(event);
    await razorpayWebhook(first.req as any, first.res as any);
    expect(first.res._status).toBe(200);

    const second = makeReqRes(event);
    await razorpayWebhook(second.req as any, second.res as any);
    expect(second.res._status).toBe(200); // still a "success" response to Razorpay, just a no-op

    const usageDoc = await db.collection('usage').doc(usageId).get();
    // creditsIncluded would double-increment if the duplicate were
    // reprocessed — assert it reflects exactly one grant.
    expect(usageDoc.data()!['creditsIncluded']).toBe(1200); // PRICING.subscriptionTiers.business.monthlyCredits, granted once

    const processedSnap = await db.collection('processed_webhook_events').doc(eventId).get();
    expect(processedSnap.data()!['status']).toBe('processed');
  });

  it('CRITICAL (§29/§66): the exact same webhook event delivered concurrently (racing deliveries) grants credits exactly once', async () => {
    const userId = `user-${crypto.randomUUID()}`;
    const usageId = await seedUsage(userId, 'free');
    const eventId = `evt_${crypto.randomUUID()}`;
    const paymentId = `pay_${crypto.randomUUID()}`;
    const event = paymentCapturedEvent(eventId, userId, 'business', paymentId);

    const a = makeReqRes(event);
    const b = makeReqRes(event);

    await Promise.all([razorpayWebhook(a.req as any, a.res as any), razorpayWebhook(b.req as any, b.res as any)]);

    expect(a.res._status).toBe(200);
    expect(b.res._status).toBe(200);

    const usageDoc = await db.collection('usage').doc(usageId).get();
    expect(usageDoc.data()!['creditsIncluded']).toBe(1200); // granted exactly once, not 2400
  });

  it('an unrelated, differently-IDed webhook event is processed independently (not deduplicated against a different event)', async () => {
    const userId = `user-${crypto.randomUUID()}`;
    await seedUsage(userId, 'free');
    const paymentId1 = `pay_${crypto.randomUUID()}`;
    const paymentId2 = `pay_${crypto.randomUUID()}`;

    const e1 = makeReqRes(paymentCapturedEvent(`evt_${crypto.randomUUID()}`, userId, 'business', paymentId1));
    await razorpayWebhook(e1.req as any, e1.res as any);
    const e2 = makeReqRes(paymentCapturedEvent(`evt_${crypto.randomUUID()}`, userId, 'business', paymentId2));
    await razorpayWebhook(e2.req as any, e2.res as any);

    const tx1 = await db.collection('transactions').doc(paymentId1).get();
    const tx2 = await db.collection('transactions').doc(paymentId2).get();
    expect(tx1.exists).toBe(true);
    expect(tx2.exists).toBe(true);
  });
});
