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
import { verifyCashfreeWebhookSignature } from '../../services/cashfree';
import {
  applyPlanEntitlement,
  grantTopUpCredits,
  getCurrentUsageRefAndSnap,
  getPeriodCreditAllowance,
} from '../../services/billing';
import { getMonthlyCredits, type SubscriptionPlan } from '../../config/pricing';
import type { PaidPlan, BillingCycle } from '../../services/paymentProvider';
import { isProviderActive, recordIgnoredProviderEvent } from '../../services/activeProvider';
import { decidePurchase, isTermLive } from '../../services/prepaidTerm';

const db = admin.firestore();
const webhookLogger = createLogger({ function: 'cashfreeWebhook' });

export interface CashfreeWebhookPayload {
  type: string;
  event_time?: string;
  data?: {
    order?: {
      order_id: string;
      order_amount: number;
      order_currency: string;
      order_tags?: Record<string, string>;
    };
    payment?: {
      cf_payment_id: string | number;
      payment_status: string;
      payment_amount: number;
      payment_currency: string;
      payment_message?: string;
      payment_time?: string;
      bank_reference?: string;
    };
    customer_details?: {
      customer_id?: string;
      customer_email?: string;
      customer_phone?: string;
      customer_name?: string;
    };
    subscription?: {
      subscription_id: string;
      status: string;
      plan_details?: { plan_id: string };
      customer_details?: { customer_id: string };
      current_period_start?: string;
      current_period_end?: string;
    };
    refund?: {
      refund_id: string;
      refund_status: string;
      refund_amount: number;
    };
  };
}

/**
 * Cashfree server-to-server webhook endpoint for payment fulfillment.
 */
export const cashfreeWebhook = onRequest(
  {
    region: 'asia-south1',
    secrets: ['CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY', 'CASHFREE_WEBHOOK_SECRET'],
  },
  async (req, res) => {
    const { logger, startTime } = logFunctionStart('cashfreeWebhook', { method: req.method });

    try {
      if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
      }

      const signature = req.headers['x-webhook-signature'] as string;
      const timestamp = req.headers['x-webhook-timestamp'] as string;

      if (!signature || !timestamp) {
        logger.error(
          'cashfreeWebhook missing signature or timestamp headers',
          new Error('Missing headers')
        );
        res.status(400).send('Missing signature or timestamp header');
        return;
      }

      const rawBody = req.rawBody
        ? req.rawBody.toString('utf8')
        : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body);

      const isValid = verifyCashfreeWebhookSignature(rawBody, signature, timestamp);
      if (!isValid) {
        logger.error(
          'cashfreeWebhook signature verification failed',
          new Error('Invalid signature')
        );
        res.status(400).send('Invalid webhook signature');
        return;
      }

      const payload = (
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      ) as CashfreeWebhookPayload;

      if (!isProviderActive('cashfree')) {
        const o = payload.data?.order?.order_id ?? payload.data?.refund?.refund_id ?? 'unknown';
        await recordIgnoredProviderEvent('cashfree', `${payload.type}_${o}`, payload.type, {
          orderId: payload.data?.order?.order_id ?? null,
        });
        logger.warn(
          'cashfreeWebhook: event ignored because Cashfree is not the active payment provider',
          {
            eventType: payload.type,
          }
        );
        res.status(200).send('OK (ignored: provider inactive)');
        return;
      }

      await processCashfreeEvent(payload);

      logFunctionComplete(logger, startTime, {
        success: true,
        eventType: payload.type,
      });
      res.status(200).send('OK');
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      res.status(500).send('Internal server error');
    }
  }
);

/**
 * Processes a verified Cashfree webhook payload. Exported for direct emulator testing.
 */
export async function processCashfreeEvent(payload: CashfreeWebhookPayload): Promise<void> {
  const eventType = payload.type;

  switch (eventType) {
    case 'PAYMENT_SUCCESS_WEBHOOK':
    case 'ORDER_PAID_WEBHOOK':
      await handlePaymentSuccess(payload);
      break;

    case 'PAYMENT_FAILED_WEBHOOK':
    case 'PAYMENT_USER_DROPPED_WEBHOOK':
      await handlePaymentFailed(payload);
      break;

    case 'SUBSCRIPTION_STATUS_CHANGE':
      await handleSubscriptionStatusChange(payload);
      break;

    case 'REFUND_STATUS_WEBHOOK':
      await handleRefundStatusChange(payload);
      break;

    default:
      webhookLogger.info('cashfreeWebhook: unhandled event type (no-op)', { eventType });
  }
}

