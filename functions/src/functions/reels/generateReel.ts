import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import {
  getReelProjectDoc,
  updateReelProjectDoc,
  getBusinessDoc,
  getBrandKitDoc,
  getAssetDoc,
  getSavedStyleDoc,
  getCreativePreferencesByBusiness,
} from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError, InsufficientCreditsError } from '../../utils/errors';
import { executeWithUsageControl, USAGE_ERROR_CODES } from '../../services/usageControl';
import { trackEvent, trackCreativeEvent, ANALYTICS_EVENTS } from '../../services/analyticsService';
import { analyzeReelClips, generateValidatedReelEditPlan } from '../../services/ai/reelPipeline';
import { getVideoRenderer } from '../../services/videoRenderer';
import { getMusicTrackById, MIN_REEL_CLIPS, pickDefaultMusicTrack } from '../../config/reels';
import { toSavedStyleContext } from '../../services/savedStyle';
import { requirePlan } from '../../services/entitlements';
import { assertStoredObject, signReadUrl, MIN_REEL_BYTES } from '../../services/reelAssets';

const generateReelSchema = z.object({
  businessId: z.string().min(1),
  reelId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});

const getSignedReadUrl = (storagePath: string): Promise<string> => signReadUrl(storagePath);

/** Renderer failures carry raw upstream text (URL, status, body); customers get a plain message. */
function customerFacingReelError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/^Renderer |REEL_RENDERER_URL|storage after rendering|empty or truncated/.test(message)) {
    return 'We could not finish rendering your reel. Please try again — you have not been charged for this attempt.';
  }
  return message || 'Reel generation failed.';
}

/**
 * The single generation entry point for "Create a Reel" — mirrors
 * generateCampaignStrategy.ts's shape (verify access -> rate limit -> fetch
 * business -> executeWithUsageControl -> status-transition-as-it-progresses
 * -> terminal update), adapted for the clips-already-uploaded /
 * AI-plan-then-render pipeline described in AGENTS.md sections 11-15.
 */
