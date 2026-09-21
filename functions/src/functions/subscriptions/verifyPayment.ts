import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { getSubscriptionDoc, updateSubscriptionDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { getRazorpayClient } from '../../services/razorpay';
import type { SubscriptionStatus } from '../../types';

const verifyPaymentSchema = z.object({
  razorpaySubscriptionId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const verifyPayment = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 20 },
  validatedCallable(verifyPaymentSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('verifyPayment', {
      userId: context.userId,
      razorpaySubscriptionId: data.razorpaySubscriptionId,
    });

    try {
      // Auth is already verified by validatedCallable — context.userId is
      // the real, authenticated uid. A prior call here to
      // verifyAuth(context as any) always threw (context is {userId,
      // token}, not a CallableRequest with an .auth property), so this
      // function could never actually succeed for any caller. Confirmed by
      // a real Firestore-emulator test in verifyPayment.test.ts before this
      // fix (every call failed with "Authentication required" even for a
      // legitimately authenticated context).
      await checkRateLimit(context.userId, 'verifyPayment');

      // Get subscription from Firestore
      const subscription = await getSubscriptionDoc(data.razorpaySubscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.userId !== context.userId) {
        throw new Error('Unauthorized: Subscription belongs to another user');
      }

      // Verify payment signature with Razorpay
      const client = getRazorpayClient();
      const payment = await client.payments.fetch(data.razorpayPaymentId);

      if (payment.status !== 'captured') {
        throw new Error('Payment not captured');
      }

      // Update subscription status to active
      await updateSubscriptionDoc(data.razorpaySubscriptionId, {
        status: 'active' as SubscriptionStatus,
        currentPeriodStart: new Date(payment.created_at * 1000).toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      });

      logFunctionComplete(logger, startTime, {
        success: true,
        subscriptionId: data.razorpaySubscriptionId,
        status: 'active',
      });

      return {
        success: true,
        status: 'active',
        subscription: {
          subscriptionId: data.razorpaySubscriptionId,
          status: 'active',
        },
      };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
