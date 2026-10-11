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
import {
  verifyAndUnmarshalWebhook,
  resolvePaddlePrice,
  describePlanPurchase,
  EventName,
  type PaddlePriceMeaning,
  type PaidPlan,
} from '../../services/paddle';
import {
  applyPlanEntitlement,
  grantTopUpCredits,
  getCurrentUsageRefAndSnap,
  getPeriodCreditAllowance,
} from '../../services/billing';
import { isProviderActive, recordIgnoredProviderEvent } from '../../services/activeProvider';
import type { SubscriptionStatus } from '../../types';
import type { SubscriptionNotification, TransactionNotification } from '@paddle/paddle-node-sdk';

const db = admin.firestore();
const webhookLogger = createLogger({ function: 'paddleWebhook' });

type PaddleEvent = Awaited<ReturnType<typeof verifyAndUnmarshalWebhook>>;

/**
 * Paddle server-to-server webhook — the ONLY place entitlements and credits change.
 *
 * Design
 * ------
 *  - Signature: HMAC verified over the RAW request body (`req.rawBody`). Re-serialising
 *    `req.body` would change bytes and break verification.
 *  - Money events are the single source of grants: credits / plan entitlement are applied
 *    on `transaction.completed` only (first purchase, every renewal, plan changes, packs).
 *    Subscription events merely sync state (status, period, scheduled cancellation).
 *    Applying on both would double-grant, because Paddle emits subscription.created AND
 *    subscription.activated AND transaction.completed for one purchase.
 *  - Idempotency is enforced on the business effect, not just the delivery: each grant
 *    writes a once-only ledger doc `paddle_grants/{transactionId}` in the SAME Firestore
 *    transaction as the entitlement write. A retried / replayed / concurrent delivery of the
 *    same Paddle transaction therefore cannot grant twice, whatever the event IDs are.
 *  - Ordering: Paddle does not guarantee delivery order. Subscription state writes are
 *    skipped when older than `lastPaddleEventAt` already stored.
 *  - What is granted is derived from the Paddle price ID via OUR env config
 *    (resolvePaddlePrice) — never from custom_data or amounts in the payload.
 *
 * Subscribe the notification destination to:
 *   subscription.created, subscription.activated, subscription.updated,
 *   subscription.canceled, subscription.past_due, subscription.paused, subscription.resumed,
 *   transaction.completed, transaction.payment_failed, adjustment.created, adjustment.updated
 */
export const paddleWebhook = onRequest(
  {
    region: 'asia-south1',
    secrets: ['PADDLE_WEBHOOK_SECRET', 'PADDLE_API_KEY'],
  },
  async (req, res) => {
    const { logger, startTime } = logFunctionStart('paddleWebhook', { method: req.method });

    try {
      if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
      }

      const signatureHeader = req.headers['paddle-signature'];
      if (!signatureHeader || typeof signatureHeader !== 'string') {
        logger.error('paddleWebhook missing paddle-signature header', new Error('Missing header'));
        res.status(400).send('Missing Paddle-Signature header');
        return;
      }

      let event: PaddleEvent;
      try {
        const rawBody = req.rawBody
          ? req.rawBody.toString('utf8')
          : typeof req.body === 'string'
            ? req.body
            : JSON.stringify(req.body);
        event = await verifyAndUnmarshalWebhook(rawBody, signatureHeader);
      } catch (sigError) {
        logger.error('paddleWebhook signature verification failed', sigError as Error);
        res.status(400).send('Invalid webhook signature');
        return;
      }

      // Only the ACTIVE provider may grant credits or entitlements. A verified Paddle event arriving while
      // Cashfree is active is acknowledged (so Paddle stops retrying) and recorded for an operator, but
      // changes no subscription, credit or usage state.
      if (!isProviderActive('paddle')) {
        await recordIgnoredProviderEvent('paddle', event.eventId, String(event.eventType), {
          occurredAt: event.occurredAt,
        });
        logger.warn(
          'paddleWebhook: event ignored because Paddle is not the active payment provider',
          {
            eventId: event.eventId,
            eventType: String(event.eventType),
          }
        );
        res.status(200).send('OK (ignored: provider inactive)');
        return;
      }

      await processPaddleEvent(event);

      logFunctionComplete(logger, startTime, {
        success: true,
        eventId: event.eventId,
        eventType: event.eventType,
      });
      res.status(200).send('OK');
    } catch (error) {
      // Non-2xx makes Paddle retry (it retries for ~3 days). Handlers are idempotent.
      logFunctionError(logger, startTime, error as Error);
      res.status(500).send('Internal server error');
    }
  }
);