export const generateReel = onCall(
  {
    region: 'asia-south1',
    enforceAppCheck: true,
    maxInstances: 20,
    // Orchestration only (AI calls + a network call to the Cloud Run
    // renderer) — the actual ffmpeg work happens in that separate service,
    // not in this function's own CPU/memory budget. Still needs a long
    // timeout since it awaits the full render round-trip synchronously.
    timeoutSeconds: 540,
    memory: '512MiB',
    // Phase 12 Secret Handling audit — GEMINI_API_KEY (scene analysis/edit
    // plan) and REEL_RENDERER_API_KEY (the Cloud Run renderer's own auth
    // header, see videoRenderer.ts). See generateCampaignStrategy.ts.
    secrets: ['GEMINI_API_KEY'],
  },
  validatedCallable(generateReelSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('generateReel', {
      userId: context.userId,
      businessId: data.businessId,
      reelId: data.reelId,
    });

    const userId = context.userId;
    const reelId = data.reelId;

    try {
      await verifyBusinessAccess(userId, data.businessId);
      await checkRateLimit(userId, 'generateReel');
      // Reel generation is a Business-tier feature — Starter credits cannot
      // substitute for the plan entitlement (see entitlements.ts PLAN_ENTITLEMENTS).
      await requirePlan(userId, 'business');

      const reel = await getReelProjectDoc(reelId);
      if (!reel || reel.businessId !== data.businessId) {
        throw new HttpsError('not-found', 'Reel project not found');
      }
      if (reel.userId !== userId) {
        throw new HttpsError('permission-denied', 'Reel does not belong to this user');
      }
      // Idempotency: a reel already mid-flight or finished must not start a
      // second (paid) generation on refresh/duplicate-click/retry (AGENTS.md
      // section 20).
      if (['analyzing', 'planning', 'rendering', 'completed'].includes(reel.status)) {
        return { reelId, reel, alreadyInProgress: true };
      }
      if (reel.inputClipIds.length < MIN_REEL_CLIPS) {
        throw new HttpsError(
          'failed-precondition',
          `Upload at least ${MIN_REEL_CLIPS} clips to create a Reel.`
        );
      }

      const business = await getBusinessDoc(data.businessId);
      if (!business) {
        throw new HttpsError('not-found', 'Business not found');
      }

      const savedStyle = reel.savedStyleId ? await getSavedStyleDoc(reel.savedStyleId) : null;
      if (
        reel.savedStyleId &&
        (!savedStyle || savedStyle.businessId !== data.businessId || !savedStyle.active)
      ) {
        throw new HttpsError('failed-precondition', 'The selected Saved Style is unavailable.');
      }
      if (savedStyle && savedStyle.userId !== userId) {
        throw new HttpsError(
          'permission-denied',
          'The selected Saved Style does not belong to this user.'
        );
      }
      if (savedStyle && reel.savedStyleVersion && savedStyle.version !== reel.savedStyleVersion) {
        throw new HttpsError(
          'failed-precondition',
          'The selected Saved Style changed after this Reel was created. Start a new Reel to use the updated style.'
        );
      }

      const { result, creditsUsed } = await executeWithUsageControl(
        userId,
        data.idempotencyKey,
        'reel_generation',
        async () => {
          const brandKit = await getBrandKitDoc(data.businessId);

          await updateReelProjectDoc(reelId, { status: 'analyzing' });
          await trackEvent(ANALYTICS_EVENTS.REEL_STARTED, userId, data.businessId, reelId);

          const clipAssets = await Promise.all(reel.inputClipIds.map((id) => getAssetDoc(id)));
          const missingIdx = clipAssets.findIndex((a) => !a);
          if (missingIdx !== -1) {
            throw new Error(
              `Uploaded clip record missing (assetId: ${reel.inputClipIds[missingIdx]})`
            );
          }
          const clips = clipAssets.map((a) => ({
            clipId: a!.assetId,
            storagePath: a!.storagePath,
          }));

          const clipAnalyses = await analyzeReelClips(
            clips,
            { name: business.name, category: business.category },
            reel.goal,
            (storagePath) => getSignedReadUrl(storagePath)
          );

          const usableClips = clipAnalyses.filter((c) => c.qualityScore >= 0.15);
          if (usableClips.length < 2) {
            throw new Error(
              "Mitra couldn't find enough usable footage. Try uploading 2-3 more clips with better lighting or steadier framing."
            );
          }

          await updateReelProjectDoc(reelId, {
            status: 'planning',
            clipAnalyses,
            metadata: {
              idempotencyKey: data.idempotencyKey,
              clipsUploaded: clips.length,
              clipsUsed: usableClips.length,
            },
          });

          let creativeTemplateContext = undefined;
          let adaptedCreativePlan = undefined;
          if (reel.templateId && reel.creativeObjective) {
            const rawPreferences = await getCreativePreferencesByBusiness(data.businessId);
            const creativePreferences = {
              preferredTemplates: rawPreferences
                .filter((p) => p.preference === 'preferred')
                .map((p) => p.templateId),
              avoidedTemplates: rawPreferences
                .filter((p) => p.preference === 'avoided')
                .map((p) => p.templateId),
            };

            const { buildCreativeTemplateContext } =
              await import('../../services/ai/creativeTemplateContext.js');
            creativeTemplateContext = buildCreativeTemplateContext({
              templateId: reel.templateId,
              objective: reel.creativeObjective as any,
              businessBrain: business.businessBrain,
              brandCreativeContext: brandKit as any,
              productName: business.name,
              offerHeadline: reel.offer,
              offerPrice: 0,
              offerType: 'reel_offer',
              offerValidityStart: new Date().toISOString(),
              offerValidityEnd: new Date().toISOString(),
              audienceLocalities: business.location?.locality ? [business.location.locality] : [],
              savedStyle: savedStyle ? toSavedStyleContext(savedStyle) : undefined,
              creativePreferences,
            });

            const { selectCreativeContext } =
              await import('../../services/ai/creativeContextSelector.js');
            const { TemplateAdaptationPlanner } =
              await import('../../services/ai/templateAdaptation.js');

            const selectedContext = selectCreativeContext({
              task: 'reel_shot_plan',
              templateContext: creativeTemplateContext,
            });

            const planner = new TemplateAdaptationPlanner();
            adaptedCreativePlan = await planner.adapt({
              template: creativeTemplateContext.template,
              selectedContext,
              objective: creativeTemplateContext.objective,
            });
          }

          const editPlan = await generateValidatedReelEditPlan({
            business,
            brandKit,
            goal: reel.goal,
            style: reel.style,
            durationSeconds: reel.durationSeconds,
            offer: reel.offer,
            cta: reel.cta,
            additionalMessage: reel.additionalMessage,
            clipAnalyses: usableClips,
            creativeTemplateContext,
            adaptedCreativePlan,
          });

          await updateReelProjectDoc(reelId, { status: 'rendering', editPlan });

          const music =
            getMusicTrackById(editPlan.musicTrackId) ?? pickDefaultMusicTrack(reel.style);
          const outputStoragePath = `businesses/${data.businessId}/reels/${reelId}/output/reel.mp4`;
          const thumbnailStoragePath = `businesses/${data.businessId}/reels/${reelId}/output/thumbnail.jpg`;

          const renderer = getVideoRenderer();
          const rendered = await renderer.renderReel({
            reelId,
            businessId: data.businessId,
            durationSeconds: reel.durationSeconds,
            style: reel.style,
            plan: editPlan,
            clips: clips.filter((c) => usableClips.some((u) => u.clipId === c.clipId)),
            music,
            brand: {
              businessName: business.name,
              logoStoragePath: brandKit?.logo?.primary?.storagePath,
              primaryColor: brandKit?.colors?.primary,
              locationText: [business.location.locality, business.location.city]
                .filter(Boolean)
                .join(', '),
            },
            outputStoragePath,
            thumbnailStoragePath,
          });

          // "completed" must mean the MP4 really is in Storage: verify before signing anything.
          await assertStoredObject(rendered.outputStoragePath, MIN_REEL_BYTES, 'Rendered reel');
          await assertStoredObject(rendered.thumbnailStoragePath, 1, 'Reel thumbnail');

          const [outputUrl, thumbnailUrl, downloadUrl] = await Promise.all([
            signReadUrl(rendered.outputStoragePath),
            signReadUrl(rendered.thumbnailStoragePath),
            signReadUrl(rendered.outputStoragePath, {
              downloadFileName: `mitra-reel-${reelId}.mp4`,
            }),
          ]);

          await updateReelProjectDoc(reelId, {
            status: 'completed',
            outputUrl,
            downloadUrl,
            outputStoragePath: rendered.outputStoragePath,
            thumbnailUrl,
            thumbnailStoragePath: rendered.thumbnailStoragePath,
            completedAt: new Date().toISOString(),
          });

          await trackEvent(ANALYTICS_EVENTS.REEL_GENERATED, userId, data.businessId, reelId);
          await trackCreativeEvent({
            eventType: 'creative_generated',
            userId,
            businessId: data.businessId,
            creativeId: reelId,
            campaignId: reelId,
            creativeType: 'reel',
          });

          return { outputUrl, thumbnailUrl, downloadUrl };
        },
        { businessId: data.businessId }
      );

      await updateReelProjectDoc(reelId, { creditsUsed });

      const finalReel = await getReelProjectDoc(reelId);
      logFunctionComplete(logger, startTime, { success: true, reelId, creditsUsed });
      return { reelId, reel: finalReel, ...result };
    } catch (error: any) {
      if (error.code === USAGE_ERROR_CODES.INSUFFICIENT_CREDITS) {
        throw new InsufficientCreditsError(0, 0).toHttpsError();
      }
      logFunctionError(logger, startTime, error as Error);

      // Same reasoning as generateCampaignStrategy.ts's catch block: move the
      // reel to a terminal 'failed' status so the frontend's status listener
      // doesn't spin forever, without ever exposing internal error details
      // to the client (AGENTS.md section 36).
      try {
        await updateReelProjectDoc(reelId, {
          status: 'failed',
          error: {
            code: error.code || 'GENERATION_FAILED',
            message: customerFacingReelError(error),
            stage: 'generation',
            retryable: true,
          },
        });
      } catch (statusUpdateError) {
        logFunctionError(logger, startTime, statusUpdateError as Error, {
          note: 'Failed to persist failed status after reel generation error',
        });
      }

      throw mapErrorToHttpsError(error);
    }
  })
);
