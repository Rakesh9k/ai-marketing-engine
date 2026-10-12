import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { createLogger } from '../utils/logging';
import { getCurrentUsageRefAndSnap, getPeriodCreditAllowance } from './billing';
import {
  creditsToRevoke,
  isDisputeLost,
  isDisputeOpen,
  isFullRefund,
  isRefundSucceeded,
  shortenedTermEnd,
} from './refundPolicy';
import type { BillingCycle } from './prepaidTerm';

const db = admin.firestore();
const log = createLogger({ function: 'cashfreeRefunds' });

/** Cashfree REFUND_STATUS_WEBHOOK `data.refund` (shape read from Cashfree's docs 2026-10-12; sandbox-unverified). */
export interface CashfreeRefundEvent {
  refund_id: string;
  refund_status: string;
  refund_amount: number;
  order_id?: string;
  cf_refund_id?: string | number;
  cf_payment_id?: string | number;
  refund_note?: string;
  processed_at?: string;
}

/** Cashfree DISPUTE_* webhooks `data` (shape read from Cashfree's docs 2026-10-12; sandbox-unverified). */
export interface CashfreeDisputeEvent {
  dispute_id: string | number;
  dispute_type?: string;
  dispute_status?: string;
  dispute_amount?: number;
  reason_code?: string;
  reason_description?: string;
  respond_by?: string;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string;
  dispute_action_on?: string;
}

export type AuditKind =
  | 'refund_status'
  | 'refund_applied'
  | 'refund_needs_review'
  | 'dispute'
  | 'refund_requested'
  | 'payment_flag_resolved';

/** Append-only audit trail. Deterministic ids make a repeated event a no-op rather than a duplicate entry. */
function writeAudit(
  tx: FirebaseFirestore.Transaction,
  existing: FirebaseFirestore.DocumentSnapshot,
  ref: FirebaseFirestore.DocumentReference,
  entry: {
    kind: AuditKind;
    orderId: string | null;
    userId: string | null;
    refId: string;
    details: Record<string, unknown>;
  }
): void {
  if (existing.exists) return;
  tx.set(ref, { provider: 'cashfree', ...entry, at: FieldValue.serverTimestamp() });
}
export const auditRef = (id: string) => db.collection('billing_audit').doc(id);

/**
 * Records a refund status and, when the refund succeeded, applies the baseline adjustment EXACTLY ONCE.
 * Idempotent: a repeated or out-of-order delivery changes nothing a second time, and a later non-success status can
 * never undo a success.
 */
