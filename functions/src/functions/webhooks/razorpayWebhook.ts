import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getEnvConfig } from '../../config/env';
import {
  createLogger,
  logFunctionStart,
  logFunctionComplete,
  logFunctionError,
} from '../../utils/logging';

// Phase 14: the per-event handlers below run outside the request-scoped
// logger created in the onRequest handler, but still need to report
// diagnosable failures (which payment/subscription, which user, why).
// A module-level logger keeps that structured instead of falling back to
// bare console.* calls that previously dumped the FULL Razorpay payment/
// subscription object — which can carry the payer's email, phone, and
// bank/VPA details — straight into Cloud Logging.
const webhookLogger = createLogger({ function: 'razorpayWebhook' });
import { trackEvent, ANALYTICS_EVENTS } from '../../services/analyticsService';
import {
  verifyWebhookSignature,
  getRazorpayClient,
  calculateCreditsToGrant,
} from '../../services/razorpay';
import {
  getUsageDocId,
  getUsageDoc,
  createUsageDoc,
  incrementUsageField,
} from '../../services/firestore';
import { createTransactionDoc } from '../../services/firestore';
import type {
  Transaction,
  TransactionType,
  TransactionStatus,
  Usage,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../types';

const db = admin.firestore();
const config = getEnvConfig();

function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

// Helper to get raw body from request
function getRawBody(req: any): string {
  if (req.rawBody) {
    return req.rawBody.toString();
  }
  // For v2 functions, the body is already parsed
  return JSON.stringify(req.body);
}

export const razorpayWebhook = onRequest({ region: 'asia-south1' }, async (req, res) => {
  const { logger, startTime } = logFunctionStart('razorpayWebhook', {
    method: req.method,
    url: req.url,
  });

  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    const webhookSecret = config.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('Razorpay webhook secret not configured', new Error('Missing webhook secret'));
      res.status(500).send('Webhook secret not configured');
      return;
    }

    // Get raw body for signature verification
    const rawBody = getRawBody(req);
    const signature = req.headers['x-razorpay-signature'] as string;

    if (!signature) {
      logger.error('Missing Razorpay signature', new Error('Missing signature header'));
      res.status(400).send('Missing signature');
      return;
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      logger.error('Invalid webhook signature', new Error('Signature verification failed'));
      res.status(400).send('Invalid signature');
      return;
    }

    const event = req.body;
    logger.info('Received Razorpay webhook', { eventType: event.event });

    const eventId = event.id;
    if (!eventId) {
      logger.error(
        'Webhook event missing id — cannot safely deduplicate',
        new Error('Missing event.id')
      );
      res.status(400).send('Missing event id');
      return;
    }

    // Idempotency, keyed on Razorpay's own event ID (not a client-supplied
    // value). This must be an atomic claim, not a plain get-then-set:
    // Razorpay retries webhook delivery whenever it doesn't receive a
    // prompt 200 response, so two deliveries of the SAME event can
    // legitimately arrive close enough together to race. A non-atomic
    // "read processedRef, then later write it" (the original shape of
    // this code) leaves a window where both deliveries read
    // processedSnap.exists === false and both go on to process the event
    // — for payment.captured, that means granting credits twice for one
    // payment. Claiming the doc inside a transaction relies on
    // Firestore's transaction retry-on-conflict: if two callers race,
    // Firestore aborts and retries the loser's callback, which then
    // observes the winner's committed claim and backs off — this is the
    // same correctness mechanism functions/src/services/usageControl.ts's
    // reservation already depends on.
    const processedRef = db.collection('processed_webhook_events').doc(eventId);
    const claimed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(processedRef);
      if (snap.exists) {
        return false;
      }
      tx.set(processedRef, {
        eventId,
        eventType: event.event,
        status: 'processing',
        claimedAt: serverTimestamp(),
      });
      return true;
    });

    if (!claimed) {
      logger.info('Webhook already processed (or currently being processed)', { eventId });
      res.status(200).send('OK');
      return;
    }

    try {
      // Process the event
      await processWebhookEvent(event);
    } catch (processingError) {
      // Release the claim so a legitimate Razorpay retry (triggered by
      // this handler's non-2xx response below) can actually reprocess
      // the event, rather than being permanently blocked by a "claimed"
      // marker for an event that never actually completed.
      await processedRef.delete().catch(() => undefined);
      throw processingError;
    }

    // Mark as processed only after the event has actually been handled
    // successfully — a webhook that fails mid-processing must remain
    // reprocessable, not silently marked done.
    await processedRef.set({
      eventId,
      eventType: event.event,
      status: 'processed',
      processedAt: serverTimestamp(),
      payload: event,
    });

    logFunctionComplete(logger, startTime, { success: true, eventId, eventType: event.event });
    res.status(200).send('OK');
  } catch (error) {
    logFunctionError(logger, startTime, error as Error);
    res.status(500).send('Internal server error');
  }
});

