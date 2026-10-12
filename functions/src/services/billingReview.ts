import * as admin from 'firebase-admin';

const db = admin.firestore();

export interface BillingReviewItem {
  type:
    | 'unapplied_payment'
    | 'refund_needs_review'
    | 'open_dispute'
    | 'lost_dispute'
    | 'refund_request';
  orderId: string | null;
  userId: string | null;
  refId: string;
  detail: string;
}

/**
 * Everything a person must look at, gathered from the ledgers. Read-only. Paid-but-unapplied orders and
 * unreviewed refunds/disputes can never be silently lost: they stay listed until resolved.
 */
export async function collectBillingReview(limit = 100): Promise<BillingReviewItem[]> {
  const [grants, refunds, disputes, requests] = await Promise.all([
    db.collection('cashfree_grants').where('needsManualReview', '==', true).limit(limit).get(),
    db.collection('cashfree_refunds').where('needsManualReview', '==', true).limit(limit).get(),
    db.collection('cashfree_disputes').where('open', '==', true).limit(limit).get(),
    db.collection('refund_requests').where('status', '==', 'requested').limit(limit).get(),
  ]);
  const items: BillingReviewItem[] = [];
  for (const d of grants.docs) {
    const g = d.data();
    items.push({
      type: 'unapplied_payment',
      orderId: d.id,
      userId: (g['userId'] as string) ?? null,
      refId: d.id,
      detail: String(g['reason'] ?? 'payment could not be applied'),
    });
  }
  for (const d of refunds.docs) {
    const r = d.data();
    items.push({
      type: 'refund_needs_review',
      orderId: (r['orderId'] as string) ?? null,
      userId: (r['userId'] as string) ?? null,
      refId: d.id,
      detail: String(r['adjustment']?.['reason'] ?? 'refund needs review'),
    });
  }
  for (const d of disputes.docs) {
    const x = d.data();
    items.push({
      type: x['lost'] ? 'lost_dispute' : 'open_dispute',
      orderId: (x['orderId'] as string) ?? null,
      userId: (x['userId'] as string) ?? null,
      refId: d.id,
      detail: `${x['type'] ?? 'dispute'} ${x['status'] ?? ''}`.trim(),
    });
  }
  for (const d of requests.docs) {
    const q = d.data();
    items.push({
      type: 'refund_request',
      orderId: d.id,
      userId: (q['userId'] as string) ?? null,
      refId: d.id,
      detail: 'customer asked for a refund',
    });
  }
  return items;
}
