import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { getUserDoc } from '../../services/firestore';
import { getEnvConfig } from '../../config/env';
import { PRICING, getMonthlyCredits, getPlanPrice } from '../../config/pricing';
import { createCashfreeOrder, describeCashfreePurchase } from '../../services/cashfree';
import { isValidCreditPack, type PaidPlan } from '../../services/paddle';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';

const db = admin.firestore();

const PAID_PLANS = ['starter', 'business', 'pro', 'agency'] as const;

const createCashfreeCheckoutSchema = z
  .object({
    planId: z.enum(PAID_PLANS).optional(),
    billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
    creditPack: z.number().int().positive().optional(),
    returnUrl: z.string().url().optional(),
  })
  .refine((v) => (v.planId === undefined) !== (v.creditPack === undefined), {
    message: 'Provide exactly one of planId or creditPack',
  });

export interface CreateCashfreeCheckoutResponse {
  orderId: string;
  paymentSessionId: string;
  environment: 'sandbox' | 'production';
  amountINR: number;
  currency: 'INR';
}

export const createCashfreeCheckout = onCall(
  {
    region: 'asia-south1',
    enforceAppCheck: true,
    maxInstances: 20,
    secrets: ['CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY', 'CASHFREE_WEBHOOK_SECRET'],
  },
  validatedCallable(createCashfreeCheckoutSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('createCashfreeCheckout', {
      userId: context.userId,
      planId: data.planId,
      creditPack: data.creditPack,
    });

    try {
      await checkRateLimit(context.userId, 'createCashfreeCheckout');

      const user = await getUserDoc(context.userId);
      if (!user) {
        throw new HttpsError('not-found', 'User not found');
      }

      const envConfig = getEnvConfig();
      if (!envConfig.CASHFREE_APP_ID || !envConfig.CASHFREE_SECRET_KEY) {
        throw new HttpsError(
          'failed-precondition',
          'Payments are not fully configured yet. Please try again later.'
        );
      }

      // Resolve purchase details and canonical prices server-side.
      let purchase:
        | { kind: 'subscription'; planId: PaidPlan; billingCycle: 'monthly' | 'yearly'; priceINR: number; credits: number }
        | { kind: 'credit_pack'; credits: number; priceINR: number };

      if (data.creditPack !== undefined) {
        if (!isValidCreditPack(data.creditPack)) {
          throw new HttpsError('invalid-argument', 'Unknown credit pack');
        }
        const pack = PRICING.topUpPacks.find((p) => p.credits === data.creditPack);
        if (!pack) {
          throw new HttpsError('invalid-argument', 'Invalid credit pack configuration');
        }
        purchase = { kind: 'credit_pack', credits: data.creditPack, priceINR: pack.priceINR };
      } else {
        const planId = data.planId as PaidPlan;
        const billingCycle = data.billingCycle ?? 'monthly';
        const priceINR = getPlanPrice(planId, billingCycle);
        const credits = getMonthlyCredits(planId);
        purchase = { kind: 'subscription', planId, billingCycle, priceINR, credits };

        // Prevent duplicate active subscriptions
        const userSnap = await db.collection('users').doc(context.userId).get();
        const existingSubId = userSnap.data()?.['subscriptionId'] as string | undefined;
        if (existingSubId) {
          const sub = (await db.collection('subscriptions').doc(existingSubId).get()).data();
          const live =
            sub &&
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

      const description = describeCashfreePurchase(
        purchase.kind,
        purchase.kind === 'subscription' ? purchase.planId : undefined,
        purchase.kind === 'subscription' ? purchase.billingCycle : undefined,
        purchase.kind === 'credit_pack' ? purchase.credits : undefined
      );

      // Create order with Cashfree API
      const result = await createCashfreeOrder({
        userId: context.userId,
        userEmail: user.email,
        userName: user.displayName || undefined,
        userPhone: user.phone || undefined,
        item: purchase,
        returnUrl: data.returnUrl,
      });

      // Write pending transaction document in Firestore
      await db
        .collection('transactions')
        .doc(result.orderId)
        .set({
          transactionId: result.orderId,
          userId: context.userId,
          type: purchase.kind === 'credit_pack' ? 'credit_purchase' : 'subscription',
          amount: purchase.credits,
          currency: 'INR',
          balanceAfter: 0,
          description,
          provider: 'cashfree',
          cashfreeOrderId: result.orderId,
          cashfreePaymentSessionId: result.paymentSessionId,
          status: 'pending',
          metadata: {
            ...purchase,
            priceINR: purchase.priceINR,
            environment: result.environment,
          },
          createdAt: FieldValue.serverTimestamp(),
        });

      // Expire stale pending checkouts for this user best-effort
      try {
        const stale = await db
          .collection('transactions')
          .where('userId', '==', context.userId)
          .where('provider', '==', 'cashfree')
          .where('status', '==', 'pending')
          .get();
        const batch = db.batch();
        let expired = 0;
        for (const doc of stale.docs) {
          if (doc.id === result.orderId) continue;
          batch.update(doc.ref, { status: 'expired', updatedAt: FieldValue.serverTimestamp() });
          expired++;
        }
        if (expired > 0) await batch.commit();
      } catch (expireError) {
        logger.warn('createCashfreeCheckout: could not expire stale pending checkouts', {
          error: expireError instanceof Error ? expireError.message : String(expireError),
        });
      }

      logFunctionComplete(logger, startTime, {
        success: true,
        orderId: result.orderId,
        kind: purchase.kind,
      });

      return {
        orderId: result.orderId,
        paymentSessionId: result.paymentSessionId,
        environment: result.environment,
        amountINR: result.amountINR,
        currency: 'INR',
      } satisfies CreateCashfreeCheckoutResponse;
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