export async function applyCashfreeRefund(
  refund: CashfreeRefundEvent,
  fallbackOrderId?: string,
  now = new Date()
): Promise<{ outcome: string }> {
  const refundId = String(refund.refund_id);
  const orderId = refund.order_id ?? fallbackOrderId ?? null;
  const refundRef = db.collection('cashfree_refunds').doc(refundId);
  const status = refund.refund_status;
  const amount = typeof refund.refund_amount === 'number' ? refund.refund_amount : null;

  return db.runTransaction(async (tx) => {
    const refundSnap = await tx.get(refundRef);
    const prior = refundSnap.data();
    const statusAudit = auditRef(`cf_refund_${refundId}_${status}`);
    const statusAuditSnap = await tx.get(statusAudit);

    // Never regress: once a refund is recorded as SUCCESS, later PENDING/CANCELLED deliveries are ignored.
    if (prior && isRefundSucceeded(prior['status']) && !isRefundSucceeded(status)) {
      return { outcome: 'ignored_after_success' };
    }

    const txnRef = orderId ? db.collection('transactions').doc(orderId) : null;
    const grantRef = orderId ? db.collection('cashfree_grants').doc(orderId) : null;
    const [txnSnap, grantSnap] = await Promise.all([
      txnRef ? tx.get(txnRef) : Promise.resolve(undefined),
      grantRef ? tx.get(grantRef) : Promise.resolve(undefined),
    ]);
    const txn = txnSnap?.data();
    const grant = grantSnap?.data();
    const userId = (txn?.['userId'] ?? grant?.['userId'] ?? null) as string | null;

    const base = {
      refundId,
      orderId,
      userId,
      status,
      amount,
      refundNote: refund.refund_note ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Not a success, or already counted: record and stop.
    if (!isRefundSucceeded(status) || prior?.['counted'] === true) {
      tx.set(refundRef, { ...base, needsManualReview: false }, { merge: true });
      writeAudit(tx, statusAuditSnap, statusAudit, {
        kind: 'refund_status',
        orderId,
        userId,
        refId: refundId,
        details: { status, amount },
      });
      return { outcome: prior?.['counted'] === true ? 'duplicate' : 'recorded' };
    }

    // ── A refund that succeeded, seen for the first time ────────────────────────────────────────────────────
    const orderAmount = txn?.['metadata']?.['priceINR'] as number | undefined;
    const refundedBefore = (txn?.['refundedAmount'] as number | undefined) ?? 0;
    const refundedTotal = refundedBefore + (amount ?? 0);
    const finish = (
      adjustment: Record<string, unknown>,
      needsManualReview: boolean,
      outcome: string,
      extra: () => void = () => undefined
    ) => {
      tx.set(
        refundRef,
        {
          ...base,
          counted: true,
          adjustment,
          needsManualReview,
          appliedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      if (txnRef && txn) {
        tx.set(
          txnRef,
          {
            refundedAmount: refundedTotal,
            reconciliation: { state: 'refunded', refundId },
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
      extra();
      const applied = auditRef(`cf_refund_${refundId}_applied`);
      // (the audit existence read above is for the status entry; the applied entry is unique per refund)
      tx.set(
        applied,
        {
          provider: 'cashfree',
          kind: needsManualReview ? 'refund_needs_review' : 'refund_applied',
          orderId,
          userId,
          refId: refundId,
          details: { amount, refundedTotal, orderAmount: orderAmount ?? null, adjustment },
          at: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      writeAudit(tx, statusAuditSnap, statusAudit, {
        kind: 'refund_status',
        orderId,
        userId,
        refId: refundId,
        details: { status, amount },
      });
      return { outcome };
    };

    if (!txn || !userId || typeof orderAmount !== 'number') {
      return finish(
        { action: 'none', reason: 'refund for an order we have no usable record of' },
        true,
        'unknown_order'
      );
    }
    if (!grant || grant['status'] !== 'granted') {
      // The payment was never applied (flagged / mismatched). The refund resolves it: nothing to reverse.
      return finish(
        { action: 'none', reason: 'nothing was granted for this order, so nothing to reverse' },
        false,
        'nothing_granted',
        () => {
          if (grantRef && grantSnap?.exists) {
            tx.set(
              grantRef,
              {
                needsManualReview: false,
                resolution: 'refunded',
                resolvedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          }
        }
      );
    }
    if (grant['reversedAt']) {
      return finish(
        { action: 'none', reason: 'order already reversed' },
        false,
        'already_reversed'
      );
    }
    if (!isFullRefund(orderAmount, refundedTotal)) {
      return finish(
        {
          action: 'review',
          reason: `partial refund (${refundedTotal} of ${orderAmount}); nothing changed automatically`,
        },
        true,
        'partial_needs_review'
      );
    }

    // Full refund of a granted order: reverse that order's grant, once.
    const kind = txn['metadata']?.['kind'] as 'subscription' | 'credit_pack' | undefined;
    const usage = await getCurrentUsageRefAndSnap(tx, userId);
    const usageData = usage.snap.data();

    if (kind === 'credit_pack') {
      const packCredits = (txn['metadata']?.['credits'] as number | undefined) ?? 0;
      const planId = (usageData?.['planId'] as 'free' | undefined) ?? 'free';
      const bonus = (usageData?.['bonusCredits'] as number | undefined) ?? 0;
      const allowance = getPeriodCreditAllowance(planId, bonus);
      const used = (usageData?.['creditsUsed'] as number | undefined) ?? 0;
      const revoke = Math.min(creditsToRevoke(packCredits, allowance, used), bonus);
      return finish(
        {
          action: 'revoke_credits',
          packCredits,
          revoked: revoke,
          keptBecauseSpent: packCredits - revoke,
        },
        false,
        'credits_revoked',
        () => {
          if (usage.snap.exists && revoke > 0) {
            tx.update(usage.ref, {
              bonusCredits: bonus - revoke,
              creditsIncluded: getPeriodCreditAllowance(planId, bonus - revoke),
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          tx.set(
            grantRef!,
            { reversedAt: FieldValue.serverTimestamp(), reversedBy: refundId },
            { merge: true }
          );
        }
      );
    }

    // Subscription: take the refunded order's days off the paid-through date.
    const planId = txn['metadata']?.['planId'] as string | undefined;
    const cycle = (txn['metadata']?.['billingCycle'] as BillingCycle | undefined) ?? 'monthly';
    const subRef = db.collection('subscriptions').doc(`sub_cf_${userId}_${planId}`);
    const subSnap = await tx.get(subRef);
    const sub = subSnap.data();
    if (!sub || sub['provider'] !== 'cashfree') {
      return finish(
        { action: 'review', reason: 'subscription record for this order was not found' },
        true,
        'subscription_missing'
      );
    }
    const { endIso, ended } = shortenedTermEnd(
      sub['currentPeriodEnd'] as string | undefined,
      cycle,
      now
    );
    return finish(
      {
        action: ended ? 'end_term' : 'shorten_term',
        previousEnd: sub['currentPeriodEnd'] ?? null,
        newEnd: endIso,
      },
      false,
      ended ? 'term_ended' : 'term_shortened',
      () => {
        tx.set(
          subRef,
          {
            currentPeriodEnd: endIso,
            ...(ended ? { status: 'refunded', cancelAtPeriodEnd: false } : {}),
            updatedAt: now.toISOString(),
          },
          { merge: true }
        );
        if (ended && usage.snap.exists && usageData?.['planId'] && usageData['planId'] !== 'free') {
          tx.update(usage.ref, {
            planId: 'free',
            creditsIncluded: getPeriodCreditAllowance(
              'free',
              usageData['bonusCredits'] as number | undefined
            ),
            lapsedAt: now.toISOString(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        tx.set(
          grantRef!,
          { reversedAt: FieldValue.serverTimestamp(), reversedBy: refundId },
          { merge: true }
        );
      }
    );
  });
}

/**
 * Records a dispute / chargeback. It flags the account and the order for review and NOTHING else: no credits are
 * changed and no records are deleted. Out-of-date or repeated deliveries cannot overwrite a newer status.
 */
export async function recordCashfreeDispute(
  dispute: CashfreeDisputeEvent,
  orderId: string | undefined
): Promise<{ outcome: string }> {
  const disputeId = String(dispute.dispute_id);
  const ref = db.collection('cashfree_disputes').doc(disputeId);
  const status = dispute.dispute_status;
  const stamp = dispute.updated_at ?? dispute.created_at ?? '';

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prior = snap.data();
    const txnRef = orderId ? db.collection('transactions').doc(orderId) : null;
    const grantRef = orderId ? db.collection('cashfree_grants').doc(orderId) : null;
    const [txnSnap, grantSnap] = await Promise.all([
      txnRef ? tx.get(txnRef) : Promise.resolve(undefined),
      grantRef ? tx.get(grantRef) : Promise.resolve(undefined),
    ]);
    const userId = (txnSnap?.data()?.['userId'] ?? grantSnap?.data()?.['userId'] ?? null) as
      string | null;
    const audit = auditRef(`cf_dispute_${disputeId}_${status ?? 'unknown'}_${stamp}`);
    const auditSnap = await tx.get(audit);

    writeAudit(tx, auditSnap, audit, {
      kind: 'dispute',
      orderId: orderId ?? null,
      userId,
      refId: disputeId,
      details: {
        status: status ?? null,
        type: dispute.dispute_type ?? null,
        amount: dispute.dispute_amount ?? null,
      },
    });

    // An older delivery never overwrites a newer state.
    const priorStamp = (prior?.['lastUpdatedAt'] as string | undefined) ?? '';
    if (prior && stamp && priorStamp && stamp < priorStamp) return { outcome: 'stale', userId };

    const open = isDisputeOpen(status);
    tx.set(
      ref,
      {
        disputeId,
        orderId: orderId ?? null,
        userId,
        status: status ?? null,
        type: dispute.dispute_type ?? null,
        amount: dispute.dispute_amount ?? null,
        reasonCode: dispute.reason_code ?? null,
        reasonDescription: dispute.reason_description ?? null,
        respondBy: dispute.respond_by ?? null,
        actionOn: dispute.dispute_action_on ?? null,
        open,
        lost: isDisputeLost(status),
        needsManualReview: true,
        lastUpdatedAt: stamp,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    if (txnRef && txnSnap?.exists) {
      tx.set(
        txnRef,
        { reconciliation: { state: open ? 'disputed' : 'dispute_closed', disputeId } },
        { merge: true }
      );
    }
    return { outcome: 'recorded', userId };
  });

  // Account-level flag, recomputed from the dispute records (open if ANY dispute is still open).
  if (result.userId) {
    const stillOpen = await db
      .collection('cashfree_disputes')
      .where('userId', '==', result.userId)
      .where('open', '==', true)
      .limit(1)
      .get();
    await db
      .collection('users')
      .doc(result.userId)
      .set(
        {
          billingReview: {
            open: !stillOpen.empty,
            reason: 'payment_dispute',
            updatedAt: FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );
  }
  log.info('cashfree dispute recorded', {
    disputeId,
    status: status ?? null,
    outcome: result.outcome,
  });
  return { outcome: result.outcome };
}
