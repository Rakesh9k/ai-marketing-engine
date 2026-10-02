import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { validatedCallable } from '../../middleware/validation';
import { getPaddleClient } from '../../services/paddle';
import { checkRateLimit } from '../../middleware/rateLimit';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();
const cancelPaddleSubscriptionSchema = z.object({});

export interface CancelPaddleSubscriptionResponse {
  success: boolean;
  alreadyCanceled: boolean;
  /** Access (and the credits already granted for the period) continue until this instant. */
  currentPeriodEnd?: string;
}

/**
 * Cancels the calling user's Paddle subscription at the end of the current billing period.
 *
 * Calls Paddle's API so auto-renewal actually stops (Firestore alone would not stop
 * Paddle charging). Only the cancellation flag is written here; the user keeps their
 * plan and the credits already granted until `currentPeriodEnd`. Paddle then emits
 * subscription.updated (scheduled change) and, at period end, subscription.canceled,
 * which paddleWebhook.ts uses to move the subscription to `canceled`. Nothing here
 * removes credits.
 */
export const cancelPaddleSubscription = onCall(
  {
    region: 'asia-south1',
    enforceAppCheck: true,
    maxInstances: 10,
    secrets: ['PADDLE_API_KEY'],
  },
  validatedCallable(cancelPaddleSubscriptionSchema, async (_data, context) => {
    const { logger, startTime } = logFunctionStart('cancelPaddleSubscription', {
      userId: context.userId,
    });

    try {
      await checkRateLimit(context.userId, 'cancelPaddleSubscription');

      // Look up the user's active subscription.
      const userSnap = await db.collection('users').doc(context.userId).get();
      const subscriptionId = userSnap.data()?.['subscriptionId'] as string | undefined;
      if (!subscriptionId) {
        throw new HttpsError('not-found', 'No active subscription found');
      }

      const subSnap = await db.collection('subscriptions').doc(subscriptionId).get();
      if (!subSnap.exists) {
        throw new HttpsError('not-found', 'Subscription record not found');
      }

      const sub = subSnap.data()!;
      // Ownership: the pointer on the user doc must also be this user's own subscription.
      if (sub['userId'] !== context.userId) {
        throw new HttpsError('permission-denied', 'Subscription does not belong to this account');
      }
      const currentPeriodEnd = sub['currentPeriodEnd'] as string | undefined;
      if (sub['cancelAtPeriodEnd'] === true || sub['status'] === 'canceled') {
        logFunctionComplete(logger, startTime, { success: true, alreadyCanceled: true });
        return {
          success: true,
          alreadyCanceled: true,
          currentPeriodEnd,
        } satisfies CancelPaddleSubscriptionResponse;
      }

      if (sub['provider'] !== 'paddle') {
        // Fallback: non-Paddle subscriptions — just mark Firestore.
        await subSnap.ref.set(
          { cancelAtPeriodEnd: true, updatedAt: new Date().toISOString() },
          { merge: true }
        );
        logFunctionComplete(logger, startTime, { success: true, alreadyCanceled: false });
        return {
          success: true,
          alreadyCanceled: false,
          currentPeriodEnd,
        } satisfies CancelPaddleSubscriptionResponse;
      }

      // Call Paddle API to cancel at period end.
      const paddle = getPaddleClient();
      await paddle.subscriptions.cancel(subscriptionId, {
        effectiveFrom: 'next_billing_period',
      });

      // Reflect the scheduled cancellation immediately; paddleWebhook confirms it.
      await subSnap.ref.set(
        {
          cancelAtPeriodEnd: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await db
        .collection('users')
        .doc(context.userId)
        .set({ updatedAt: FieldValue.serverTimestamp() }, { merge: true });

      logFunctionComplete(logger, startTime, { success: true });
      return {
        success: true,
        alreadyCanceled: false,
        currentPeriodEnd,
      } satisfies CancelPaddleSubscriptionResponse;
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
