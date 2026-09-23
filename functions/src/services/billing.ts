import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getUsageDocId } from './firestore';
import { calculateCreditsToGrant } from './razorpay';
import type { SubscriptionPlan, Usage } from '../types';

const db = admin.firestore();

function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

/**
 * Provider-neutral credit grant for a confirmed plan payment — shared by
 * razorpayWebhook.ts's handlePaymentCaptured/handleSubscriptionCharged and
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