async function handlePaymentSuccess(payload: CashfreeWebhookPayload) {
  const order = payload.data?.order;
  const payment = payload.data?.payment;
  const customer = payload.data?.customer_details;

  if (!order?.order_id) {
    webhookLogger.warn('cashfreeWebhook: missing order_id in payment success payload');
    return;
  }

  const orderId = order.order_id;
  const cfPaymentId = String(payment?.cf_payment_id || orderId);

  // Retrieve existing pending transaction from Firestore
  const txnRef = db.collection('transactions').doc(orderId);
  const txnSnap = await txnRef.get();

  if (!txnSnap.exists) {
    webhookLogger.warn('cashfreeWebhook: order not found in transactions collection', { orderId });
    return;
  }

  const txnData = txnSnap.data()!;
  const userId = (txnData['userId'] as string) || customer?.customer_id;

  if (!userId) {
    webhookLogger.error(
      'cashfreeWebhook: cannot attribute payment to user',
      new Error('Missing userId'),
      { orderId }
    );
    return;
  }

  // The webhook is signed, but a grant must also match the order WE created: the payment succeeded, in INR,
  // for exactly the price the server stored when it created the order (never trust the payload to name the
  // product, and never grant for a short payment).
  const expectedPrice = txnData['metadata']?.['priceINR'] as number | undefined;
  const paidStatus = payment?.payment_status;
  const paidAmount = payment?.payment_amount ?? order.order_amount;
  const paidCurrency = payment?.payment_currency ?? order.order_currency;
  const problems: string[] = [];
  if (paidStatus !== undefined && paidStatus !== 'SUCCESS')
    problems.push(`payment_status=${paidStatus}`);
  if (paidCurrency !== undefined && paidCurrency !== 'INR')
    problems.push(`currency=${paidCurrency}`);
  if (typeof expectedPrice !== 'number') problems.push('no stored price to compare');
  else if (typeof paidAmount !== 'number' || Math.abs(paidAmount - expectedPrice) > 0.005)
    problems.push(`amount ${paidAmount} != expected ${expectedPrice}`);
  if (problems.length > 0) {
    webhookLogger.error(
      'cashfreeWebhook: payment does not match the order, nothing granted',
      new Error(problems.join('; ')),
      { orderId }
    );
    await db
      .collection('cashfree_grants')
      .doc(orderId)
      .set(
        {
          orderId,
          userId,
          status: 'flagged',
          reason: problems.join('; '),
          flaggedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    return;
  }

  const kind = (txnData['metadata']?.['kind'] as 'subscription' | 'credit_pack') || 'subscription';
  const planId = (txnData['metadata']?.['planId'] as PaidPlan) || 'starter';
  const billingCycle = (txnData['metadata']?.['billingCycle'] as BillingCycle) || 'monthly';
  const credits = (txnData['metadata']?.['credits'] as number) || getMonthlyCredits(planId);

  const grantRef = db.collection('cashfree_grants').doc(orderId);

  const result = await db.runTransaction(async (tx) => {
    const [grantSnap, usage] = await Promise.all([
      tx.get(grantRef),
      getCurrentUsageRefAndSnap(tx, userId),
    ]);

    if (grantSnap.exists && grantSnap.data()?.['status'] === 'granted') {
      return { granted: false, reason: 'duplicate' };
    }

    let creditsGranted = 0;

    if (kind === 'subscription') {
      const subId = `sub_cf_${userId}_${planId}`;
      const subRef = db.collection('subscriptions').doc(subId);
      const userRef = db.collection('users').doc(userId);
      const [subSnap, userSnap] = await Promise.all([tx.get(subRef), tx.get(userRef)]);
      const pointerId = userSnap.data()?.['subscriptionId'] as string | undefined;
      const pointerSub =
        pointerId && pointerId !== subId
          ? (await tx.get(db.collection('subscriptions').doc(pointerId))).data()
          : undefined;

      // Prepaid fixed-term rule (services/prepaidTerm.ts): same plan + cycle extends from the current end date;
      // a payment that cannot be applied (another plan/cycle, or another provider's term, still live) is NOT
      // silently granted over it: it is flagged for an operator and the customer is refunded/served manually.
      const decision = decidePurchase(subSnap.data(), planId, billingCycle);
      const conflict = isTermLive(pointerSub)
        ? 'the user already has a live term on another subscription'
        : !decision.allowed
          ? 'the user already has a live term on a different plan or billing cycle'
          : undefined;
      if (conflict || !decision.allowed) {
        tx.set(
          grantRef,
          {
            orderId,
            userId,
            kind,
            planId,
            status: 'flagged',
            reason: conflict ?? 'term conflict',
            needsManualReview: true,
            flaggedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return { granted: false, reason: 'conflict' };
      }

      creditsGranted = applyPlanEntitlement(tx, userId, planId, usage.ref, usage.snap);
      const nowIso = new Date().toISOString();
      const existing = subSnap.data();
      const renewal = decision.kind === 'renewal';

      tx.set(
        subRef,
        {
          subscriptionId: subId,
          userId,
          planId,
          billingCycle,
          status: 'active',
          // A renewal keeps the original start and moves only the end (stacking the paid days).
          currentPeriodStart: renewal ? (existing?.['currentPeriodStart'] ?? nowIso) : nowIso,
          currentPeriodEnd: decision.newEnd,
          termDays: decision.termDays,
          renewals: renewal ? FieldValue.increment(1) : 0,
          creditsIncluded: creditsGranted,
          creditsUsed: 0,
          // Prepaid, fixed term: nothing renews or charges automatically.
          autoRenew: false,
          cancelAtPeriodEnd: false,
          provider: 'cashfree',
          cashfreeOrderId: orderId,
          cashfreePaymentId: cfPaymentId,
          lastOrderId: orderId,
          createdAt: existing?.['createdAt'] ?? nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      // Point user document at subscription
      tx.set(
        userRef,
        { subscriptionId: subId, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    } else {
      creditsGranted = grantTopUpCredits(tx, userId, credits, usage.ref, usage.snap);
    }

    const usedNow = (usage.snap.data()?.['creditsUsed'] as number | undefined) ?? 0;
    const bonusAfter =
      (usage.snap.data()?.['bonusCredits'] as number | undefined) ??
      (kind === 'credit_pack' ? credits : 0);
    const planForAllowance =
      (usage.snap.data()?.['planId'] as SubscriptionPlan | undefined) ?? planId;

    // Update transaction to completed
    tx.set(
      txnRef,
      {
        status: 'completed',
        balanceAfter: getPeriodCreditAllowance(planForAllowance, bonusAfter) - usedNow,
        cashfreePaymentId: cfPaymentId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Record idempotency grant document
    tx.set(grantRef, {
      orderId,
      cfPaymentId,
      userId,
      kind,
      planId: kind === 'subscription' ? planId : null,
      credits: creditsGranted,
      status: 'granted',
      grantedAt: FieldValue.serverTimestamp(),
    });

    return { granted: true };
  });

  if (!result.granted && result.reason === 'conflict') {
    webhookLogger.error(
      'cashfreeWebhook: PAID order could not be applied (live term conflict); flagged for manual refund/review',
      new Error('term conflict'),
      { orderId, userId }
    );
    return;
  }

  if (!result.granted) {
    webhookLogger.info('cashfreeWebhook: payment already fulfilled (duplicate webhook)', {
      orderId,
    });
    return;
  }

  if (kind === 'subscription') {
    await trackEvent(
      ANALYTICS_EVENTS.SUBSCRIPTION_STARTED,
      userId,
      undefined,
      undefined,
      undefined,
      {
        orderId,
        planId,
        billingCycle,
        provider: 'cashfree',
      }
    );
  } else {
    await trackEvent(ANALYTICS_EVENTS.CREDIT_PURCHASED, userId, undefined, undefined, undefined, {
      orderId,
      credits,
      provider: 'cashfree',
    });
  }

  webhookLogger.info('cashfreeWebhook: payment successfully fulfilled', {
    orderId,
    userId,
    kind,
    credits,
  });
}

async function handlePaymentFailed(payload: CashfreeWebhookPayload) {
  const orderId = payload.data?.order?.order_id;
  if (!orderId) return;

  webhookLogger.warn('cashfreeWebhook: payment failed/dropped', { orderId });

  const txnRef = db.collection('transactions').doc(orderId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(txnRef);
    if (snap.exists && snap.data()?.['status'] === 'pending') {
      tx.set(
        txnRef,
        { status: 'failed', updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }
  });
}

async function handleSubscriptionStatusChange(payload: CashfreeWebhookPayload) {
  const sub = payload.data?.subscription;
  if (!sub?.subscription_id) return;

  const subRef = db.collection('subscriptions').doc(sub.subscription_id);
  const statusMap: Record<string, string> = {
    ACTIVE: 'active',
    CANCELLED: 'canceled',
    EXPIRED: 'canceled',
    COMPLETED: 'canceled',
  };

  const newStatus = statusMap[sub.status] || 'incomplete';

  await subRef.set(
    {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  webhookLogger.info('cashfreeWebhook: subscription status updated', {
    subscriptionId: sub.subscription_id,
    status: newStatus,
  });
}

async function handleRefundStatusChange(payload: CashfreeWebhookPayload) {
  const refund = payload.data?.refund;
  if (!refund?.refund_id) return;

  const orderId = payload.data?.order?.order_id;
  await db
    .collection('cashfree_refunds')
    .doc(refund.refund_id)
    .set(
      {
        refundId: refund.refund_id,
        orderId: orderId ?? null,
        status: refund.refund_status,
        amount: refund.refund_amount ?? null,
        // Whether a refund removes credits/entitlement is a business-policy decision that is not defined, so
        // an operator reviews every successful refund; nothing is revoked automatically.
        needsManualReview: refund.refund_status === 'SUCCESS',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  if (orderId && refund.refund_status === 'SUCCESS') {
    await db
      .collection('transactions')
      .doc(orderId)
      .set({ reconciliation: { state: 'refunded', refundId: refund.refund_id } }, { merge: true });
  }
  webhookLogger.info('cashfreeWebhook: refund status recorded', {
    refundId: refund.refund_id,
    status: refund.refund_status,
  });
}