/**
 * Dispatches a verified Paddle event. Exported so it can be tested directly against the
 * Firestore emulator without constructing signed HTTP requests.
 */
export async function processPaddleEvent(event: PaddleEvent): Promise<void> {
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionActivated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionPastDue:
    case EventName.SubscriptionPaused:
    case EventName.SubscriptionResumed:
      await syncSubscriptionState(
        event.data as unknown as SubscriptionNotification,
        event.occurredAt
      );
      break;

    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(
        event.data as unknown as SubscriptionNotification,
        event.occurredAt
      );
      break;

    case EventName.TransactionCompleted:
      await handleTransactionCompleted(
        event.data as unknown as TransactionNotification,
        event.occurredAt
      );
      break;

    case EventName.TransactionPaymentFailed:
      await handlePaymentFailed(event.data as unknown as TransactionNotification);
      break;

    case EventName.AdjustmentCreated:
    case EventName.AdjustmentUpdated:
      await handleAdjustment(event.data as unknown as AdjustmentNotificationLike, event.occurredAt);
      break;

    default:
      webhookLogger.info('paddleWebhook: unhandled event type (no-op)', {
        eventType: event.eventType,
      });
  }
}

// ---------------------------------------------------------------------------
// Identity resolution
// ---------------------------------------------------------------------------

function firebaseUidFromCustomData(
  customData: Record<string, unknown> | null | undefined
): string | undefined {
  const uid = customData?.['firebaseUid'];
  return typeof uid === 'string' && uid.length > 0 ? uid : undefined;
}

/**
 * Resolves the Mitra user for a Paddle object, in order of trust:
 *   1. custom_data.firebaseUid (set server-side at checkout)
 *   2. the subscription doc we already stored for this Paddle subscription
 *   3. the user whose stored paddleCustomerId matches
 * If (1) and the user's stored paddleCustomerId disagree, the event is refused as an
 * anomaly rather than guessed at.
 */
async function resolveUserId(args: {
  customData: Record<string, unknown> | null | undefined;
  subscriptionId?: string | null;
  customerId?: string | null;
}): Promise<{ userId?: string; anomaly?: string }> {
  const { customData, subscriptionId, customerId } = args;

  const uid = firebaseUidFromCustomData(customData);
  if (uid) {
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) return { anomaly: `custom_data.firebaseUid ${uid} has no user` };
    const storedCustomer = userSnap.data()?.['paddleCustomerId'] as string | undefined;
    if (storedCustomer && customerId && storedCustomer !== customerId) {
      return { anomaly: 'customer ID does not match the user referenced by custom_data' };
    }
    return { userId: uid };
  }

  if (subscriptionId) {
    const subSnap = await db.collection('subscriptions').doc(subscriptionId).get();
    const subUser = subSnap.data()?.['userId'];
    if (typeof subUser === 'string' && subUser) return { userId: subUser };
  }

  if (customerId) {
    const q = await db
      .collection('users')
      .where('paddleCustomerId', '==', customerId)
      .limit(1)
      .get();
    if (!q.empty) return { userId: q.docs[0]!.id };
  }

  return {};
}

function meaningOfFirstItem(
  items: Array<{ price?: { id?: string } | null }> | undefined
): PaddlePriceMeaning | undefined {
  return resolvePaddlePrice(items?.[0]?.price?.id);
}

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'canceled',
  paused: 'incomplete', // Mitra has no pause concept; not an entitled status.
};

// ---------------------------------------------------------------------------
// Subscription state (never grants credits)
// ---------------------------------------------------------------------------

