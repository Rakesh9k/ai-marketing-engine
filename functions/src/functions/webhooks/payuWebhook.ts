import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  createLogger,
  logFunctionStart,
  logFunctionComplete,
  logFunctionError,
} from '../../utils/logging';
import { trackEvent, ANALYTICS_EVENTS } from '../../services/analyticsService';
import { getPayUConfig, verifyPayUResponse, verifyPaymentWithPayU } from '../../services/payu';
import { grantPlanCredits, getCurrentUsageRefAndSnap } from '../../services/billing';
import type { SubscriptionPlan, Subscription, SubscriptionStatus, Transaction } from '../../types';

const db = admin.firestore();
const webhookLogger = createLogger({ function: 'payuWebhook' });

function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

/**
 * PayU server-to-server webhook — the ONLY path that grants credits for a
 * PayU payment (payuCallback.ts's browser redirect never does). Configured
 * separately in the PayU merchant dashboard against this function's
 * deployed URL — see docs/PAYMENT_GATEWAY.md for the exact configuration
 * steps, which are UNVERIFIED (no PayU account access in this
 * environment).
 *
 * Pipeline, mirroring razorpayWebhook.ts's structure so the two gateways'
 * safety properties stay comparable:
 *   1. Hash verification (constant-time, see services/payu.ts)
 *   2. Idempotency claim (txnid+status, atomic Firestore transaction claim
 *      — PayU may retry delivery, same correctness pattern as the
 *      Razorpay webhook's processed_webhook_events collection)
 *   3. Look up Mitra's own pending transaction record by txnid (created by
 *      createPayUPayment.ts) — userId/planId/expected amount come from
 *      THIS record, not from the webhook's udf fields, even though those
 *      are also hash-protected. Two independent sources must agree.
 *   4. Amount reconciliation — mismatch is flagged, not silently
 *      recharged/undercharged.
 *   5. Server-side Verify Payment API reconciliation (best-effort — if
 *      PayU's verify endpoint itself is unreachable, this does not by
 *      itself block a hash-valid, amount-matched success, since the
 *      webhook payload has already been cryptographically verified; a
 *      verify-call failure is logged, not silently ignored).
 *   6. Credit grant (only for status === 'success').
 */
export const payuWebhook = onRequest({ region: 'asia-south1' }, async (req, res) => {
  const { logger, startTime } = logFunctionStart('payuWebhook', { method: req.method });

  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    let payuConfig;
    try {
      payuConfig = getPayUConfig();
    } catch (configError) {
      logger.error('PayU not configured', configError as Error);
      res.status(500).send('PayU not configured');
      return;
    }

    const body = req.body as Record<string, unknown>;
    const txnid = typeof body['txnid'] === 'string' ? body['txnid'] : '';
    const status = typeof body['status'] === 'string' ? body['status'] : '';
    const amount =
      typeof body['amount'] === 'string' ? body['amount'] : String(body['amount'] ?? '');
    const mihpayid = typeof body['mihpayid'] === 'string' ? body['mihpayid'] : '';

    if (!txnid || !status) {
      logger.error('payuWebhook missing txnid/status', new Error('Malformed payload'));
      res.status(400).send('Missing required fields');
      return;
    }

    const hashValid = verifyPayUResponse(
      {
        key: String(body['key'] ?? ''),
        txnid,
        amount,
        productinfo: String(body['productinfo'] ?? ''),
        firstname: String(body['firstname'] ?? ''),
        email: String(body['email'] ?? ''),
        status,
        udf1: typeof body['udf1'] === 'string' ? body['udf1'] : undefined,
        udf2: typeof body['udf2'] === 'string' ? body['udf2'] : undefined,
        hash: String(body['hash'] ?? ''),
      },
      payuConfig.salt
    );

    if (!hashValid) {
      logger.error('payuWebhook invalid hash', new Error('Hash verification failed'), { txnid });
      res.status(400).send('Invalid signature');
      return;
    }

    // Idempotency: claim on txnid+status so a repeated identical delivery
    // (PayU retry) is a no-op, but a legitimate status transition
    // (pending -> success) is still processed once.
    const eventId = `payu_${txnid}_${status}`;
    const processedRef = db.collection('processed_webhook_events').doc(eventId);
    const claimed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(processedRef);
      if (snap.exists) return false;
      tx.set(processedRef, {
        eventId,
        eventType: `payu.${status}`,
        status: 'processing',
        claimedAt: serverTimestamp(),
      });
      return true;
    });

    if (!claimed) {
      logger.info('payuWebhook event already processed', { txnid, status });
      res.status(200).send('OK');
      return;
    }

    try {
      await processPayUEvent({ txnid, status, amount, mihpayid, body });
    } catch (processingError) {
      await processedRef.delete().catch(() => undefined);
      throw processingError;
    }

    await processedRef.set({
      eventId,
      eventType: `payu.${status}`,
      status: 'processed',
      processedAt: serverTimestamp(),
    });

    logFunctionComplete(logger, startTime, { success: true, txnid, status });
    res.status(200).send('OK');
  } catch (error) {
    logFunctionError(logger, startTime, error as Error);
    res.status(500).send('Internal server error');
  }
});

