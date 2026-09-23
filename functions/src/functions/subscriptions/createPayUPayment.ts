import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { v7 as uuidv7 } from 'uuid';

import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { getUserDoc } from '../../services/firestore';
import { getPlanPrice } from '../../config/pricing';
import { getPayUConfig, generatePaymentHash } from '../../services/payu';
import { getEnvConfig } from '../../config/env';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { SubscriptionPlan } from '../../types';

const db = admin.firestore();

const createPayUPaymentSchema = z.object({
  planId: z.enum(['starter', 'business', 'agency']),
});

/**
 * Initiates a PayU Hosted Checkout payment for a plan purchase — the PayU
 * equivalent of createSubscription.ts's role, but architecturally
 * different: PayU Hosted Checkout is a full-page form-POST redirect, not an
 * in-page JS popup, so this callable returns the exact form fields (plus a
 * server-computed hash) the client must submit via a real HTML form, not a
 * checkout-widget config object.
 *
 * Server-side amount authority (task requirement, non-negotiable): the
 * client sends only `planId`; the price/amount is read from
 * config/pricing.ts here, never accepted from the client. This mirrors
 * createSubscription.ts's existing pattern exactly.
 */
export const createPayUPayment = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 20 },
  validatedCallable(createPayUPaymentSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('createPayUPayment', {
      userId: context.userId,
      planId: data.planId,
    });

    try {
      await checkRateLimit(context.userId, 'createPayUPayment');

      const user = await getUserDoc(context.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const envConfig = getEnvConfig();
      if (!envConfig.PAYU_CALLBACK_URL) {
        // Fails loudly rather than silently pointing PayU at an undefined
        // URL — this must be configured once the callback function's real
        // deployed URL is known (see docs/PAYMENT_GATEWAY.md).
        throw new HttpsError(
          'failed-precondition',
          'Payments are not fully configured yet. Please try again later.'
        );
      }

      const planId = data.planId as SubscriptionPlan;
      const amountINR = getPlanPrice(planId);
      const amount = amountINR.toFixed(2);
      const txnid = uuidv7();

      const payuConfig = getPayUConfig();
      const productinfo = `Mitra ${planId} plan subscription`;
      const firstname = (user.displayName || user.email.split('@')[0] || 'Mitra User').slice(0, 60);
      const email = user.email;
      const phone = (user.phone || '').replace(/\D/g, '').slice(-10) || '0000000000';

      const hash = generatePaymentHash({
        key: payuConfig.merchantKey,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        udf1: context.userId,
        udf2: planId,
        salt: payuConfig.salt,
      });

      // Persist the pending transaction BEFORE returning the checkout
      // params, so payuWebhook/payuCallback have something server-
      // authoritative to reconcile against even if the customer never
      // completes checkout (Phase 10/11 of the migration task — "persisted
      // before checkout where appropriate").
      await db
        .collection('transactions')
        .doc(txnid)
        .set({
          transactionId: txnid,
          userId: context.userId,
          type: 'subscription',
          amount: amountINR,
          currency: 'INR',
          balanceAfter: 0,
          description: `Subscription payment for ${planId} plan`,
          provider: 'payu',
          payuTxnId: txnid,
          status: 'pending',
          metadata: { planId },
          createdAt: FieldValue.serverTimestamp(),
        });

      logFunctionComplete(logger, startTime, { success: true, txnid, planId });

      return {
        action: payuConfig.checkoutUrl,
        key: payuConfig.merchantKey,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone,
        surl: envConfig.PAYU_CALLBACK_URL,
        furl: envConfig.PAYU_CALLBACK_URL,
        udf1: context.userId,
        udf2: planId,
        hash,
      };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
