/**
 * Phase 15 — regression test for a P0 financial-integrity bug found during
 * this phase's audit: `reserveCredits` (services/firestore.ts), the credit
 * reservation path used by the deployed `createCampaign` Cloud Function,
 * previously wrote its idempotency-key transaction doc and incremented
 * `creditsUsed` unconditionally on every call — it never checked whether a
 * reservation for that idempotencyKey already existed. A duplicate/retried
 * request with the same idempotencyKey (a duplicate click, or a client
 * retry after a dropped response) silently reserved credits a second time.
 * This is the exact "ONE RESERVATION -> ONE TERMINAL OUTCOME" invariant
 * Phase 15 requires, and is distinct from services/usageControl.ts's
 * separate (already correctly idempotent, per Phase 10) reservation path
 * used by generateCampaignStrategy.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { reserveCredits, getUsageDoc, getUsageDocId } from './firestore';

describeIfEmulator('reserveCredits — idempotency and credit-gate integrity (Phase 15 regression)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  async function seedUsage(userId: string, creditsIncluded: number) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usageId = getUsageDocId(userId, periodStart);
    await db
      .collection('usage')
      .doc(usageId)
      .set({
        usageId,
        userId,
        periodStart: periodStart.toISOString(),
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
        planId: 'business',
        creditsIncluded,
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

  it('REGRESSION: the same idempotencyKey submitted twice reserves credits exactly once, not twice', async () => {
    const userId = `user-${uuid()}`;
    const usageId = await seedUsage(userId, 100);
    const idempotencyKey = uuid();

    await reserveCredits(userId, 60, idempotencyKey, 'camp_1', 'biz_1');
    await reserveCredits(userId, 60, idempotencyKey, 'camp_1', 'biz_1'); // duplicate/retry

    const usage = await getUsageDoc(usageId);
    expect(usage!.creditsUsed).toBe(60); // not 120

    const txnSnap = await db.collection('transactions').where('transactionId', '==', idempotencyKey).get();
    expect(txnSnap.size).toBe(1); // exactly one reservation record, not two
  });

  it('REGRESSION: two DIFFERENT idempotencyKeys each reserve credits independently (proves the fix does not over-suppress legitimate reservations)', async () => {
    const userId = `user-${uuid()}`;
    const usageId = await seedUsage(userId, 100);

    await reserveCredits(userId, 30, uuid(), 'camp_1', 'biz_1');
    await reserveCredits(userId, 30, uuid(), 'camp_2', 'biz_1');

    const usage = await getUsageDoc(usageId);
    expect(usage!.creditsUsed).toBe(60);
  });

  it('insufficient credits rejects the reservation and leaves the balance unchanged', async () => {
    const userId = `user-${uuid()}`;
    const usageId = await seedUsage(userId, 100);

    await expect(reserveCredits(userId, 101, uuid(), 'camp_1', 'biz_1')).rejects.toThrow(
      /Insufficient credits/
    );

    const usage = await getUsageDoc(usageId);
    expect(usage!.creditsUsed).toBe(0);
  });

  it('concurrent reservations for the SAME idempotencyKey (a genuine duplicate-click race) still reserve exactly once', async () => {
    const userId = `user-${uuid()}`;
    const usageId = await seedUsage(userId, 100);
    const idempotencyKey = uuid();

    await Promise.all([
      reserveCredits(userId, 60, idempotencyKey, 'camp_1', 'biz_1'),
      reserveCredits(userId, 60, idempotencyKey, 'camp_1', 'biz_1'),
    ]);

    const usage = await getUsageDoc(usageId);
    expect(usage!.creditsUsed).toBe(60);
  });

  it('concurrent reservations for DIFFERENT idempotencyKeys that together exceed the balance: exactly one succeeds, balance never goes negative', async () => {
    const userId = `user-${uuid()}`;
    const usageId = await seedUsage(userId, 100);

    const results = await Promise.allSettled([
      reserveCredits(userId, 100, uuid(), 'camp_1', 'biz_1'),
      reserveCredits(userId, 100, uuid(), 'camp_2', 'biz_1'),
    ]);

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    expect(succeeded).toBe(1);

    const usage = await getUsageDoc(usageId);
    expect(usage!.creditsUsed).toBe(100);
    expect(usage!.creditsUsed).toBeLessThanOrEqual((usage as unknown as { creditsIncluded: number }).creditsIncluded);
  });
});