async function syncSubscriptionState(sub: SubscriptionNotification, occurredAt: string) {
  const { userId, anomaly } = await resolveUserId({
    customData: sub.customData as Record<string, unknown> | null,
    subscriptionId: sub.id,
    customerId: sub.customerId,
  });
  if (!userId) {
    webhookLogger.warn('paddleWebhook: cannot attribute subscription to a user', {
      subscriptionId: sub.id,
      anomaly,
    });
    return;
  }

  const meaning = meaningOfFirstItem(sub.items);
  const subRef = db.collection('subscriptions').doc(sub.id);

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(subRef);
    const lastEventAt = existing.data()?.['lastPaddleEventAt'] as string | undefined;
    if (lastEventAt && lastEventAt > occurredAt) {
      webhookLogger.info('paddleWebhook: stale subscription event ignored', {
        subscriptionId: sub.id,
      });
      return;
    }

    const updates: Record<string, unknown> = {
      subscriptionId: sub.id,
      userId,
      provider: 'paddle',
      paddleCustomerId: sub.customerId,
      status: STATUS_MAP[sub.status] ?? 'incomplete',
      // A scheduled cancel sets it; no scheduled change (e.g. user resumed) clears it.
      cancelAtPeriodEnd: sub.scheduledChange?.action === 'cancel',
      lastPaddleEventAt: occurredAt,
      updatedAt: new Date().toISOString(),
    };
    if (meaning?.kind === 'plan') {
      updates['planId'] = meaning.planId;
      updates['billingCycle'] = meaning.billingCycle;
    }
    if (sub.currentBillingPeriod) {
      updates['currentPeriodStart'] = sub.currentBillingPeriod.startsAt;
      updates['currentPeriodEnd'] = sub.currentBillingPeriod.endsAt;
    }
    if (!existing.exists) {
      updates['createdAt'] = new Date().toISOString();
      updates['creditsUsed'] = 0;
    }
    tx.set(subRef, updates, { merge: true });

    // Point the user at this subscription while it is live; entitlements read this pointer.
    if (
      updates['status'] === 'active' ||
      updates['status'] === 'trialing' ||
      updates['status'] === 'past_due'
    ) {
      tx.set(
        db.collection('users').doc(userId),
        { subscriptionId: sub.id, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }
  });
}

