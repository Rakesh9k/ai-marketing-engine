import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();
const cancelCashfreeSubscriptionSchema = z.object({});

export interface CancelCashfreeSubscriptionResponse {
  success: boolean;
  alreadyCanceled: boolean;
  currentPeriodEnd?: string;
}

export const cancelCashfreeSubscription = onCall(
  {
    region: 'asia-south1',
    enforceAppCheck: true,
    maxInstances: 10,
    secrets: ['CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY'],
  },
  validatedCallable(cancelCashfreeSubscriptionSchema, async (_data, context) => {
    const { logger, startTime } = logFunctionStart('cancelCashfreeSubscription', {
      userId: context.userId,
    });

    try {
      await checkRateLimit(context.userId, 'cancelCashfreeSubscription');

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
        } satisfies CancelCashfreeSubscriptionResponse;
      }

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

      logFunctionComplete(logger, startTime, { success: true, alreadyCanceled: false });
      return {
        success: true,
        alreadyCanceled: false,
        currentPeriodEnd,
      } satisfies CancelCashfreeSubscriptionResponse;
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
