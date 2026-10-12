import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { auditRef } from '../../services/cashfreeRefunds';

const db = admin.firestore();

const schema = z.object({
  orderId: z.string().min(1).max(120),
  reason: z.string().trim().max(500).optional(),
});

export interface RequestRefundResponse {
  success: boolean;
  alreadyRequested: boolean;
  status: string;
}

/**
 * The customer asks for a refund. This ONLY records the request (one per order, idempotent). It never refunds,
 * revokes credits or changes access: a person reviews it against the published policy, and any refund is then
 * issued in Cashfree, whose REFUND_STATUS_WEBHOOK applies the adjustment (services/cashfreeRefunds.ts).
 */
export const requestRefund = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 10 },
  validatedCallable(schema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('requestRefund', { userId: context.userId });
    try {
      await checkRateLimit(context.userId, 'requestRefund');

      const txnSnap = await db.collection('transactions').doc(data.orderId).get();
      const txn = txnSnap.data();
      // Same answer for "no such order" and "another customer's order": never reveal other customers' orders.
      if (
        !txnSnap.exists ||
        !txn ||
        txn['userId'] !== context.userId ||
        txn['provider'] !== 'cashfree'
      ) {
        throw new HttpsError('not-found', 'We could not find that payment.');
      }
      if (txn['status'] !== 'completed') {
        throw new HttpsError('failed-precondition', 'Only a completed payment can be refunded.');
      }

      const reqRef = db.collection('refund_requests').doc(data.orderId);
      const audit = auditRef(`refund_request_${data.orderId}`);
      const result = await db.runTransaction(async (tx) => {
        const [existing, auditSnap] = await Promise.all([tx.get(reqRef), tx.get(audit)]);
        if (existing.exists) {
          return { already: true, status: (existing.data()!['status'] as string) ?? 'requested' };
        }
        tx.set(reqRef, {
          orderId: data.orderId,
          userId: context.userId,
          amountINR: (txn['metadata']?.['priceINR'] as number | undefined) ?? null,
          kind: (txn['metadata']?.['kind'] as string | undefined) ?? null,
          reason: data.reason ?? null,
          status: 'requested',
          createdAt: FieldValue.serverTimestamp(),
        });
        if (!auditSnap.exists) {
          tx.set(audit, {
            provider: 'cashfree',
            kind: 'refund_requested',
            orderId: data.orderId,
            userId: context.userId,
            refId: data.orderId,
            details: { reasonGiven: Boolean(data.reason) },
            at: FieldValue.serverTimestamp(),
          });
        }
        return { already: false, status: 'requested' };
      });

      logFunctionComplete(logger, startTime, { success: true, alreadyRequested: result.already });
      return {
        success: true,
        alreadyRequested: result.already,
        status: result.status,
      } satisfies RequestRefundResponse;
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