async function handleSubscriptionCanceled(sub: SubscriptionNotification, occurredAt: string) {
  const { userId } = await resolveUserId({
    customData: sub.customData as Record<string, unknown> | null,
    subscriptionId: sub.id,
    customerId: sub.customerId,
  });

  const subRef = db.collection('subscriptions').doc(sub.id);
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(subRef);
    const userRef = userId ? db.collection('users').doc(userId) : undefined;
    const userSnap = userRef ? await tx.get(userRef) : undefined;
    const lastEventAt = existing.data()?.['lastPaddleEventAt'] as string | undefined;
    if (lastEventAt && lastEventAt > occurredAt) return;

    // Status only. Credits already earned for the current period are NOT removed — the
    // plan simply stops being renewed, and the next period's usage doc resolves to Free.
    tx.set(
      subRef,
      {
        subscriptionId: sub.id,
        ...(userId ? { userId } : {}),
        provider: 'paddle',
        status: 'canceled',
        cancelAtPeriodEnd: true,
        canceledAt: sub.canceledAt ?? new Date().toISOString(),
        lastPaddleEventAt: occurredAt,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    if (userRef && userSnap) {
      // Only detach if the user still points at THIS subscription (they may have resubscribed).
      if (userSnap.data()?.['subscriptionId'] === sub.id) {
        tx.set(
          userRef,
          { subscriptionId: null, updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Money events (the only place credits / entitlements are granted)
// ---------------------------------------------------------------------------

/** transaction.completed totals are strings in the currency's minor unit. */
function minorToMajor(total: string | undefined): number {
  const n = Number(total);
  return Number.isFinite(n) ? n / 100 : 0;
}

async function flagGrant(txnId: string, reason: string, extra: Record<string, unknown> = {}) {
  webhookLogger.error('paddleWebhook: grant flagged, nothing granted', new Error(reason), {
    transactionId: txnId,
    ...extra,
  });
  await db
    .collection('paddle_grants')
    .doc(txnId)
    .set(
      {
        transactionId: txnId,
        status: 'flagged',
        reason,
        ...extra,
        flaggedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

async function handleTransactionCompleted(txn: TransactionNotification, occurredAt: string) {
  // Card-update / zero-value transactions never carry an entitlement.
  if (txn.origin === 'subscription_payment_method_change') return;

  const meaning = meaningOfFirstItem(txn.items);
  if (!meaning) {
    // Not one of our configured prices (e.g. created manually in the dashboard).
    webhookLogger.warn('paddleWebhook: transaction.completed with unrecognised price, ignored', {
      transactionId: txn.id,
      priceId: txn.items?.[0]?.price?.id,
    });
    return;
  }

  const { userId, anomaly } = await resolveUserId({
    customData: txn.customData as Record<string, unknown> | null,
    subscriptionId: txn.subscriptionId,
    customerId: txn.customerId,
  });
  if (!userId) {
    await flagGrant(txn.id, anomaly ?? 'cannot attribute transaction to a Mitra user');
    return;
  }

  if (meaning.kind === 'plan') {
    if (!txn.subscriptionId) {
      await flagGrant(txn.id, 'plan price completed without a subscription ID', { userId });
      return;
    }
    await grantPlanEntitlement(txn, userId, meaning.planId, meaning.billingCycle, occurredAt);
  } else {
    await grantCreditPack(txn, userId, meaning.credits);
  }
}

/**
 * First purchase, every renewal and every plan change land here. The entitlement is the
 * plan on the current period's usage doc (Mitra's existing model: usage.planId ->
 * monthly credits); this also upserts the subscription doc so the result does not depend
 * on subscription.created having arrived first.
 */
async function grantPlanEntitlement(
  txn: TransactionNotification,
  userId: string,
  planId: PaidPlan,
  billingCycle: 'monthly' | 'yearly',
  occurredAt: string
) {
  const subscriptionId = txn.subscriptionId!;
  const grantRef = db.collection('paddle_grants').doc(txn.id);
  const subRef = db.collection('subscriptions').doc(subscriptionId);
  const txnRef = db.collection('transactions').doc(txn.id);
  const totalMajor = minorToMajor(txn.details?.totals?.total);

  const result = await db.runTransaction(async (tx) => {
    const [grantSnap, subSnap, usage] = await Promise.all([
      tx.get(grantRef),
      tx.get(subRef),
      getCurrentUsageRefAndSnap(tx, userId),
    ]);

    // Once-only guard for this Paddle transaction.
    if (grantSnap.exists && grantSnap.data()?.['status'] === 'granted') return { granted: false };

    // A delivery that arrives after a NEWER subscription event (e.g. a retried payment event
    // landing after subscription.canceled) is still a real payment, so the credits are applied,
    // but it must not move the subscription status/pointer backwards (resurrecting a cancel).
    const lastEventAt = subSnap.data()?.['lastPaddleEventAt'] as string | undefined;
    const existingStatus = subSnap.data()?.['status'] as string | undefined;
    const isStale = !!lastEventAt && lastEventAt > occurredAt;
    const keepExistingState = isStale && !!existingStatus;

    const credits = applyPlanEntitlement(tx, userId, planId, usage.ref, usage.snap);
    const usedNow = (usage.snap.data()?.['creditsUsed'] as number | undefined) ?? 0;
    const bonus = (usage.snap.data()?.['bonusCredits'] as number | undefined) ?? 0;

    const nowIso = new Date().toISOString();
    const periodStart = txn.billingPeriod?.startsAt ?? nowIso;
    const periodEnd =
      txn.billingPeriod?.endsAt ??
      new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 86400_000).toISOString();

    tx.set(
      subRef,
      {
        subscriptionId,
        userId,
        planId,
        billingCycle,
        provider: 'paddle',
        paddleCustomerId: txn.customerId ?? undefined,
        ...(keepExistingState ? {} : { status: 'active' }),
        ...(keepExistingState
          ? {}
          : { currentPeriodStart: periodStart, currentPeriodEnd: periodEnd }),
        creditsIncluded: credits,
        creditsUsed: subSnap.data()?.['creditsUsed'] ?? 0,
        cancelAtPeriodEnd: subSnap.data()?.['cancelAtPeriodEnd'] ?? false,
        createdAt: subSnap.data()?.['createdAt'] ?? nowIso,
        updatedAt: nowIso,
      },
      { merge: true }
    );
    if (!(keepExistingState && existingStatus === 'canceled')) {
      tx.set(
        db.collection('users').doc(userId),
        { subscriptionId, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }

    // Auditable record. The pending one created at checkout is completed; renewals and
    // plan changes (no pending record) get one created here.
    tx.set(
      txnRef,
      {
        transactionId: txn.id,
        userId,
        type: 'subscription',
        amount: credits,
        currency: 'INR',
        balanceAfter: getPeriodCreditAllowance(planId, bonus) - usedNow,
        description: describePlanPurchase(txn.origin, planId, billingCycle),
        provider: 'paddle',
        paddleTransactionId: txn.id,
        paddleSubscriptionId: subscriptionId,
        paddleCustomerId: txn.customerId,
        status: 'completed',
        metadata: {
          planId,
          billingCycle,
          origin: txn.origin,
          paidTotal: totalMajor,
          paidCurrency: txn.currencyCode,
        },
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(grantRef, {
      transactionId: txn.id,
      userId,
      kind: 'plan',
      planId,
      billingCycle,
      origin: txn.origin,
      subscriptionId,
      status: 'granted',
      grantedAt: FieldValue.serverTimestamp(),
    });

    return { granted: true };
  });

  if (!result.granted) {
    webhookLogger.info('paddleWebhook: plan entitlement already applied (duplicate delivery)', {
      transactionId: txn.id,
    });
    return;
  }

  // Renewals / plan changes are not new subscriptions; only count the first purchase.
  if (txn.origin === 'web' || txn.origin === 'api') {
    await trackEvent(
      ANALYTICS_EVENTS.SUBSCRIPTION_STARTED,
      userId,
      undefined,
      undefined,
      undefined,
      {
        subscriptionId,
        planId,
        billingCycle,
        provider: 'paddle',
      }
    );
  }
}

async function grantCreditPack(txn: TransactionNotification, userId: string, credits: number) {
  // A top-up never belongs to a subscription; a pack price on one is a configuration error.
  if (txn.subscriptionId) {
    await flagGrant(txn.id, 'credit pack price completed on a subscription', { userId });
    return;
  }

  const grantRef = db.collection('paddle_grants').doc(txn.id);
  const txnRef = db.collection('transactions').doc(txn.id);
  const totalMajor = minorToMajor(txn.details?.totals?.total);

  const outcome = await db.runTransaction(async (tx) => {
    const [grantSnap, pendingSnap, usage] = await Promise.all([
      tx.get(grantRef),
      tx.get(txnRef),
      getCurrentUsageRefAndSnap(tx, userId),
    ]);

    if (grantSnap.exists && grantSnap.data()?.['status'] === 'granted') return 'duplicate' as const;

    // The pending record is created by createPaddleCheckout for this user. Without it, or
    // for a different user, this is not a purchase made through Mitra's checkout.
    const pending = pendingSnap.data();
    if (!pending) return 'no-pending-record' as const;
    if (pending['userId'] !== userId) return 'user-mismatch' as const;
    if (pending['type'] !== 'credit_purchase') return 'wrong-kind' as const;

    grantTopUpCredits(tx, userId, credits, usage.ref, usage.snap);

    const planId = (usage.snap.data()?.['planId'] as PaidPlan | 'free' | undefined) ?? 'free';
    const bonusAfter = ((usage.snap.data()?.['bonusCredits'] as number | undefined) ?? 0) + credits;
    const usedNow = (usage.snap.data()?.['creditsUsed'] as number | undefined) ?? 0;

    tx.set(
      txnRef,
      {
        amount: credits,
        balanceAfter: getPeriodCreditAllowance(planId, bonusAfter) - usedNow,
        status: 'completed',
        paddleCustomerId: txn.customerId,
        metadata: {
          ...(pending['metadata'] ?? {}),
          credits,
          paidTotal: totalMajor,
          paidCurrency: txn.currencyCode,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(grantRef, {
      transactionId: txn.id,
      userId,
      kind: 'credit_pack',
      credits,
      status: 'granted',
      grantedAt: FieldValue.serverTimestamp(),
    });

    return 'granted' as const;
  });

  if (outcome === 'duplicate') {
    webhookLogger.info('paddleWebhook: credit pack already granted (duplicate delivery)', {
      transactionId: txn.id,
    });
    return;
  }
  if (outcome !== 'granted') {
    await flagGrant(txn.id, `credit pack not granted: ${outcome}`, { userId, credits });
    return;
  }

  await trackEvent(ANALYTICS_EVENTS.CREDIT_PURCHASED, userId, undefined, undefined, undefined, {
    transactionId: txn.id,
    credits,
    provider: 'paddle',
  });
  webhookLogger.info('paddleWebhook: credit pack granted', {
    transactionId: txn.id,
    userId,
    credits,
  });
}

async function handlePaymentFailed(txn: TransactionNotification) {
  // Entitlement is untouched: Paddle's dunning drives subscription.past_due / canceled.
  webhookLogger.warn('paddleWebhook: transaction.payment_failed', {
    transactionId: txn.id,
    subscriptionId: txn.subscriptionId,
  });
  const txnRef = db.collection('transactions').doc(txn.id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(txnRef);
    // Never downgrade a completed record; only a still-pending one becomes failed.
    if (snap.exists && snap.data()?.['status'] === 'pending') {
      tx.set(
        txnRef,
        { status: 'failed', updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Provider-originated reversals (refund / chargeback)
// ---------------------------------------------------------------------------

interface AdjustmentNotificationLike {
  id: string;
  action?: string;
  status?: string;
  transactionId?: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
  currencyCode?: string;
  totals?: { total?: string } | null;
}

/**
 * Records refunds, credits and chargebacks durably (adjustment ID is the document key, so
 * replays and out-of-order updates are idempotent) and marks the original transaction.
 *
 * Deliberately does NOT revoke credits or the subscription. Whether and how a reversed
 * payment removes entitlement is a business-policy decision that is not yet defined, so
 * every approved refund/chargeback is flagged `needsManualReview` for an operator instead
 * of guessing. See docs/BILLING_LIFECYCLE.md.
 */
async function handleAdjustment(adj: AdjustmentNotificationLike, occurredAt: string) {
  const action = adj.action ?? 'unknown';
  const status = adj.status ?? 'unknown';
  const reverses = action === 'refund' || action === 'chargeback';

  const txnId = adj.transactionId ?? undefined;
  const { userId: resolvedUser } = await resolveUserId({
    customData: null,
    subscriptionId: adj.subscriptionId,
    customerId: adj.customerId,
  });

  const adjRef = db.collection('paddle_adjustments').doc(adj.id);
  const txnRef = txnId ? db.collection('transactions').doc(txnId) : undefined;

  const needsManualReview = await db.runTransaction(async (tx) => {
    const [adjSnap, txnSnap] = await Promise.all([tx.get(adjRef), txnRef ? tx.get(txnRef) : null]);
    const last = adjSnap.data()?.['lastEventAt'] as string | undefined;
    if (last && last > occurredAt) return false; // an older delivery of an already-newer state

    const userId = (txnSnap?.data()?.['userId'] as string | undefined) ?? resolvedUser;
    const review = reverses && status === 'approved';

    tx.set(
      adjRef,
      {
        adjustmentId: adj.id,
        action,
        status,
        transactionId: txnId ?? null,
        subscriptionId: adj.subscriptionId ?? null,
        paddleCustomerId: adj.customerId ?? null,
        ...(userId ? { userId } : {}),
        total: adj.totals?.total ?? null,
        currency: adj.currencyCode ?? null,
        needsManualReview: review,
        lastEventAt: occurredAt,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (txnRef && txnSnap?.exists && reverses) {
      const current = txnSnap.data()?.['reconciliation'] as { adjustmentId?: string } | undefined;
      if (review) {
        tx.set(
          txnRef,
          {
            reconciliation: {
              state: action === 'refund' ? 'refunded' : 'chargeback',
              adjustmentId: adj.id,
              at: occurredAt,
            },
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } else if (
        current?.adjustmentId === adj.id &&
        (status === 'rejected' || status === 'reversed')
      ) {
        tx.set(
          txnRef,
          { reconciliation: { state: 'none', adjustmentId: adj.id, at: occurredAt } },
          { merge: true }
        );
      }
    }
    return review;
  });

  if (needsManualReview) {
    webhookLogger.warn('paddleWebhook: approved refund/chargeback recorded, needs manual review', {
      adjustmentId: adj.id,
      action,
      transactionId: txnId,
      userId: resolvedUser,
    });
  } else {
    webhookLogger.info('paddleWebhook: adjustment recorded', {
      adjustmentId: adj.id,
      action,
      status,
    });
  }
}
