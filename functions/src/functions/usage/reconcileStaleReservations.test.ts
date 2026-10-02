/**
 * M2 (Pass 2) — stale reservation reconciliation, run against the real
 * Firestore emulator (self-skips without FIRESTORE_EMULATOR_HOST).
 */
import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import * as usageControl from '../../services/usageControl';
import { reconcileStaleReservations } from './reconcileStaleReservations';

const describeIfEmulator = process.env['FIRESTORE_EMULATOR_HOST'] ? describe : describe.skip;

describeIfEmulator('reconcileStaleReservations (Firestore emulator)', () => {
  const db = admin.firestore();
  const run = () => (reconcileStaleReservations as any).run({});

  async function seedUsage(userId: string) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usageId = `${userId}_${periodStart.toISOString().split('T')[0]}`;
    await db
      .collection('usage')
      .doc(usageId)
      .set({
        usageId,
        userId,
        planId: 'business',
        creditsUsed: 0,
        periodStart: periodStart.toISOString(),
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      });
    return usageId;
  }

  async function ageReservation(operationId: string, minutes: number) {
    await db
      .collection('transactions')
      .doc(operationId)
      .update({
        createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - minutes * 60 * 1000),
      });
  }

  afterAll(async () => {
    await admin.app().delete();
  });

  it('stale pending reservation with a stuck campaign is refunded and the campaign marked failed', async () => {
    const userId = `u-${uuid()}`;
    const usageId = await seedUsage(userId);
    const op = uuid();
    await usageControl.reserveCreditsForOperation(userId, op, 'campaign_generation', 140);
    await db
      .collection('campaigns')
      .doc(`c-${op}`)
      .set({
        campaignId: `c-${op}`,
        userId,
        status: 'analyzing',
        metadata: { idempotencyKey: op },
      });
    await ageReservation(op, 30);

    await run();

    expect((await db.collection('transactions').doc(op).get()).data()!['status']).toBe('refunded');
    expect((await db.collection('usage').doc(usageId).get()).data()!['creditsUsed']).toBe(0);
    const c = (await db.collection('campaigns').doc(`c-${op}`).get()).data()!;
    expect(c['status']).toBe('failed');
    expect(c['error'].code).toBe('GENERATION_TIMEOUT');
  });

  it('duplicate reconciliation does not double-refund', async () => {
    const userId = `u-${uuid()}`;
    const usageId = await seedUsage(userId);
    const op = uuid();
    await usageControl.reserveCreditsForOperation(userId, op, 'campaign_generation', 140);
    await ageReservation(op, 30);

    await run();
    await run();

    expect((await db.collection('usage').doc(usageId).get()).data()!['creditsUsed']).toBe(0);
  });

  it('a fresh (recent) pending reservation is left alone — may still be generating', async () => {
    const userId = `u-${uuid()}`;
    const usageId = await seedUsage(userId);
    const op = uuid();
    await usageControl.reserveCreditsForOperation(userId, op, 'campaign_generation', 140);
    await ageReservation(op, 2);

    await run();

    expect((await db.collection('transactions').doc(op).get()).data()!['status']).toBe('pending');
    expect((await db.collection('usage').doc(usageId).get()).data()!['creditsUsed']).toBe(140);
  });

  it('a stale reservation whose campaign already reached a terminal status is not touched', async () => {
    const userId = `u-${uuid()}`;
    const usageId = await seedUsage(userId);
    const op = uuid();
    await usageControl.reserveCreditsForOperation(userId, op, 'campaign_generation', 140);
    await db
      .collection('campaigns')
      .doc(`c-${op}`)
      .set({
        campaignId: `c-${op}`,
        userId,
        status: 'verified',
        metadata: { idempotencyKey: op },
      });
    await ageReservation(op, 30);

    await run();

    expect((await db.collection('transactions').doc(op).get()).data()!['status']).toBe('pending');
    expect((await db.collection('usage').doc(usageId).get()).data()!['creditsUsed']).toBe(140);
  });

  it('already finalized (completed) reservations are never refunded', async () => {
    const userId = `u-${uuid()}`;
    const usageId = await seedUsage(userId);
    const op = uuid();
    await usageControl.reserveCreditsForOperation(userId, op, 'campaign_generation', 140);
    await usageControl.finalizeReservation(op);
    await ageReservation(op, 30);

    await run();

    expect((await db.collection('transactions').doc(op).get()).data()!['status']).toBe('completed');
    expect((await db.collection('usage').doc(usageId).get()).data()!['creditsUsed']).toBe(140);
  });

  it("only the reservation owner's credits are touched (tenant isolation)", async () => {
    const userA = `u-${uuid()}`;
    const userB = `u-${uuid()}`;
    const usageA = await seedUsage(userA);
    const usageB = await seedUsage(userB);
    const opA = uuid();
    const opB = uuid();
    await usageControl.reserveCreditsForOperation(userA, opA, 'campaign_generation', 140);
    await usageControl.reserveCreditsForOperation(userB, opB, 'campaign_generation', 140);
    await ageReservation(opA, 30); // only A is stale

    await run();

    expect((await db.collection('usage').doc(usageA).get()).data()!['creditsUsed']).toBe(0);
    expect((await db.collection('usage').doc(usageB).get()).data()!['creditsUsed']).toBe(140);
  });
});
