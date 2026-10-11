import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';

import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { generateStructuredText } from '../../services/ai';
import { withTimeout } from '../../services/ai/retry';
import { discoveryModel, DEFAULT_DISCOVERY_MODEL } from '../../config/geminiModels';
import { trackEvent } from '../../services/analyticsService';
import {
  applySystemFacts,
  suggestedValues,
  type DiscoveryMeta,
  type OnboardingDraft,
} from '../../onboarding/draftModel';
import {
  buildDiscoveryPrompt,
  contextFromDraft,
  discoveryKey,
  DiscoveryResponseSchema,
  FAILED_RETRY_AFTER_MS,
  toSystemFacts,
} from '../../onboarding/discovery';

const db = admin.firestore();

export type DiscoveryStatus = 'completed' | 'cached' | 'unavailable' | 'not_ready';

/**
 * Discovery proposes short lists of common offerings and audiences, so it uses its own cheap, fast model
 * (GEMINI_DISCOVERY_MODEL) and never depends on the campaign text model. See config/geminiModels.
 */
export { DEFAULT_DISCOVERY_MODEL };

/**
 * The client waits 25s; the whole attempt (including the provider's own retries) is cut off at 20s
 * so a slow provider becomes a clean, recorded `unavailable` instead of an abandoned request.
 */
export const DISCOVERY_TIMEOUT_MS = 20_000;

/**
 * Free AI discovery for the onboarding conversation: once Mitra knows what kind of business this
 * is and where, it proposes likely offerings and audiences as unconfirmed suggestions.
 *
 * - Spends NO credits. It deliberately does not go through executeWithUsageControl: credits are
 *   for generating content, not for teaching Mitra about the business.
 * - Never blocks onboarding. Every failure (provider down, timeout, malformed output, nothing
 *   usable after sanitising) resolves to `unavailable` — not an error — and the conversation
 *   continues with its built-in options. The client treats it as "no suggestions", silently.
 * - Never creates facts. Output is stored as AI_INFERRED (confidence-capped) and can never replace
 *   an answer the owner confirmed; only the owner tapping a suggestion makes it a fact.
 * - Sends only the business's type, name and city to the provider — never the owner's own name.
 */
export const discoverOnboardingFacts = onCall(
  {
    region: 'asia-south1',
    enforceAppCheck: true,
    maxInstances: 10,
    timeoutSeconds: 60,
    secrets: ['GEMINI_API_KEY'],
  },
  validatedCallable(z.object({}), async (_data, context) => {
    const { logger, startTime } = logFunctionStart('discoverOnboardingFacts', {
      userId: context.userId,
    });

    try {
      await checkRateLimit(context.userId, 'discoverOnboardingFacts');

      const ref = db.collection('onboarding_drafts').doc(context.userId);
      const snap = await ref.get();
      const draft = snap.exists ? (snap.data() as OnboardingDraft) : null;
      const ctx = draft ? contextFromDraft(draft) : null;
      if (!draft || !ctx) {
        logFunctionComplete(logger, startTime, { success: true, status: 'not_ready' });
        return { status: 'not_ready' as DiscoveryStatus };
      }

      const key = discoveryKey(ctx);
      const meta = draft.discovery;
      const recentlyFailed =
        meta?.status === 'failed' && Date.now() - Date.parse(meta.at) < FAILED_RETRY_AFTER_MS;
      if (meta?.key === key && (meta.status === 'completed' || recentlyFailed)) {
        logFunctionComplete(logger, startTime, { success: true, status: 'cached' });
        return {
          status: (meta.status === 'completed' ? 'cached' : 'unavailable') as DiscoveryStatus,
          revision: draft.revision,
        };
      }

      // The model call happens OUTSIDE any transaction (it can take many seconds); the write
      // below re-reads the draft so an answer saved meanwhile is not clobbered.
      let facts: ReturnType<typeof toSystemFacts> | null = null;
      try {
        const raw = await withTimeout(
          generateStructuredText(buildDiscoveryPrompt(ctx), DiscoveryResponseSchema, {
            temperature: 0.4,
            maxTokens: 400,
            model: discoveryModel(),
          }),
          DISCOVERY_TIMEOUT_MS,
          'onboarding.discovery'
        );
        facts = toSystemFacts(raw);
        if (facts.length === 0) facts = null; // nothing usable survived sanitising: same as failure
      } catch (error) {
        logger.warn('Onboarding discovery unavailable', { error: String(error) });
      }

      const result = await db.runTransaction(async (tx) => {
        const fresh = await tx.get(ref);
        if (!fresh.exists) return null;
        const current = fresh.data() as OnboardingDraft;
        const now = new Date().toISOString();
        const nextMeta: DiscoveryMeta = { key, status: facts ? 'completed' : 'failed', at: now };

        const next: OnboardingDraft = {
          ...(facts ? applySystemFacts(current, facts, now) : { ...current, updatedAt: now }),
          discovery: nextMeta,
        };
        if (!facts) next.revision = current.revision + 1;
        tx.set(ref, next);
        return next;
      });

      const status: DiscoveryStatus = facts && result ? 'completed' : 'unavailable';
      try {
        await trackEvent(
          'onboarding_discovery',
          context.userId,
          undefined,
          undefined,
          undefined,
          { status },
          `${context.userId}_onboarding_discovery_${status}`
        );
      } catch (analyticsError) {
        logger.warn('Onboarding analytics write failed', { error: String(analyticsError) });
      }

      logFunctionComplete(logger, startTime, { success: true, status });
      return {
        status,
        revision: result?.revision,
        suggestions: result ? suggestedValues(result) : undefined,
      };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
