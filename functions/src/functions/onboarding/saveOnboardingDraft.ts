import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';

import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { trackEvent } from '../../services/analyticsService';
import {
  applySystemFacts,
  applyUserAnswers,
  deriveOnboardingEvents,
  DraftValidationError,
  MAX_UPDATES_PER_SAVE,
  type OnboardingDraft,
} from '../../onboarding/draftModel';
import { seedFromAuthToken } from '../../onboarding/discovery';

const db = admin.firestore();

// Shape only. Which paths exist and what each value may be is enforced by the draft model's field
// registry (one place), so this schema deliberately does not duplicate it.
const saveOnboardingDraftSchema = z.object({
  updates: z
    .array(z.object({ path: z.string().min(1).max(60), value: z.unknown() }))
    .max(MAX_UPDATES_PER_SAVE)
    .optional(),
  skip: z.array(z.string().min(1).max(60)).max(MAX_UPDATES_PER_SAVE).optional(),
  welcomed: z.boolean().optional(),
  /** The owner is looking at the review screen (see UserAnswerInput.reviewShown). */
  reviewShown: z.boolean().optional(),
  /** The revision the caller last saw. Only used to warn about a stale tab, never to reject. */
  baseRevision: z.number().int().nonnegative().optional(),
});

/**
 * Persists the owner's onboarding answers to onboarding_drafts/{uid} — the temporary
 * construction layer for their Business Brain (see onboarding/draftModel.ts).
 *
 * - The document id is the caller's uid, taken from the verified token, never from the request, so
 *   one user cannot read or write another's draft.
 * - Clients can only submit USER_CONFIRMED facts; provenance is set server-side.
 * - On the very first save it pre-fills what Mitra can read from the owner's own sign-in (the name
 *   on a Google account) as an unconfirmed detection to confirm, never as a fact.
 * - Free: it spends no credits. Credits are for generating content, not for teaching Mitra about
 *   the business. Rate-limited only to bound abuse.
 * - Last write wins per field. `stale` tells a tab that another one wrote in between, so it can say
 *   so; it is a warning, not a lock.
 * - Funnel events are derived here from the before/after draft, best-effort: a failed analytics
 *   write must never fail an owner's save.
 */
export const saveOnboardingDraft = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 20 },
  validatedCallable(saveOnboardingDraftSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('saveOnboardingDraft', {
      userId: context.userId,
    });

    try {
      await checkRateLimit(context.userId, 'saveOnboardingDraft');

      const ref = db.collection('onboarding_drafts').doc(context.userId);
      const { draft, before, stale } = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const existing = snap.exists ? (snap.data() as OnboardingDraft) : null;
        const now = new Date().toISOString();

        let next = applyUserAnswers(existing, context.userId, data, now);
        if (!existing) {
          next = applySystemFacts(next, seedFromAuthToken(context.token), now);
          next = { ...next, revision: 1 }; // the seed is part of creation, not a second write
        }
        tx.set(ref, next);

        const isStale =
          existing !== null &&
          data.baseRevision !== undefined &&
          existing.revision > data.baseRevision;
        return { draft: next, before: existing, stale: isStale };
      });

      // Best-effort, after the save is durable. Deterministic ids make a retry idempotent.
      try {
        await Promise.all(
          deriveOnboardingEvents(before, draft, data).map((e) =>
            trackEvent(e.name, context.userId, undefined, undefined, undefined, e.metadata, e.id)
          )
        );
      } catch (analyticsError) {
        logger.warn('Onboarding analytics write failed', { error: String(analyticsError) });
      }

      logFunctionComplete(logger, startTime, { success: true, revision: draft.revision, stale });
      return { draft, stale };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      if (error instanceof DraftValidationError) {
        throw new HttpsError('invalid-argument', error.message);
      }
      throw mapErrorToHttpsError(error);
    }
  })
);
