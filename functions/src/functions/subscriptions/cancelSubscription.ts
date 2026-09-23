import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { getUserDoc, getSubscriptionDoc, updateSubscriptionDoc } from '../../services/firestore';
import { cancelRazorpaySubscription } from '../../services/razorpay';
import { cancelSIMandate } from '../../services/payu';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';

const cancelSubscriptionSchema = z.object({});

/**
 * Self-service subscription cancellation. Stops future renewal via
 * Razorpay's `cancel_at_cycle_end` — the customer keeps plan access and
 * already-granted credits through the current, already-paid period. This
 * implements only the technically-neutral meaning of "cancel" (stop future
 * billing). It makes no refund, proration, or credit-expiry claim — those
 * are undecided founder/legal-policy items, not invented here (see
 * docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md). The authoritative
 * status/canceledAt transition still happens via razorpayWebhook.ts's
 * `subscription.cancelled` handler when Razorpay actually processes the
 * cancellation; this callable only initiates it and reflects the pending
 * state immediately for the UI.
 */
export const cancelSubscription = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 20 },
  validatedCallable(cancelSubscriptionSchema, async (_data, context) => {
    const { logger, startTime } = logFunctionStart('cancelSubscription', {
      userId: context.userId,
    });

    try {
      await checkRateLimit(context.userId, 'cancelSubscription');

      const user = await getUserDoc(context.userId);
      if (!user || !user.subscriptionId) {
        throw new Error('No subscription found for this account');
      }

      const subscription = await getSubscriptionDoc(user.subscriptionId);
      if (!subscription || subscription.userId !== context.userId) {
        throw new Error('Subscription record not found');
      }

      if (subscription.planId === 'free') {
        throw new Error('The Free plan has no paid subscription to cancel');
      }

      if (subscription.cancelAtPeriodEnd) {
        logFunctionComplete(logger, startTime, { success: true, alreadyCanceled: true });
        return {
          success: true,
          alreadyCanceled: true,
          currentPeriodEnd: subscription.currentPeriodEnd,
        };
      }

      // PayU one-time-checkout subscriptions (no Standing Instruction
      // mandate) are already created with cancelAtPeriodEnd: true — see
      // payuWebhook.ts's comment — so reaching this point with
      // provider === 'payu' means an SI mandate exists and must actually
      // be canceled at PayU to stop the next auto-charge.
      if (subscription.provider === 'payu') {
        if (!subscription.payuMandateTxnId) {
          throw new Error('This subscription has no linked PayU mandate to cancel');
        }
        // UNVERIFIED — see services/payu.ts's Standing Instruction section
        // header. Not exercised against a real PayU SI account.
        await cancelSIMandate(subscription.payuMandateTxnId);
      } else {
        if (!subscription.razorpaySubscriptionId) {
          throw new Error('This subscription has no linked Razorpay subscription to cancel');
        }
        await cancelRazorpaySubscription(subscription.razorpaySubscriptionId, true);
      }

      await updateSubscriptionDoc(subscription.subscriptionId, {
        cancelAtPeriodEnd: true,
      });

      logFunctionComplete(logger, startTime, {
        success: true,
        subscriptionId: subscription.subscriptionId,
      });

      return {
        success: true,
        alreadyCanceled: false,
        currentPeriodEnd: subscription.currentPeriodEnd,
      };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
