import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { getUserDoc, getSubscriptionDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';

const db = admin.firestore();

const requestAccountDeletionSchema = z.object({
  confirm: z.literal(true),
});

// Firebase ID tokens carry `auth_time` (unix seconds of the last real
// sign-in), which only advances on an actual credential check, unlike the
// token itself which silently refreshes hourly. Requiring a recent
// `auth_time` for this one destructive callable gives a server-verifiable
// "recently authenticated" guarantee without building a separate
// re-authentication UI flow, and without weakening the standard auth check
// every other callable already gets from validatedCallable.
const RECENT_AUTH_WINDOW_SECONDS = 15 * 60;

/**
 * Self-service account deletion. This is the previously-missing entry
 * point: deleting the Firebase Auth user fires the existing
 * onUserDeletedHandler (functions/src/functions/auth/onUserCreated.ts),
 * which archives the caller's businesses and marks users/{uid}.deletedAt —
 * that cascade already existed but had no self-service trigger.
 *
 * Deliberately NOT deleted/cascaded by this pass (see
 * docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md — "do not implement destructive
 * deletion blindly, first map dependencies"):
 *   - Campaign, asset, and generated-content documents/Storage objects
 *   - Transaction/billing records (Terms/Privacy already state these may be
 *     retained for legal, tax, or fraud-prevention purposes)
 *   - Usage/credit history
 * A full cascading purge requires a founder+legal decision on retention
 * periods before it can be implemented safely.
 *
 * Blocks deletion if the caller has an active, still-renewing paid
 * subscription (docs/LEGAL_DELETION_DATA_LIFECYCLE.md's "Critical Finding" —
 * without this check, deleting the Auth login left Razorpay with no idea the
 * account was gone, so it would keep charging the customer with no
 * self-service way back in to stop it). "Block, require cancel first" was
 * chosen over "auto-cancel as part of deletion" because it reuses the
 * already-built, already-reviewed cancelSubscription callable as the one
 * place a Razorpay API call happens on this account, rather than bundling a
 * billing side-effect into an already-destructive Auth-deletion path. A
 * subscription that is already set to cancelAtPeriodEnd is not blocking —
 * Razorpay will not renew it regardless of whether the Mitra account still
 * exists, so there is no orphaned-charge risk in that case.
 */
export const requestAccountDeletion = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 10 },
  validatedCallable(requestAccountDeletionSchema, async (_data, context) => {
    const { logger, startTime } = logFunctionStart('requestAccountDeletion', {
      userId: context.userId,
    });

    try {
      await checkRateLimit(context.userId, 'requestAccountDeletion');

      const authTime = typeof context.token?.auth_time === 'number' ? context.token.auth_time : 0;
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (nowSeconds - authTime > RECENT_AUTH_WINDOW_SECONDS) {
        throw new HttpsError(
          'failed-precondition',
          'For your security, please sign out and sign back in before deleting your account.'
        );
      }

      const user = await getUserDoc(context.userId);
      if (user?.subscriptionId) {
        const subscription = await getSubscriptionDoc(user.subscriptionId);
        const stillRenewing =
          subscription &&
          subscription.planId !== 'free' &&
          !subscription.cancelAtPeriodEnd &&
          ['active', 'trialing', 'past_due'].includes(subscription.status);
        if (stillRenewing) {
          throw new HttpsError(
            'failed-precondition',
            'You have an active subscription that is still set to renew. Please cancel your ' +
              'subscription from the Billing page before deleting your account, so you are not ' +
              'charged again after your account is gone.'
          );
        }
      }

      // Server-authoritative audit trail, written before the destructive
      // step. Client never supplies a timestamp.
      await db.collection('accountDeletionRequests').doc(context.userId).set({
        userId: context.userId,
        requestedAt: FieldValue.serverTimestamp(),
        status: 'processing',
      });

      await admin.auth().deleteUser(context.userId);

      await db.collection('accountDeletionRequests').doc(context.userId).set(
        {
          status: 'completed',
          completedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      logFunctionComplete(logger, startTime, { success: true });
      return { success: true };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
