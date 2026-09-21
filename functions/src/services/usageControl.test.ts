/**
 * Credit-safety tests for the existing reservation/finalization/refund state
 * machine, run against the real Firestore emulator (not a hand-rolled mock)
 * so the actual transaction logic in usageControl.ts is exercised. Mirrors
 * the project's existing skip-if-no-emulator convention (see
 * tests/security.test.ts) — self-skips rather than failing when
 * FIRESTORE_EMULATOR_HOST is not set, and never claims to have run if it
 * didn't.
 */
import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import * as usageControl from './usageControl';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

describeIfEmulator('usageControl credit safety (Firestore emulator)', () => {
  const db = admin.firestore();
  const testUserId = () => `test-user-${uuid()}`;

  async function seedActiveUsage(userId: string, planId: 'free' | 'business' = 'business') {
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

  afterAll(async () => {
    await admin.app().delete();
  });

  it('CASE 1: reservation + finalize on success — transaction ends completed, no refund exists', async () => {
    const userId = testUserId();
    await seedActiveUsage(userId);
    const operationId = uuid();

    const reservation = await usageControl.reserveCreditsForOperation(userId, operationId, 'campaign_generation', 140);
    expect(reservation.creditsReserved).toBe(140);

    const finalize = await usageControl.finalizeReservation(operationId);
    expect(finalize.success).toBe(true);

    const txSnap = await db.collection('transactions').doc(operationId).get();
    expect(txSnap.data()!['status']).toBe('completed');

    const refundSnap = await db.collection('transactions').doc(`refund_${operationId}`).get();
    expect(refundSnap.exists).toBe(false);
  });

  it('CASE 2/5: provider/pipeline failure inside executeWithUsageControl -> refunded, error is not swallowed', async () => {
    const userId = testUserId();
    await seedActiveUsage(userId);
    const operationId = uuid();

    await expect(
      usageControl.executeWithUsageControl(userId, operationId, 'campaign_generation', async () => {
        throw new Error('simulated provider failure');
      })
    ).rejects.toThrow('simulated provider failure');

    const txSnap = await db.collection('transactions').doc(operationId).get();
    expect(txSnap.data()!['status']).toBe('refunded');
  });

  it('CASE 4: timeout-shaped failure -> refunded (any thrown error composes correctly, not just specific error types)', async () => {
    const userId = testUserId();
    await seedActiveUsage(userId);
    const operationId = uuid();

    class FakeTimeoutError extends Error {}
    await expect(
      usageControl.executeWithUsageControl(userId, operationId, 'campaign_generation', async () => {
        throw new FakeTimeoutError('timed out after 30000ms');
      })
    ).rejects.toThrow('timed out');

    const txSnap = await db.collection('transactions').doc(operationId).get();
    expect(txSnap.data()!['status']).toBe('refunded');
  });

  it('CASE 6: successful generation -> credits finalized, never left pending, never double-charged', async () => {
    const userId = testUserId();
    const usageId = await seedActiveUsage(userId);
    const operationId = uuid();

    await usageControl.executeWithUsageControl(userId, operationId, 'campaign_generation', async () => 'ok');

    const usageSnap = await db.collection('usage').doc(usageId).get();
    expect(usageSnap.data()!['creditsUsed']).toBe(140);

    const txSnap = await db.collection('transactions').doc(operationId).get();
    expect(txSnap.data()!['status']).toBe('completed');
  });

  it('CASE 8: duplicate request with the same operationId does not reserve credits twice (idempotency)', async () => {
    const userId = testUserId();
    const usageId = await seedActiveUsage(userId);
    const operationId = uuid();

    await usageControl.reserveCreditsForOperation(userId, operationId, 'campaign_generation', 140);
    const second = await usageControl.reserveCreditsForOperation(userId, operationId, 'campaign_generation', 140);
    expect(second.transactionId).toBe(operationId);

    const usageSnap = await db.collection('usage').doc(usageId).get();
    // Only one increment of 140 happened, not two.
    expect(usageSnap.data()!['creditsUsed']).toBe(140);
  });

  it('CASE 9: already-finalized reservation cannot be finalized again, and cannot be refunded', async () => {
    const userId = testUserId();
    await seedActiveUsage(userId);
    const operationId = uuid();

    await usageControl.reserveCreditsForOperation(userId, operationId, 'campaign_generation', 140);
    await usageControl.finalizeReservation(operationId);

    // Finalizing again is idempotent (no error, no double effect).
    const secondFinalize = await usageControl.finalizeReservation(operationId);
    expect(secondFinalize.success).toBe(true);

    // But refunding a finalized reservation must be rejected, not silently allowed.
    await expect(usageControl.refundReservation(operationId, userId)).rejects.toThrow(
      /finalized/i
    );
  });

  it('CASE 9b: an already-refunded reservation cannot be finalized, and re-refunding is idempotent (no double refund)', async () => {
    const userId = testUserId();
    const usageId = await seedActiveUsage(userId);
    const operationId = uuid();

    await usageControl.reserveCreditsForOperation(userId, operationId, 'campaign_generation', 140);
    await usageControl.refundReservation(operationId, userId);

    await expect(usageControl.finalizeReservation(operationId)).rejects.toThrow(/refunded/i);

    // Refunding again must not refund a second time.
    const secondRefund = await usageControl.refundReservation(operationId, userId);
    expect(secondRefund.success).toBe(true);

    const usageSnap = await db.collection('usage').doc(usageId).get();
    expect(usageSnap.data()!['creditsUsed']).toBe(0); // reserved 140, refunded 140, never double-refunded below 0
  });

  it('no reservation -> finalize/refund fail with OPERATION_NOT_FOUND rather than fabricating success', async () => {
    const userId = testUserId();
    await expect(usageControl.finalizeReservation('never-reserved-op')).rejects.toMatchObject({
      code: 'OPERATION_NOT_FOUND',
    });
    await expect(usageControl.refundReservation('never-reserved-op', userId)).rejects.toMatchObject({
      code: 'OPERATION_NOT_FOUND',
    });
  });

  it('reordering fix: a user with an active subscription but NO usage doc for the period can still reserve credits', async () => {
    // Regression test for the reordering fix in reserveCreditsForOperation:
    // previously checkGenerationEligibility ran before the usage doc was
    // ensured to exist, so this would incorrectly throw INSUFFICIENT_CREDITS
    // for every user's first generation of a new billing period.
    const userId = testUserId();
    // Deliberately do NOT seed a usage doc.
    const operationId = uuid();

    const reservation = await usageControl.reserveCreditsForOperation(userId, operationId, 'campaign_generation', 50);
    expect(reservation.creditsReserved).toBe(50);
  });

  it('insufficient credits genuinely blocks reservation (credit gate is not bypassed)', async () => {
    const userId = testUserId();
    await seedActiveUsage(userId, 'free'); // 100 monthly credits
    const operationId = uuid();

    await expect(
      usageControl.reserveCreditsForOperation(userId, operationId, 'campaign_generation', 140)
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS' });

    const txSnap = await db.collection('transactions').doc(operationId).get();
    expect(txSnap.exists).toBe(false); // nothing reserved
  });
});
