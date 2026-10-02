import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';

/**
 * Daily subscription expiry enforcement — runs at midnight IST (18:00 UTC).
 *
 * Finds subscriptions that have been marked for cancellation at period end
 * (`cancelAtPeriodEnd == true`) whose `currentPeriodEnd` has passed, and
 * transitions them to `status: 'canceled'`. The corresponding user document's
 * `subscriptionId` field is deleted so that entitlements checks immediately
 * see the user as unsubscribed.
 *
 * Design notes:
 *  - Batched writes (max 500/batch) protect against Firestore batch limits.
 *  - Query limited to 100 docs per run to stay well within the 60-second
 *    scheduled-function timeout; missed docs will be picked up on the next run.
 *  - ISO string comparison on `currentPeriodEnd` is safe because Firestore
 *    lexicographic ordering matches chronological ordering for ISO 8601 dates.
 */
export const expireSubscriptions = onSchedule(
  {
    schedule: '0 18 * * *', // midnight IST daily (UTC 18:00 = IST 00:00+5:30)
    timeZone: 'UTC',
    region: 'asia-south1',
  },
  async (_event) => {
    const { logger, startTime } = logFunctionStart('expireSubscriptions', {});
    const db = admin.firestore();
    const now = new Date();
    const nowIso = now.toISOString();

    let expired = 0;

    try {
      const snap = await db
        .collection('subscriptions')
        .where('status', '==', 'active')
        .where('cancelAtPeriodEnd', '==', true)
        .where('currentPeriodEnd', '<', nowIso)
        .limit(100)
        .get();

      if (snap.empty) {
        logFunctionComplete(logger, startTime, { success: true, scanned: 0, expired: 0 });
        return;
      }

      // Batched writes — Firestore max is 500 ops/batch; each expired
      // subscription produces 2 writes (subscription doc + user doc), so
      // 100 docs = 200 ops, comfortably within the limit. We keep the batch
      // logic explicit so it remains correct if the .limit(100) above is
      // ever raised.
      const MAX_OPS_PER_BATCH = 500;
      let batch = db.batch();
      let opsInBatch = 0;

      const flushBatch = async () => {
        if (opsInBatch > 0) {
          await batch.commit();
          batch = db.batch();
          opsInBatch = 0;
        }
      };

      for (const doc of snap.docs) {
        const sub = doc.data();
        const userId = sub['userId'] as string | undefined;

        if (!userId) {
          logger.error('expireSubscriptions: subscription has no userId; skipping', undefined, {
            subscriptionId: doc.id,
          });
          continue;
        }

        // Paddle manages auto-renewal and cancellation via webhooks.
        // Do NOT expire Paddle subscriptions here — let paddleWebhook.ts
        // handle subscription.canceled events instead. Expiring them here
        // would prematurely cancel subscriptions that Paddle is still
        // managing (e.g. between payment_failed and the dunning recovery).
        if (sub['provider'] === 'paddle') {
          logger.info('expireSubscriptions: skipping Paddle-managed subscription', {
            subscriptionId: doc.id,
          });
          continue;
        }

        // Update subscription → canceled
        batch.update(doc.ref, {
          status: 'canceled',
          canceledAt: nowIso,
          updatedAt: FieldValue.serverTimestamp(),
        });
        opsInBatch++;

        // Remove subscriptionId from user doc
        const userRef = db.collection('users').doc(userId);
        batch.update(userRef, {
          subscriptionId: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        opsInBatch++;

        expired++;

        // Flush before hitting the batch limit
        if (opsInBatch >= MAX_OPS_PER_BATCH) {
          await flushBatch();
        }
      }

      // Flush any remaining writes
      await flushBatch();

      logger.info(`expireSubscriptions: expired ${expired} subscription(s)`, { expired });

      logFunctionComplete(logger, startTime, {
        success: true,
        scanned: snap.size,
        expired,
      });
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw error;
    }
  }
);