async function processPayUEvent(params: {
  txnid: string;
  status: string;
  amount: string;
  mihpayid: string;
  body: Record<string, unknown>;
}): Promise<void> {
  const { txnid, status, amount, mihpayid } = params;

  const transactionRef = db.collection('transactions').doc(txnid);
  const transactionSnap = await transactionRef.get();
  if (!transactionSnap.exists) {
    webhookLogger.warn('payuWebhook: no matching Mitra transaction for txnid', { txnid });
    return;
  }
  const transaction = transactionSnap.data() as Transaction;
  const userId = transaction.userId;
  const planId = transaction.metadata?.['planId'] as SubscriptionPlan | undefined;

  if (!userId || !planId) {
    webhookLogger.warn('payuWebhook: transaction record missing userId/planId', { txnid });
    return;
  }

  // Amount reconciliation — the received amount must match what Mitra
  // itself computed and persisted at checkout-initiation time.
  const expectedAmount = transaction.amount.toFixed(2);
  const receivedAmount = Number(amount).toFixed(2);
  if (expectedAmount !== receivedAmount) {
    webhookLogger.error(
      'payuWebhook: AMOUNT MISMATCH — refusing to grant credits',
      new Error('Amount mismatch'),
      { txnid, expectedAmount, receivedAmount }
    );
    await transactionRef.update({
      status: 'flagged_amount_mismatch',
      updatedAt: serverTimestamp(),
    });
    return;
  }

  if (status === 'success') {
    // Best-effort server-side reconciliation against PayU's own records.
    // A failure here is logged but does not by itself block an already
    // hash-verified, amount-matched success — see module comment.
    try {
      const verified = await verifyPaymentWithPayU(txnid);
      if (verified.status !== 'success') {
        webhookLogger.error(
          'payuWebhook: PayU verify_payment disagrees with webhook status',
          new Error('Verification mismatch'),
          { txnid, webhookStatus: status, verifyStatus: verified.status }
        );
        await transactionRef.update({
          status: 'flagged_verification_mismatch',
          updatedAt: serverTimestamp(),
        });
        return;
      }
    } catch (verifyError) {
      webhookLogger.warn('payuWebhook: verify_payment reconciliation call failed', {
        txnid,
        error: (verifyError as Error).message,
      });
    }

    await db.runTransaction(async (tx) => {
      const { ref: usageRef, snap: usageSnap } = await getCurrentUsageRefAndSnap(tx, userId);
      const creditsGranted = grantPlanCredits(tx, userId, planId, usageRef, usageSnap);

      tx.update(transactionRef, {
        status: 'completed',
        payuMihpayid: mihpayid,
        metadata: { ...transaction.metadata, creditsGranted },
        updatedAt: serverTimestamp(),
      });

      const subscriptionRef = db.collection('subscriptions').doc(txnid);
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const subscriptionData: Subscription = {
        subscriptionId: txnid,
        userId,
        planId,
        status: 'active' as SubscriptionStatus,
        provider: 'payu',
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        creditsIncluded: creditsGranted,
        creditsUsed: 0,
        // No PayU Standing Instruction mandate is registered by the
        // one-time hosted-checkout flow, so there is no auto-renewal to
        // promise — cancelAtPeriodEnd: true reflects that honestly rather
        // than implying a recurring charge will happen on its own. See
        // docs/PAYMENT_GATEWAY.md "Recurring billing" for the SI path.
        cancelAtPeriodEnd: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      tx.set(subscriptionRef, subscriptionData, { merge: true });

      // set+merge, not update — a webhook could in principle arrive for a
      // txnid whose users/{uid} doc write from onUserCreatedHandler hasn't
      // landed yet (or, in a test/edge case, doesn't exist at all); merge
      // is defensive here without changing behavior for the normal case.
      tx.set(
        db.collection('users').doc(userId),
        { subscriptionId: txnid, updatedAt: serverTimestamp() },
        { merge: true }
      );
    });

    await trackEvent(
      ANALYTICS_EVENTS.SUBSCRIPTION_STARTED,
      userId,
      undefined,
      undefined,
      undefined,
      { subscriptionId: txnid, planId, provider: 'payu' }
    );
    return;
  }

  if (status === 'failure') {
    await transactionRef.update({ status: 'failed', updatedAt: serverTimestamp() });
    return;
  }

  if (status === 'pending') {
    await transactionRef.update({ status: 'pending', updatedAt: serverTimestamp() });
    return;
  }

  // usercancel / dropped / any other PayU status — treat conservatively as
  // no-credit, persisted for visibility, never a silent success.
  await transactionRef.update({ status: 'canceled', updatedAt: serverTimestamp() });
}