async function processWebhookEvent(event: any): Promise<void> {
  const eventType = event.event;
  const payload = event.payload;

  switch (eventType) {
    case 'payment.captured':
      await handlePaymentCaptured(payload.payment.entity);
      break;
    case 'payment.failed':
      await handlePaymentFailed(payload.payment.entity);
      break;
    case 'subscription.activated':
      await handleSubscriptionActivated(payload.subscription.entity);
      break;
    case 'subscription.charged':
      await handleSubscriptionCharged(payload.subscription.entity, payload.payment?.entity);
      break;
    case 'subscription.paused':
      await handleSubscriptionPaused(payload.subscription.entity);
      break;
    case 'subscription.resumed':
      await handleSubscriptionResumed(payload.subscription.entity);
      break;
    case 'subscription.cancelled':
      await handleSubscriptionCancelled(payload.subscription.entity);
      break;
    case 'subscription.completed':
      await handleSubscriptionCompleted(payload.subscription.entity);
      break;
    default:
      // Log unhandled events but don't fail
      webhookLogger.info('Unhandled webhook event type', { eventType });
  }
}

async function handlePaymentCaptured(payment: any): Promise<void> {
  const userId = payment.notes?.userId;
  const planId = payment.notes?.planId as SubscriptionPlan | undefined;

  if (!userId || !planId) {
    webhookLogger.warn('Payment captured but missing userId or planId in notes', {
      paymentId: payment.id,
      hasUserId: Boolean(userId),
      hasPlanId: Boolean(planId),
    });
    return;
  }

  // Grant credits for the plan
  const creditsToGrant = calculateCreditsToGrant(planId);
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const usageId = getUsageDocId(userId, periodStart);

  await db.runTransaction(async (tx) => {
    const usageRef = db.collection('usage').doc(usageId);
    const usageSnap = await tx.get(usageRef);

    if (!usageSnap.exists) {
      // Create usage doc if it doesn't exist
      const newUsage: Usage = {
        usageId,
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

    // Increment credits included (grant credits)
    tx.update(usageRef, {
      creditsIncluded: FieldValue.increment(creditsToGrant),
      planId,
      updatedAt: serverTimestamp(),
    });

    // Create transaction record
    const transactionRef = db.collection('transactions').doc(payment.id);
    const transaction: Transaction = {
      transactionId: payment.id,
      userId,
      type: 'subscription' as TransactionType,
      amount: payment.amount / 100, // Convert from paise to INR
      currency: 'INR',
      balanceAfter: 0, // Will be calculated by client
      description: `Subscription payment for ${planId} plan`,
      razorpayPaymentId: payment.id,
      razorpayOrderId: payment.order_id,
      status: 'completed' as TransactionStatus,
      metadata: { planId, creditsGranted: creditsToGrant },
      createdAt: new Date(payment.created_at * 1000).toISOString(),
    };
    tx.set(transactionRef, transaction);
  });
}

async function handlePaymentFailed(payment: any): Promise<void> {
  const userId = payment.notes?.userId;
  const planId = payment.notes?.planId;

  if (!userId) {
    webhookLogger.warn('Payment failed but missing userId in notes', {
      paymentId: payment.id,
    });
    return;
  }

  // Create failed transaction record
  const transactionRef = db.collection('transactions').doc(payment.id);
  await transactionRef.set({
    transactionId: payment.id,
    userId,
    type: 'subscription' as TransactionType,
    amount: payment.amount / 100,
    currency: 'INR',
    balanceAfter: 0,
    description: `Failed subscription payment for ${planId} plan`,
    razorpayPaymentId: payment.id,
    razorpayOrderId: payment.order_id,
    status: 'failed' as TransactionStatus,
    metadata: { planId, error: payment.error_description },
    createdAt: new Date(payment.created_at * 1000).toISOString(),
  });
}

async function handleSubscriptionActivated(subscription: any): Promise<void> {
  const userId = subscription.notes?.userId;
  const planId = subscription.notes?.planId as SubscriptionPlan | undefined;

  if (!userId || !planId) {
    webhookLogger.warn('Subscription activated but missing userId or planId', {
      subscriptionId: subscription.id,
      hasUserId: Boolean(userId),
      hasPlanId: Boolean(planId),
    });
    return;
  }

  const subscriptionRef = db.collection('subscriptions').doc(subscription.id);
  const subscriptionData: Subscription = {
    subscriptionId: subscription.id,
    userId,
    planId,
    status: 'active' as SubscriptionStatus,
    razorpaySubscriptionId: subscription.id,
    razorpayCustomerId: subscription.customer_id,
    currentPeriodStart: new Date(subscription.current_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_end * 1000).toISOString(),
    creditsIncluded: calculateCreditsToGrant(planId),
    creditsUsed: 0,
    cancelAtPeriodEnd: false,
    createdAt: new Date(subscription.created_at * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await subscriptionRef.set(subscriptionData, { merge: true });

  // Update user document with subscription ID
  await db.collection('users').doc(userId).update({
    subscriptionId: subscription.id,
    updatedAt: serverTimestamp(),
  });

  // Track subscription_started event - verified subscription/payment state
  await trackEvent(
    ANALYTICS_EVENTS.SUBSCRIPTION_STARTED,
    userId,
    /* businessId */ undefined,
    undefined,
    undefined,
    {
      subscriptionId: subscription.id,
      planId,
    }
  );
}

async function handleSubscriptionCharged(subscription: any, payment: any): Promise<void> {
  const userId = subscription.notes?.userId;
  const planId = subscription.notes?.planId as SubscriptionPlan | undefined;

  if (!userId || !planId) {
    webhookLogger.warn('Subscription charged but missing userId or planId', {
      subscriptionId: subscription.id,
      hasUserId: Boolean(userId),
      hasPlanId: Boolean(planId),
    });
    return;
  }

  // Grant credits for the new billing period
  const creditsToGrant = calculateCreditsToGrant(planId);
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const usageId = getUsageDocId(userId, periodStart);

  await db.runTransaction(async (tx) => {
    const usageRef = db.collection('usage').doc(usageId);
    const usageSnap = await tx.get(usageRef);

    if (!usageSnap.exists) {
      const newUsage: Usage = {
        usageId,
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

    // Create transaction record
    const transactionRef = db.collection('transactions').doc(payment.id);
    const transaction: Transaction = {
      transactionId: payment.id,
      userId,
      type: 'subscription' as TransactionType,
      amount: payment.amount / 100,
      currency: 'INR',
      balanceAfter: 0,
      description: `Subscription renewal for ${planId} plan`,
      razorpayPaymentId: payment.id,
      razorpayOrderId: payment.order_id,
      razorpaySubscriptionId: subscription.id,
      status: 'completed' as TransactionStatus,
      metadata: { planId, creditsGranted: creditsToGrant },
      createdAt: new Date(payment.created_at * 1000).toISOString(),
    };
    tx.set(transactionRef, transaction);
  });

  // Update subscription period
  await db
    .collection('subscriptions')
    .doc(subscription.id)
    .update({
      currentPeriodStart: new Date(subscription.current_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_end * 1000).toISOString(),
      creditsIncluded: FieldValue.increment(creditsToGrant),
      updatedAt: serverTimestamp(),
    });
}

async function handleSubscriptionPaused(subscription: any): Promise<void> {
  await db
    .collection('subscriptions')
    .doc(subscription.id)
    .update({
      status: 'paused' as SubscriptionStatus,
      updatedAt: serverTimestamp(),
    });
}

async function handleSubscriptionResumed(subscription: any): Promise<void> {
  await db
    .collection('subscriptions')
    .doc(subscription.id)
    .update({
      status: 'active' as SubscriptionStatus,
      updatedAt: serverTimestamp(),
    });
}

async function handleSubscriptionCancelled(subscription: any): Promise<void> {
  await db
    .collection('subscriptions')
    .doc(subscription.id)
    .update({
      status: 'canceled' as SubscriptionStatus,
      canceledAt: new Date().toISOString(),
      cancelAtPeriodEnd: true,
      updatedAt: serverTimestamp(),
    });
}

async function handleSubscriptionCompleted(subscription: any): Promise<void> {
  await db
    .collection('subscriptions')
    .doc(subscription.id)
    .update({
      status: 'completed' as SubscriptionStatus,
      updatedAt: serverTimestamp(),
    });
}
