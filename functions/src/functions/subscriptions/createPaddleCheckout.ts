import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { getUserDoc } from '../../services/firestore';
import { getEnvConfig } from '../../config/env';
import { PRICING, getMonthlyCredits, getPlanPrice } from '../../config/pricing';
import {
  getPaddleClient,
  getPaddlePlanPriceId,
  getPaddlePackPriceId,
  isValidCreditPack,
  describePlanPurchase,
  describeCreditPack,
  type PaidPlan,
} from '../../services/paddle';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';

const db = admin.firestore();

const PAID_PLANS = ['starter', 'business', 'pro', 'agency'] as const;

/**
 * Exactly one of `planId` (subscription) or `creditPack` (one-time top-up).
 * The client never sends a price, amount or price ID — only which Mitra product
 * it wants. Everything monetary is resolved server-side.
 */
const createPaddleCheckoutSchema = z
  .object({
    planId: z.enum(PAID_PLANS).optional(),
    billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
    creditPack: z.number().int().positive().optional(),
  })
  .refine((v) => (v.planId === undefined) !== (v.creditPack === undefined), {
    message: 'Provide exactly one of planId or creditPack',
  });

export interface CreatePaddleCheckoutResponse {
  /** Paddle transaction ID — open it with Paddle.js `Checkout.open({ transactionId })`. */
  transactionId: string;
  /**
   * The exact Paddle price ID the transaction was created with. The client compares it with
   * the price ID it displayed and refuses to open checkout on a mismatch.
   */
  priceId: string;
  /** Hosted checkout URL, only present if a default payment link is set in the Paddle dashboard. */
  checkoutUrl?: string;
}

/**
 * Paddle returns 409 `customer_already_exists` (with the existing ctm_ id in the
 * detail) when a customer with the same email exists — expected after a retry,
 * a wiped Firestore user doc, or sandbox reuse. Recover the existing ID.
 */
function existingCustomerIdFromConflict(error: unknown): string | undefined {
  const e = error as { code?: string; detail?: string } | undefined;
  if (e?.code !== 'customer_already_exists' && e?.code !== 'conflict') return undefined;
  return e.detail?.match(/ctm_[a-z0-9]+/)?.[0];
}

/**
 * Creates an unpaid Paddle transaction for a subscription plan or a credit pack
 * and returns its ID for the Paddle.js overlay.
 *
 * Identity flow (checkout -> webhook):
 *   - `transaction.id` (txn_...) is the key of our pending `transactions/{id}` record.
 *     The webhook's `transaction.completed` carries the same ID, so nothing synthetic
 *     is needed to correlate them.
 *   - `custom_data.firebaseUid` identifies the Mitra user. Paddle copies a
 *     transaction's custom_data onto the subscription it creates, and recurring
 *     transactions inherit the subscription's — the webhook still falls back to the
 *     stored subscription / customer ID if it is ever absent.
 *   - What is granted is decided from the Paddle price ID (our env config), never
 *     from custom_data.
 */
