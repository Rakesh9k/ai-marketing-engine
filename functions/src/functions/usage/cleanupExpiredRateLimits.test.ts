/**
 * Phase 10 Rate Limiting & Abuse Protection audit — finding F-5 cleanup job,
 * run against the real Firestore emulator (self-skips without
 * FIRESTORE_EMULATOR_HOST, same convention as reconcileStaleReservations.test.ts).
 */
import * as admin from 'firebase-admin';
import { cleanupExpiredRateLimits } from './cleanupExpiredRateLimits';
import { checkRateLimit } from '../../middleware/rateLimit';

const describeIfEmulator = process.env['FIRESTORE_EMULATOR_HOST'] ? describe : describe.skip;

describeIfEmulator('cleanupExpiredRateLimits (Firestore emulator)', () => {
  const db = admin.firestore();
  const run = () => (cleanupExpiredRateLimits as any).run({});

  afterAll(async () => {
    await admin.app().delete();
  });

  it('deletes rate_limits documents whose window has already expired', async () => {
    const userId = `u-${Date.now()}-1`;
    const action = `test-expired-${Date.now()}`;
    await checkRateLimit(userId, action, { maxRequests: 5, windowSeconds: 3600 });

    const key = `ratelimit_${action}_${userId}`;
    // Force the window into the past, as if it had genuinely expired.
    await db
      .collection('rate_limits')
      .doc(key)
      .update({ resetTime: Date.now() - 1000 });

    await run();

    const doc = await db.collection('rate_limits').doc(key).get();
    expect(doc.exists).toBe(false);
  });

  it('does NOT delete a rate_limits document whose window is still active', async () => {
    const userId = `u-${Date.now()}-2`;
    const action = `test-active-${Date.now()}`;
    await checkRateLimit(userId, action, { maxRequests: 5, windowSeconds: 3600 });

    const key = `ratelimit_${action}_${userId}`;

    await run();

    const doc = await db.collection('rate_limits').doc(key).get();
    expect(doc.exists).toBe(true);
    expect(doc.data()!['count']).toBe(1);
  });

  it('a subsequent request after cleanup starts a fresh window rather than erroring (deleting an expired doc is equivalent to it never existing)', async () => {
    const userId = `u-${Date.now()}-3`;
    const action = `test-fresh-${Date.now()}`;
    await checkRateLimit(userId, action, { maxRequests: 1, windowSeconds: 3600 });

    const key = `ratelimit_${action}_${userId}`;
    await db
      .collection('rate_limits')
      .doc(key)
      .update({ resetTime: Date.now() - 1000 });
    await run();

    // The window "expired" (was cleaned up) — a fresh request must succeed,
    // exactly as it would if this were this user's very first call.
    await expect(
      checkRateLimit(userId, action, { maxRequests: 1, windowSeconds: 3600 })
    ).resolves.toBeUndefined();
  });
});
