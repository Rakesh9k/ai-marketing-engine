import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { v7 as uuidv7 } from 'uuid';

import { requireVerifiedEmail } from '../../middleware/emailVerification';
import { checkRateLimit } from '../../middleware/rateLimit';
import { validatedCallable } from '../../middleware/validation';
import { trackEvent, ANALYTICS_EVENTS } from '../../services/analyticsService';
import { assertBusinessCapacity, getUserEntitlements } from '../../services/entitlements';
import {
  buildBusiness,
  countActiveBusinesses,
  refreshBusinessClaims,
  stageNewBusiness,
} from '../../services/businessCreation';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { normalizeDraft, type OnboardingDraft } from '../../onboarding/draftModel';
import { BrainMappingError, toBusinessCreation } from '../../onboarding/brainMapping';
import type { Business } from '../../types';

const db = admin.firestore();

/**
 * Machine-readable reasons the client can act on (carried in HttpsError.details.code), as opposed to
 * a generic failure.
 */
export const CONFIRM_ERRORS = {
  NO_DRAFT: 'ONBOARDING_NO_DRAFT',
  REVIEW_REQUIRED: 'ONBOARDING_REVIEW_REQUIRED',
  DRAFT_CHANGED: 'ONBOARDING_DRAFT_CHANGED',
  INCOMPLETE: 'ONBOARDING_INCOMPLETE',
  INVALID: 'ONBOARDING_INVALID',
} as const;

const fail = (code: string, message: string, extra: Record<string, unknown> = {}) =>
  new HttpsError('failed-precondition', message, { code, ...extra });

const confirmSchema = z.object({
  /**
   * The draft revision the owner was shown when they reviewed. The server only creates the business
   * from exactly that version: if anything changed since (another tab, a late save), the owner must
   * review the new version first. Nothing the owner has not seen can become their business.
   */
  reviewedRevision: z.number().int().nonnegative(),
});

/**
 * The only way the conversational onboarding becomes a business.
 *
 *   owner-confirmed draft → normalise + validate → Business Brain → createBusiness machinery
 *
 * The caller supplies NOTHING about the business — only which revision they reviewed. The draft is
 * read here, on the server, so a browser cannot slip in a different business, an unconfirmed AI
 * guess, or forged provenance. What reaches creation is the output of `toBusinessCreation`, which
 * only ever sees owner-confirmed facts and validates them with the same schema as the public
 * `createBusiness` callable.
 *
 * Atomic: the plan-limit count, the business document, the link onto the user and the draft's
 * completion are ONE transaction. A double-click, or two tabs, produce one business, not two; a
 * retry after success returns the same business (idempotent) and re-mints the claims, which is also
 * the recovery path if the claims step failed the first time.
 */
export const confirmOnboardingBusiness = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 20 },
  validatedCallable(confirmSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('confirmOnboardingBusiness', {
      userId: context.userId,
    });

    try {
      requireVerifiedEmail(context.token);
      await checkRateLimit(context.userId, 'confirmOnboardingBusiness');

      const userId = context.userId;
      const entitlements = await getUserEntitlements(userId);
      const draftRef = db.collection('onboarding_drafts').doc(userId);

      const outcome = await db.runTransaction(
        async (
          tx
        ): Promise<
          { created: false; businessId: string } | { created: true; business: Business }
        > => {
          // ── all reads first ──────────────────────────────────────────────
          const snap = await tx.get(draftRef);
          if (!snap.exists) throw fail(CONFIRM_ERRORS.NO_DRAFT, 'There is nothing to confirm yet.');
          const draft = snap.data() as OnboardingDraft;

          // Retry after success: same business, no second one.
          if (draft.status === 'completed' && draft.businessId) {
            return { created: false, businessId: draft.businessId };
          }

          // The owner must have seen the review, and of exactly this version.
          if (draft.revision !== data.reviewedRevision) {
            throw fail(
              CONFIRM_ERRORS.DRAFT_CHANGED,
              'Your answers changed since you reviewed them. Please review them again.'
            );
          }
          if (draft.status !== 'ready_for_review') {
            throw fail(
              CONFIRM_ERRORS.REVIEW_REQUIRED,
              'Please review your answers before confirming.'
            );
          }

          const normalized = normalizeDraft(draft);
          if (!normalized.ready) {
            throw fail(CONFIRM_ERRORS.INCOMPLETE, 'A few required answers are still missing.', {
              missing: normalized.missing,
            });
          }

          const now = new Date().toISOString();
          let plan;
          try {
            plan = toBusinessCreation(normalized, now);
          } catch (error) {
            if (error instanceof BrainMappingError || error instanceof z.ZodError) {
              logger.warn('Confirmed draft failed validation', { error: String(error) });
              throw fail(CONFIRM_ERRORS.INVALID, 'Something in your answers needs another look.');
            }
            throw error;
          }

          const existing = await countActiveBusinesses(tx, userId);
          assertBusinessCapacity(existing, entitlements.plan, entitlements.maxBusinesses);

          // ── then all writes ──────────────────────────────────────────────
          const business = buildBusiness(plan.data, userId, uuidv7(), now, plan.extras);
          stageNewBusiness(tx, business);
          // The Brain now holds what the owner confirmed; keep nothing personal in the draft.
          tx.set(draftRef, {
            uid: userId,
            schemaVersion: 1,
            status: 'completed',
            welcomed: true,
            facts: {},
            skipped: [],
            businessId: business.businessId,
            completedAt: now,
            revision: draft.revision + 1,
            createdAt: draft.createdAt,
            updatedAt: now,
          } satisfies OnboardingDraft);
          return { created: true, business };
        }
      );

      const businessId = outcome.created ? outcome.business.businessId : outcome.businessId;

      // After the commit. Idempotent, and the recovery path if this failed on a previous attempt:
      // a retry reaches here again via the `created: false` branch above.
      await refreshBusinessClaims(userId, context.token);

      if (outcome.created) {
        // Best-effort: a failed analytics write must never turn a created business into an error.
        try {
          await Promise.all([
            trackEvent(
              ANALYTICS_EVENTS.ONBOARDING_CONFIRMED,
              userId,
              businessId,
              undefined,
              undefined,
              { vertical: outcome.business.category },
              `${userId}_onboarding_confirmed`
            ),
            trackEvent(
              ANALYTICS_EVENTS.ONBOARDING_COMPLETE,
              userId,
              businessId,
              undefined,
              undefined,
              undefined,
              `${userId}_onboarding_complete_${businessId}`
            ),
          ]);
        } catch (analyticsError) {
          logger.warn('Onboarding analytics write failed', { error: String(analyticsError) });
        }
      }

      logFunctionComplete(logger, startTime, { success: true, created: outcome.created });
      return { businessId, created: outcome.created };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      if (error instanceof HttpsError) throw error;
      throw mapErrorToHttpsError(error);
    }
  })
);