export const createPaddleCheckout = onCall(
  {
    region: 'asia-south1',
    enforceAppCheck: true,
    maxInstances: 20,
    secrets: ['PADDLE_API_KEY'],
  },
  validatedCallable(createPaddleCheckoutSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('createPaddleCheckout', {
      userId: context.userId,
      planId: data.planId,
      creditPack: data.creditPack,
    });

    try {
      await checkRateLimit(context.userId, 'createPaddleCheckout');

      const user = await getUserDoc(context.userId);
      if (!user) {
        throw new HttpsError('not-found', 'User not found');
      }

      const envConfig = getEnvConfig();
      if (!envConfig.PADDLE_API_KEY) {
        throw new HttpsError(
          'failed-precondition',
          'Payments are not fully configured yet. Please try again later.'
        );
      }

      // Resolve the price + what this purchase is, server-side.
      let priceId: string;
      let purchase:
        | { kind: 'subscription'; planId: PaidPlan; billingCycle: 'monthly' | 'yearly' }
        | { kind: 'credit_pack'; credits: number };

      if (data.creditPack !== undefined) {
        if (!isValidCreditPack(data.creditPack)) {
          throw new HttpsError('invalid-argument', 'Unknown credit pack');
        }
        purchase = { kind: 'credit_pack', credits: data.creditPack };
        priceId = getPaddlePackPriceId(data.creditPack);
      } else {
        const planId = data.planId as PaidPlan;
        const billingCycle = data.billingCycle ?? 'monthly';
        purchase = { kind: 'subscription', planId, billingCycle };
        priceId = getPaddlePlanPriceId(planId, billingCycle);

        // Never create a second concurrent subscription (double billing). Plan changes
        // on an existing subscription are a separate flow (not yet implemented).
        const userSnap = await db.collection('users').doc(context.userId).get();
        const existingSubId = userSnap.data()?.['subscriptionId'] as string | undefined;
        if (existingSubId) {
          const sub = (await db.collection('subscriptions').doc(existingSubId).get()).data();
          const live =
            sub &&
            sub['provider'] === 'paddle' &&
            ['active', 'trialing', 'past_due'].includes(sub['status'] as string) &&
            sub['cancelAtPeriodEnd'] !== true;
          if (live) {
            throw new HttpsError(
              'failed-precondition',
              'You already have an active subscription. Cancel it first to switch plans.'
            );
          }
        }
      }

      const paddle = getPaddleClient();

      // Look up or create the Paddle customer so checkout is pre-filled.
      const userRef = db.collection('users').doc(context.userId);
      const userData = (await userRef.get()).data();
      let paddleCustomerId = userData?.['paddleCustomerId'] as string | undefined;
      if (!paddleCustomerId) {
        try {
          const customer = await paddle.customers.create({
            email: user.email,
            name: user.displayName || undefined,
            customData: { firebaseUid: context.userId },
          });
          paddleCustomerId = customer.id;
        } catch (error) {
          const existing = existingCustomerIdFromConflict(error);
          if (!existing) throw error;
          paddleCustomerId = existing;
        }
        await userRef.set({ paddleCustomerId }, { merge: true });
      }

      const customData =
        purchase.kind === 'subscription'
          ? {
              firebaseUid: context.userId,
              kind: 'subscription',
              planId: purchase.planId,
              billingCycle: purchase.billingCycle,
            }
          : { firebaseUid: context.userId, kind: 'credit_pack', credits: purchase.credits };

      // Status "draft"/"ready": awaiting payment. Checkout happens in the Paddle.js overlay.
      const transaction = await paddle.transactions.create({
        items: [{ priceId, quantity: 1 }],
        customerId: paddleCustomerId,
        customData,
      });

      // Pending record keyed by the real Paddle transaction ID, so paddleWebhook has
      // something to reconcile against. Expected amounts come from pricing.ts.
      const expected =
        purchase.kind === 'credit_pack'
          ? {
              priceINR:
                PRICING.topUpPacks.find((p) => p.credits === purchase.credits)?.priceINR ?? 0,
              credits: purchase.credits,
              description: describeCreditPack(purchase.credits),
            }
          : {
              priceINR: getPlanPrice(purchase.planId, purchase.billingCycle),
              credits: getMonthlyCredits(purchase.planId),
              description: describePlanPurchase('web', purchase.planId, purchase.billingCycle),
            };

      await db
        .collection('transactions')
        .doc(transaction.id)
        .set({
          transactionId: transaction.id,
          userId: context.userId,
          type: purchase.kind === 'credit_pack' ? 'credit_purchase' : 'subscription',
          amount: expected.credits,
          currency: 'INR',
          balanceAfter: 0,
          description: expected.description,
          provider: 'paddle',
          paddleTransactionId: transaction.id,
          paddleCustomerId,
          paddlePriceId: priceId,
          status: 'pending',
          metadata: { ...purchase, expectedPriceINR: expected.priceINR },
          createdAt: FieldValue.serverTimestamp(),
        });

      // Earlier checkouts this user opened but never paid are abandoned drafts. Mark them
      // expired so they don't linger as "pending" purchases in the billing history. Best
      // effort: a failure here must never block the checkout that just succeeded. (If an old
      // overlay is somehow paid later, paddleWebhook still completes it by transaction ID.)
      try {
        const stale = await db
          .collection('transactions')
          .where('userId', '==', context.userId)
          .where('provider', '==', 'paddle')
          .where('status', '==', 'pending')
          .get();
        const batch = db.batch();
        let expired = 0;
        for (const doc of stale.docs) {
          if (doc.id === transaction.id) continue;
          batch.update(doc.ref, { status: 'expired', updatedAt: FieldValue.serverTimestamp() });
          expired++;
        }
        if (expired > 0) await batch.commit();
      } catch (expireError) {
        logger.warn('createPaddleCheckout: could not expire stale pending checkouts', {
          error: expireError instanceof Error ? expireError.message : String(expireError),
        });
      }

      logFunctionComplete(logger, startTime, {
        success: true,
        transactionId: transaction.id,
        kind: purchase.kind,
      });

      return {
        transactionId: transaction.id,
        priceId,
        checkoutUrl: transaction.checkout?.url ?? undefined,
      } satisfies CreatePaddleCheckoutResponse;
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
