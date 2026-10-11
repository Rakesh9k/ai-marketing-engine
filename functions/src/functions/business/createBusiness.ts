import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { v7 as uuidv7 } from 'uuid';

import { requireVerifiedEmail } from '../../middleware/emailVerification';
import { validatedCallable } from '../../middleware/validation';
import { trackEvent, ANALYTICS_EVENTS } from '../../services/analyticsService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { assertBusinessCapacity, getUserEntitlements } from '../../services/entitlements';
import {
  buildBusiness,
  countActiveBusinesses,
  createBusinessSchema,
  refreshBusinessClaims,
  stageNewBusiness,
} from '../../services/businessCreation';

/**
 * The original onboarding wizard's entry point. The schema and the business-building logic now live
 * in services/businessCreation.ts, shared with confirmOnboardingBusiness (the conversational
 * onboarding) so there is one implementation of "create a business".
 *
 * What this callable accepts is deliberately only `createBusinessSchema`: a browser can say what a
 * business is, but cannot assert onboarding provenance (that is only ever produced server-side from
 * an owner-confirmed draft).
 */
export const createBusiness = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(createBusinessSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('createBusiness', { userId: context.userId });

    try {
      requireVerifiedEmail(context.token);

      // P0-4 (docs/P0_HARDENING_TRACKER.md): Free/Starter/Business plans are limited to 1 business
      // profile; only Agency advertises multi-business. Enforced server-side (TC-PLAN-003/004).
      // The entitlement is read here, but the COUNT is read inside the transaction below, so two
      // concurrent submits can no longer both pass the limit.
      const entitlements = await getUserEntitlements(context.userId);

      const businessId = uuidv7();
      const now = new Date().toISOString();
      const business = buildBusiness(data, context.userId, businessId, now);

      await admin.firestore().runTransaction(async (tx) => {
        const existing = await countActiveBusinesses(tx, context.userId);
        assertBusinessCapacity(existing, entitlements.plan, entitlements.maxBusinesses);
        stageNewBusiness(tx, business);
      });

      await refreshBusinessClaims(context.userId, context.token);

      // Best-effort: a failed analytics write must not turn a created business into an error.
      try {
        await trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETE, context.userId, businessId);
      } catch (analyticsError) {
        logger.warn('onboarding_complete analytics write failed', {
          error: String(analyticsError),
        });
      }

      logFunctionComplete(logger, startTime, { success: true });
      return { businessId, business };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
