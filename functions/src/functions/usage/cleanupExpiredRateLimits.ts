import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';

/**
 * Phase 10 Rate Limiting & Abuse Protection audit — finding F-5 from
 * docs/PHASE_38_RATE_LIMIT_PRECISION_AUDIT_REPORT.md: `rate_limits`
 * (rateLimit.ts) has never had any cleanup — every unique (action, userId)
 * pair that has EVER made a rate-limited call leaves a permanent document
 * behind, even long after its window has expired. Not a security hole
 * (checkRateLimit's own `resetTime > now` check already ignores stale
 * counters when deciding whether to allow a request — see rateLimit.ts),
 * but genuinely unbounded storage growth with no bound on the number of
 * (user, action) pairs the app will ever see.
 *
 * Phase 38 considered this out of scope for a code-only fix, expecting a
 * native Firestore TTL policy (a console/gcloud configuration, not code) to
 * close it instead. That infrastructure step needs project-owner access
 * this environment doesn't have (see the Phase 7 App Check audit for the
 * same class of console-only limitation). This scheduled function is the
 * code-level equivalent, using the exact same pattern already established
 * by reconcileStaleReservations.ts: a periodic sweep, not a redesign of the
 * rate limiter itself.
 *
 * Safe to delete a rate_limits doc once its window has closed: rateLimit.ts
 * already treats any doc whose stored `resetTime <= now` as if it doesn't
 * exist (`count = 0`), so removing it changes nothing about a real request
 * arriving after this runs — it will simply recreate the doc with a fresh
 * window, exactly as it would if the doc had never existed at all.
 */
const BATCH_SIZE = 400; // comfortably under Firestore's 500-write batch limit

export const cleanupExpiredRateLimits = onSchedule(
  { schedule: 'every 24 hours', region: 'asia-south1', timeoutSeconds: 300 },
  async () => {
    const { logger, startTime } = logFunctionStart('cleanupExpiredRateLimits', {});
    const db = admin.firestore();
    // rateLimit.ts stores resetTime as a plain epoch-milliseconds number
    // (`Date.now() + windowSeconds * 1000`), not a Firestore Timestamp —
    // matching that exact type here, not admin.firestore.Timestamp.
    const nowMillis = Date.now();

    let deleted = 0;
    try {
      // Loop in bounded batches rather than one unbounded query — this
      // collection has no natural upper size limit (see the finding above),
      // so a single get() could otherwise attempt to load an unbounded
      // result set into memory.
      for (;;) {
        const snap = await db
          .collection('rate_limits')
          .where('resetTime', '<=', nowMillis)
          .limit(BATCH_SIZE)
          .get();

        if (snap.empty) break;

        const batch = db.batch();
        for (const doc of snap.docs) {
          batch.delete(doc.ref);
        }
        await batch.commit();
        deleted += snap.size;

        if (snap.size < BATCH_SIZE) break; // fewer than a full page — nothing left
      }

      logFunctionComplete(logger, startTime, { success: true, deleted });
    } catch (error) {
      logFunctionError(logger, startTime, error as Error, { deletedBeforeError: deleted });
      throw error;
    }
  }
);
