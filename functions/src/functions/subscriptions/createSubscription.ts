import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { getUserDoc, updateUserDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import {
  createRazorpaySubscription,
  getPlanPrice,
  getRazorpayPlanId,
  CreateSubscriptionInput,
} from '../../services/razorpay';
import { createSubscriptionDoc } from '../../services/firestore';
import type { Subscription, SubscriptionPlan, SubscriptionStatus } from '../../types';

const createSubscriptionSchema = z.object({
  planId: z.enum(['starter', 'business', 'agency']),
});

export const createSubscription = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 20 },
  validatedCallable(createSubscriptionSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('createSubscription', {
      userId: context.userId,
      planId: data.planId,
    });

    try {
      // Auth is already verified by validatedCallable — context.userId is
      // the real, authenticated uid. A prior call here to
      // verifyAuth(context as any) always threw (context is {userId,
      // token}, not a CallableRequest with an .auth property), so this
      // function could never actually succeed for any caller.
      await checkRateLimit(context.userId, 'createSubscription');

      const user = await getUserDoc(context.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const planId = data.planId;
      const planPrice = getPlanPrice(planId);
      const razorpayPlanId = getRazorpayPlanId(planId);

      if (!razorpayPlanId) {
        throw new Error(`Invalid plan: ${planId}`);
      }

      // Create Razorpay subscription
      const result = await createRazorpaySubscription({
        userId: context.userId,
        planId,
        customerEmail: user.email,
        customerName: user.displayName || user.email,
        customerPhone: user.phone,
      });

      // Create subscription document in Firestore (status will be updated via webhook)
      const subscription: Subscription = {
        subscriptionId: result.subscriptionId,
        userId: context.userId,
        planId,
        status: 'incomplete' as SubscriptionStatus,
        razorpaySubscriptionId: result.razorpaySubscriptionId,
        razorpayCustomerId: result.razorpayCustomerId,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        creditsIncluded: 0, // Will be set when webhook fires
        creditsUsed: 0,
        cancelAtPeriodEnd: false,
        metadata: { shortUrl: result.shortUrl },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await createSubscriptionDoc(subscription);

      // Update user with pending subscription ID
      await updateUserDoc(context.userId, { subscriptionId: result.subscriptionId });

      logFunctionComplete(logger, startTime, {
        success: true,
        subscriptionId: result.subscriptionId,
        planId,
      });

      return {
        subscriptionId: result.subscriptionId,
        shortUrl: result.shortUrl,
        planId,
        price: planPrice,
      };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
