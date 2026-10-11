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
  planId: z.enum(['starter', 'business', 'pro', 'agency']),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
});

/**
 * Initiates a PayU Hosted Checkout payment for a plan purchase.
 */
export const createPayUPayment = onCall(
  {
    region: 'asia-south1',
    enforceAppCheck: true,
    maxInstances: 20,
    secrets: ['PAYU_SALT'],
  },
  validatedCallable(createPayUPaymentSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('createPayUPayment', {
      userId: context.userId,
      planId: data.planId,
      billingCycle: data.billingCycle,
    });

    try {
      await checkRateLimit(context.userId, 'createPayUPayment');

      const user = await getUserDoc(context.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const envConfig = getEnvConfig();
      if (!envConfig.PAYU_CALLBACK_URL) {
        throw new HttpsError(
          'failed-precondition',
          'Payments are not fully configured yet. Please try again later.'
        );
      }

      const planId = data.planId as SubscriptionPlan;
      const billingCycle = data.billingCycle;
      const amountINR = getPlanPrice(planId, billingCycle);
      const amount = amountINR.toFixed(2);
      const txnid = uuidv7();

      const payuConfig = getPayUConfig();
      const productinfo = `Mitra ${planId} plan subscription (${billingCycle})`;
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
        udf3: billingCycle,
        salt: payuConfig.salt,
      });

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
          description: `Subscription payment for ${planId} plan (${billingCycle})`,
          provider: 'payu',
          payuTxnId: txnid,
          status: 'pending',
          metadata: { planId, billingCycle },
          createdAt: FieldValue.serverTimestamp(),
        });

      logFunctionComplete(logger, startTime, { success: true, txnid, planId, billingCycle });

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
        udf3: billingCycle,
        hash,
      };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
