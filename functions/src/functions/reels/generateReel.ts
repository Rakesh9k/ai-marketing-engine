import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import {
  getReelProjectDoc,
  updateReelProjectDoc,
  getBusinessDoc,
  getBrandKitDoc,
  getAssetDoc,
} from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError, InsufficientCreditsError } from '../../utils/errors';
import { executeWithUsageControl, USAGE_ERROR_CODES } from '../../services/usageControl';
import { trackEvent, ANALYTICS_EVENTS } from '../../services/analyticsService';
import { analyzeReelClips, generateValidatedReelEditPlan } from '../../services/ai/reelPipeline';
import { getVideoRenderer } from '../../services/videoRenderer';
import { getMusicTrackById, MIN_REEL_CLIPS, pickDefaultMusicTrack } from '../../config/reels';

const generateReelSchema = z.object({
  businessId: z.string().min(1),
  reelId: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});

async function getSignedReadUrl(storagePath: string): Promise<string> {
  const [url] = await admin
    .storage()
    .bucket()
    .file(storagePath)
    .getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return url;
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

      const { result, creditsUsed } = await executeWithUsageControl(
        userId,
        reelId,
        'reel_generation',
        async () => {
          const brandKit = await getBrandKitDoc(data.businessId);

          await updateReelProjectDoc(reelId, { status: 'analyzing' });
          await trackEvent(ANALYTICS_EVENTS.REEL_STARTED, userId, data.businessId, reelId);

          const clipAssets = await Promise.all(reel.inputClipIds.map((id) => getAssetDoc(id)));
          const missingIdx = clipAssets.findIndex((a) => !a);
          if (missingIdx !== -1) {
            throw new Error(`Uploaded clip record missing (assetId: ${reel.inputClipIds[missingIdx]})`);
          }
          const clips = clipAssets.map((a) => ({ clipId: a!.assetId, storagePath: a!.storagePath }));

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
          });

          await updateReelProjectDoc(reelId, { status: 'rendering', editPlan });

          const music = getMusicTrackById(editPlan.musicTrackId) ?? pickDefaultMusicTrack(reel.style);
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

          const [outputUrl, thumbnailUrl] = await Promise.all([
            getSignedReadUrl(rendered.outputStoragePath),
            getSignedReadUrl(rendered.thumbnailStoragePath),
          ]);

          await updateReelProjectDoc(reelId, {
            status: 'completed',
            outputUrl,
            outputStoragePath: rendered.outputStoragePath,
            thumbnailUrl,
            thumbnailStoragePath: rendered.thumbnailStoragePath,
            completedAt: new Date().toISOString(),
          });

          await trackEvent(ANALYTICS_EVENTS.REEL_GENERATED, userId, data.businessId, reelId);

          return { outputUrl, thumbnailUrl };
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
            message:
              error instanceof Error && error.message
                ? error.message
                : 'Reel generation failed.',
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
