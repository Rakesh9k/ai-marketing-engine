import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { getUsageDocId } from '../../services/firestore';
import { getPeriodCreditAllowance } from '../../services/billing';
import { isTermLive } from '../../services/prepaidTerm';

/**
 * Daily expiry of ended prepaid terms — runs at midnight IST (18:00 UTC).
 *
 * Plans are fixed-term PREPAID and never renew automatically (services/prepaidTerm.ts), so EVERY non-Paddle
 * subscription whose `currentPeriodEnd` has passed is ended here, not only those marked `cancelAtPeriodEnd`.
 * (Entitlement itself never waits for this job: resolveEntitledPlan and the checkout rules look at the end date
 * directly; this job tidies the records and drops the paid credits.)
 *
 * For each ended subscription, in ONE transaction:
 *  - status -> 'canceled' with expiredAt / endedReason 'term_ended';
 *  - the user's `subscriptionId` pointer is removed ONLY if it still points at this subscription (a user who has
 *    since bought a new term must keep it);
 *  - the current-month usage document drops to the Free allowance (keeping credits already used and any
 *    top-up credits), so a term ending mid-month does not keep paid credits until month end.
 *
 * Paddle-managed subscriptions are skipped (their lifecycle comes from Paddle webhooks).
 * Query: status == 'active' AND currentPeriodEnd < now  (composite index in firestore.indexes.json). ISO string
 * comparison is chronological for ISO 8601.
 */
export async function expireEndedSubscriptions(
  now = new Date(),
  maxPages = 5
): Promise<{ scanned: number; expired: number }> {
  const db = admin.firestore();
  const nowIso = now.toISOString();
  let scanned = 0;
  let expired = 0;

  for (let page = 0; page < maxPages; page++) {
    const snap = await db
      .collection('subscriptions')
      .where('status', '==', 'active')
      .where('currentPeriodEnd', '<', nowIso)
      .limit(100)
      .get();
    if (snap.empty) break;
    scanned += snap.size;

    let progressed = 0;
    for (const doc of snap.docs) {
      const initial = doc.data();
      if (initial['provider'] === 'paddle') continue;
      const userId = initial['userId'] as string | undefined;
      if (!userId) continue;

      const done = await db.runTransaction(async (tx) => {
        const subSnap = await tx.get(doc.ref);
        const sub = subSnap.data();
        // Re-check inside the transaction: it may have been renewed since the query ran.
        if (!sub || sub['status'] !== 'active' || isTermLive(sub, now)) return false;

        const userRef = db.collection('users').doc(userId);
        const usageRef = db
          .collection('usage')
          .doc(getUsageDocId(userId, new Date(now.getFullYear(), now.getMonth(), 1)));
        const [userSnap, usageSnap] = await Promise.all([tx.get(userRef), tx.get(usageRef)]);

        tx.update(doc.ref, {
          status: 'canceled',
          expiredAt: nowIso,
          endedReason: 'term_ended',
          updatedAt: FieldValue.serverTimestamp(),
        });
        if (userSnap.exists && userSnap.data()?.['subscriptionId'] === doc.id) {
          tx.update(userRef, {
            subscriptionId: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        const usage = usageSnap.data();
        if (usageSnap.exists && usage && usage['planId'] && usage['planId'] !== 'free') {
          tx.update(usageRef, {
            planId: 'free',
            creditsIncluded: getPeriodCreditAllowance(
              'free',
              usage['bonusCredits'] as number | undefined
            ),
            lapsedAt: nowIso,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return true;
      });
      if (done) {
        expired++;
        progressed++;
      }
    }
    // Nothing more could be expired from this page (e.g. only Paddle docs): stop rather than loop.
    if (progressed === 0 || snap.size < 100) break;
  }
  return { scanned, expired };
}

export const expireSubscriptions = onSchedule(
  {
    schedule: '0 18 * * *', // midnight IST daily (UTC 18:00 = IST 00:00+5:30)
    timeZone: 'UTC',
    region: 'asia-south1',
  },
  async (_event) => {
    const { logger, startTime } = logFunctionStart('expireSubscriptions', {});
    try {
      const { scanned, expired } = await expireEndedSubscriptions();
      logger.info(`expireSubscriptions: expired ${expired} subscription(s)`, { expired });
      logFunctionComplete(logger, startTime, { success: true, scanned, expired });
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw error;
    }
  }
);
