import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getUsageDocId } from './firestore';
import { isTermLive } from './prepaidTerm';
import { getMonthlyCredits, type SubscriptionPlan } from '../config/pricing';
import type { Usage } from '../types';

export function calculateCreditsToGrant(planId: SubscriptionPlan): number {
  return getMonthlyCredits(planId);
}

const db = admin.firestore();

function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

/**
 * Provider-neutral credit grant for a confirmed plan payment — shared by
 * webhook.ts's handlePaymentCaptured/handleSubscriptionCharged and
 * payuWebhook.ts's equivalent handlers, so the actual Firestore write
 * (which collection, which field, the create-usage-doc-if-missing fallback)
 * can't drift between the two gateways. Must be called from inside a
 * Firestore transaction that the caller owns (it only stages writes on the
 * passed transaction, it does not commit).
 *
 * Returns the number of credits granted, for the caller to record on its
 * own gateway-specific transaction document.
 */
export function grantPlanCredits(
  tx: FirebaseFirestore.Transaction,
  userId: string,
  planId: SubscriptionPlan,
  usageRef: FirebaseFirestore.DocumentReference,
  usageSnap: FirebaseFirestore.DocumentSnapshot
): number {
  const creditsToGrant = calculateCreditsToGrant(planId);
  const now = new Date();

  if (!usageSnap.exists) {
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newUsage: Usage = {
      usageId: usageRef.id,
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
      updatedAt: serverTimestamp().toString(),
    };
    tx.set(usageRef, newUsage);
  }

  tx.update(usageRef, {
    creditsIncluded: FieldValue.increment(creditsToGrant),
    planId,
    updatedAt: serverTimestamp(),
  });

  return creditsToGrant;
}

/**
 * Total credits spendable in a period: the plan's monthly allowance plus any
 * top-up (bonus) credits bought for that period. This is the ONE definition of
 * "credits available before usage" — usageControl.ts uses it for every check, so
 * top-ups can never become a second, unenforced balance.
 */
export function getPeriodCreditAllowance(planId: SubscriptionPlan, bonusCredits?: number): number {
  return getMonthlyCredits(planId) + Math.max(0, bonusCredits ?? 0);
}

function newPeriodUsageDoc(
  usageRef: FirebaseFirestore.DocumentReference,
  userId: string,
  planId: SubscriptionPlan
): Usage {
  const now = new Date();
  return {
    usageId: usageRef.id,
    userId,
    periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
    planId,
    campaignsCreated: 0,
    creditsUsed: 0,
    imagesGenerated: 0,
    copyGenerations: 0,
    regenerations: 0,
    failedGenerations: 0,
    updatedAt: serverTimestamp().toString(),
  };
}

/**
 * Applies a paid plan's entitlement to the current period's usage doc.
 *
 * Mitra's entitlement is "usage.planId -> monthly credits", so this SETS the
 * plan (idempotent by construction — re-applying the same plan is a no-op) and
 * recomputes the display total, rather than incrementing a counter. Used for
 * first purchase, every recurring renewal, and plan changes. Call inside a
 * Firestore transaction that also writes the grant-ledger doc that makes the
 * call once-only per Paddle transaction.
 */
export function applyPlanEntitlement(
  tx: FirebaseFirestore.Transaction,
  userId: string,
  planId: SubscriptionPlan,
  usageRef: FirebaseFirestore.DocumentReference,
  usageSnap: FirebaseFirestore.DocumentSnapshot
): number {
  const bonus =
    (usageSnap.exists ? (usageSnap.data()?.['bonusCredits'] as number | undefined) : 0) ?? 0;
  if (!usageSnap.exists) {
    tx.set(usageRef, newPeriodUsageDoc(usageRef, userId, planId));
  }
  tx.update(usageRef, {
    planId,
    creditsIncluded: getPeriodCreditAllowance(planId, bonus),
    updatedAt: serverTimestamp(),
  });
  return getMonthlyCredits(planId);
}

/**
 * Provider-neutral credit grant for a top-up credit pack purchase. Adds to the
 * period's `bonusCredits` (enforced by usageControl.ts via getPeriodCreditAllowance)
 * and keeps the display total in step. Not idempotent on its own — callers MUST
 * guard it with a once-only ledger doc in the same transaction.
 */
