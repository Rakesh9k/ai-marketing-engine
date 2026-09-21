import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';

import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import {
  getCampaignDoc,
  getBusinessDoc,
  getBrandKitDoc,
  getCampaignAssetDoc,
  updateCampaignAssetDoc,
  createCampaignAssets,
} from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type {
  CampaignAsset,
  AssetType,
  GenerationPipelineInput,
  TruthCheckStatus,
} from '../../types';
import { GenerationPipeline } from '../../services/ai/pipeline';
import { shouldActivateRegeneration } from '../../services/ai/truthCheck';
import {
  executeWithUsageControl,
  getGenerationCost,
  USAGE_ERROR_CODES,
} from '../../services/usageControl';
import type { UsageErrorCode } from '../../services/usageControl';

const regenerateAssetSchema = z.object({
  campaignId: z.string().min(1),
  assetId: z.string().min(1),
  assetType: z.enum([
    'poster',
    'headline',
    'ad_copy',
    'caption',
    'story',
    'reel',
    'whatsapp',
    'cta',
  ]),
  regenerationInstruction: z.string().max(500).optional(),
  idempotencyKey: z.string().uuid(),
});

export const regenerateAsset = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 20 },
  validatedCallable(regenerateAssetSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('regenerateAsset', {
      userId: context.userId,
      campaignId: data.campaignId,
      assetId: data.assetId,
      assetType: data.assetType,
    });

    try {
      // Auth is already verified by validatedCallable (context.userId is the
      // real, authenticated uid). Authorization for this specific campaign
      // is checked explicitly below via campaign.userId, once the campaign
      // is loaded — a prior call here to verifyAuthAndBusinessAccess(context
      // as any, data.campaignId) was dead code: it always threw
      // "Authentication required" (context is {userId, token}, not a
      // CallableRequest with an .auth property, so verifyAuth's internal
      // !request.auth check always failed) — meaning regenerateAsset could
      // never actually succeed for any caller. Removed rather than
      // "fixed in place", since the real ownership check below already
      // covers this correctly.
      await checkRateLimit(context.userId, 'regenerateAsset');

      // Get the campaign to verify ownership and get context
      const campaign = await getCampaignDoc(data.campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.userId !== context.userId) {
        throw new Error('Unauthorized: Campaign belongs to another user');
      }

      // Get the original asset
      const originalAsset = await getCampaignAssetDoc(data.assetId);
      if (!originalAsset) {
        throw new Error('Asset not found');
      }

      if (originalAsset.campaignId !== data.campaignId) {
        throw new Error('Asset does not belong to this campaign');
      }

      if (originalAsset.type !== data.assetType) {
        throw new Error('Asset type mismatch');
      }

      // Get business and brand kit for pipeline context
      const [business, brandKit] = await Promise.all([
        getBusinessDoc(campaign.businessId),
        getBrandKitDoc(campaign.businessId),
      ]);
      if (!business) {
        throw new Error('Business not found');
      }

      // Calculate credits required for regeneration
      const creditsRequired = getGenerationCost('regeneration');

      // Execute regeneration with full usage control:
      // - Check eligibility
      // - Reserve credits atomically
      // - Run generation
      // - Finalize deduction on success
      // - Refund on failure
      //
      // The reservation/transaction is keyed by operationId, and
      // usageControl.ts's finalizeReservation() marks it 'completed'
      // permanently — a *second* regeneration (of the same or a different
      // asset) in the same campaign must get its own reservation, not
      // reuse one that's already terminal. Previously this used
      // data.campaignId as the operationId, so every regeneration after
      // the campaign's first ever regeneration failed with
      // ALREADY_FINALIZED, regardless of which asset or how much time had
      // passed. idempotencyKey (a fresh client-generated UUID per
      // regenerate click) is the correct per-attempt identifier — it still
      // makes a genuine retry of the *same* click idempotent (same key ->
      // same reservation), while allowing every new regeneration attempt
      // to proceed.
      const { result: regenerationResult, creditsUsed } = await executeWithUsageControl(
        context.userId,
        data.idempotencyKey,
        'regeneration',
        async () => {
          // Build pipeline input from campaign and business data
          const pipelineInput: GenerationPipelineInput = {
            businessId: campaign.businessId,
            campaignId: campaign.campaignId,
            businessName: business.name,
            businessCategory: business.category,
            businessLocation: {
              city: business.location.city,
              state: business.location.state,
              locality: business.location.locality,
            },
            whatsappNumber: business.contact.whatsapp,
            vertical: business.category,
            productId: campaign.productId,
            productName: campaign.offer.headline,
            offerHeadline: campaign.offer.headline,
            offerDescription: campaign.offer.description,
            offerPrice: campaign.offer.price,
            offerOriginalPrice: campaign.offer.originalPrice,
            offerType: campaign.offer.type,
            offerValidityStart: campaign.offer.validityStart,
            offerValidityEnd: campaign.offer.validityEnd,
            offerTerms: campaign.offer.terms,
            objective: campaign.objective,
            audience: campaign.audience,
            cta: campaign.cta,
            localizationProfile: campaign.localization,
            campaignStyle: campaign.localization.campaignStyle,
            duration: campaign.duration,
            businessBrain: business.businessBrain,
            brandProfile: brandKit || {},
          };

          // Run the pipeline to regenerate the specific asset type
          const pipeline = new GenerationPipeline();
          const pipelineResult = await pipeline.execute(pipelineInput);

          // Extract the regenerated asset of the requested type
          const campaignPack = pipelineResult.campaignPack;
          if (!campaignPack || !campaignPack.assets) {
            throw new Error('Failed to generate campaign pack');
          }

          const regeneratedAssets = campaignPack.assets.filter(
            (a: any) => a.type === data.assetType
          );
          if (regeneratedAssets.length === 0) {
            throw new Error(`No ${data.assetType} assets generated`);
          }

          // For MVP, take the first regenerated asset of the requested type
          const newAssetData = regeneratedAssets[0];

          // Regenerated content is NEW content — it must be independently
          // verified, never inherit the previous version's PASS. Truth Check
          // must gate activation BEFORE the new version can replace the
          // currently-active asset: a failed or unreviewed regeneration must
          // never supersede a valid active asset (see Phase 6 golden test:
          // valid active asset + failed regeneration -> valid asset remains
          // active). Only an explicit PASS from the deterministic Truth
          // Check activates the new version; REVIEW_REQUIRED is treated the
          // same as FAIL for activation purposes (fail closed — it cannot
          // become active without a human approving it, which this endpoint
          // does not do).
          const regenerationTruthStatus: TruthCheckStatus =
            pipelineResult.campaignPack?.truthCheck?.status || 'REVIEW_REQUIRED';
          const regenerationPassed = shouldActivateRegeneration(regenerationTruthStatus);

          // Create new asset version with new assetId. Always persisted (for
          // audit trail / history) but its own status reflects whether it
          // actually passed verification, independent of the original
          // asset's generation-time status field.
          const newAsset: CampaignAsset = {
            assetId: uuidv7(),
            campaignId: campaign.campaignId,
            businessId: campaign.businessId,
            type: newAssetData.type as AssetType,
            index: originalAsset.index,
            content: newAssetData.content,
            imageUrl: newAssetData.imageUrl,
            status: regenerationPassed ? newAssetData.status : 'failed',
            promptUsed: newAssetData.promptUsed,
            modelUsed: 'dall-e-3',
            createdAt: new Date().toISOString(),
            metadata: {
              truthCheckStatus: regenerationTruthStatus,
              regeneratedFrom: data.assetId,
            },
          };

          // Save new asset version
          await createCampaignAssets([newAsset]);

          if (regenerationPassed) {
            // Only now does the new version actually replace the active one.
            await updateCampaignAssetDoc(data.assetId, {
              status: 'superseded',
              // Add a reference to the new version
              metadata: {
                ...originalAsset.metadata,
                supersededBy: newAsset.assetId,
                supersededAt: new Date().toISOString(),
              },
            });
          }
          // else: the original asset is left completely untouched — it
          // remains the active/valid asset. The failed/unreviewed
          // regeneration is stored (above) but never marked as having
          // superseded anything.

          return { pipelineResult, newAsset, regenerationPassed, regenerationTruthStatus };
        },
        { campaignId: campaign.campaignId, businessId: campaign.businessId }
      );

      const { pipelineResult, newAsset, regenerationPassed, regenerationTruthStatus } =
        regenerationResult;
      const truthCheckStatus = regenerationTruthStatus;

      logFunctionComplete(logger, startTime, {
        success: true,
        campaignId: campaign.campaignId,
        assetId: newAsset.assetId,
        originalAssetId: data.assetId,
        assetType: data.assetType,
        truthCheckStatus,
        activated: regenerationPassed,
        creditsUsed,
      });

      return {
        assetId: newAsset.assetId,
        asset: newAsset,
        activated: regenerationPassed,
        truthCheckStatus,
        truthCheckSummary: pipelineResult.campaignPack?.truthCheck?.summary,
        creditsUsed,
      };
    } catch (error: any) {
      if (error.code === USAGE_ERROR_CODES.INSUFFICIENT_CREDITS) {
        throw new Error('Insufficient credits for regeneration');
      }
      if (error.code === USAGE_ERROR_CODES.SUBSCRIPTION_REQUIRED) {
        throw new Error('Subscription required for this operation');
      }
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