export function grantTopUpCredits(
  tx: FirebaseFirestore.Transaction,
  userId: string,
  creditsToGrant: number,
  usageRef: FirebaseFirestore.DocumentReference,
  usageSnap: FirebaseFirestore.DocumentSnapshot
): number {
  const data = usageSnap.exists ? usageSnap.data() : undefined;
  const planId = (data?.['planId'] as SubscriptionPlan | undefined) ?? 'free';
  const bonus = ((data?.['bonusCredits'] as number | undefined) ?? 0) + creditsToGrant;

  if (!usageSnap.exists) {
    tx.set(usageRef, newPeriodUsageDoc(usageRef, userId, planId));
  }
  tx.update(usageRef, {
    bonusCredits: bonus,
    creditsIncluded: getPeriodCreditAllowance(planId, bonus),
    updatedAt: serverTimestamp(),
  });

  return creditsToGrant;
}

/**
 * The plan a user is entitled to at `now`, derived from their subscription.
 * Used when a new period's usage doc is created, so a subscriber whose billing
 * cycle spans several periods (yearly) or whose renewal webhook has not landed
 * yet does not silently fall back to Free. A canceled-at-period-end subscription
 * keeps its plan until currentPeriodEnd.
 */
export async function resolveEntitledPlan(
  userId: string,
  now = new Date()
): Promise<SubscriptionPlan> {
  const userSnap = await db.collection('users').doc(userId).get();
  const subscriptionId = userSnap.data()?.['subscriptionId'] as string | undefined;
  if (!subscriptionId) return 'free';

  const subSnap = await db.collection('subscriptions').doc(subscriptionId).get();
  const sub = subSnap.data();
  if (!sub) return 'free';

  const status = sub['status'] as string | undefined;
  const plan = sub['planId'] as SubscriptionPlan | undefined;
  const periodEnd = sub['currentPeriodEnd'] as string | undefined;
  const entitledStatus = status === 'active' || status === 'past_due' || status === 'trialing';
  const withinPeriod = !periodEnd || new Date(periodEnd).getTime() > now.getTime();

  return plan && entitledStatus && withinPeriod ? plan : 'free';
}

/** Resolves the current-month usage doc reference/snapshot for a user,
 * inside the caller's transaction. */
export async function getCurrentUsageRefAndSnap(
  tx: FirebaseFirestore.Transaction,
  userId: string
): Promise<{
  ref: FirebaseFirestore.DocumentReference;
  snap: FirebaseFirestore.DocumentSnapshot;
}> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const usageId = getUsageDocId(userId, periodStart);
  const ref = db.collection('usage').doc(usageId);
  const snap = await tx.get(ref);
  return { ref, snap };
}

/**
 * Enforces the paid-through date on the CREDITS, at the moment they are about to be spent. The usage document
 * keeps the plan it was given at purchase for the whole calendar month, so without this a 30-day term ending
 * mid-month would keep paid credits until month end (and the daily expiry job could be up to a day late).
 *
 * If the current-month usage document carries a paid plan but the user's entitlement has lapsed, it drops to the
 * Free allowance (credits already used and top-up credits are kept). Done in a transaction that also reads the
 * user's subscription, so it cannot downgrade someone whose renewal webhook is committing at the same time.
 * Returns true when a downgrade happened.
 */
export async function reconcileLapsedPlan(userId: string, now = new Date()): Promise<boolean> {
  const usageRef = db
    .collection('usage')
    .doc(getUsageDocId(userId, new Date(now.getFullYear(), now.getMonth(), 1)));
  const preview = await usageRef.get();
  const previewPlan = preview.data()?.['planId'];
  if (!preview.exists || !previewPlan || previewPlan === 'free') return false;

  return db.runTransaction(async (tx) => {
    const [usageSnap, userSnap] = await Promise.all([
      tx.get(usageRef),
      tx.get(db.collection('users').doc(userId)),
    ]);
    const usage = usageSnap.data();
    if (!usageSnap.exists || !usage || !usage['planId'] || usage['planId'] === 'free') return false;

    const subscriptionId = userSnap.data()?.['subscriptionId'] as string | undefined;
    const sub = subscriptionId
      ? (await tx.get(db.collection('subscriptions').doc(subscriptionId))).data()
      : undefined;
    // Only act on EVIDENCE of a lapsed term: a subscription record that exists and has ended. A paid usage
    // document with no subscription pointer at all is left alone here (no evidence either way).
    if (!sub || isTermLive(sub, now)) return false;

    tx.update(usageRef, {
      planId: 'free',
      creditsIncluded: getPeriodCreditAllowance(
        'free',
        usage['bonusCredits'] as number | undefined
      ),
      lapsedAt: now.toISOString(),
      updatedAt: serverTimestamp(),
    });
    return true;
  });
}
