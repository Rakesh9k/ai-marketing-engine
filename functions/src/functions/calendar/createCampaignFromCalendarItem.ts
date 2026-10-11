import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import {
  createCampaignDoc,
  updateCampaignDoc,
  getBusinessDoc,
  getBrandKitDoc,
  getProductDoc,
  createCampaignAssets,
  getCampaignDoc,
  getCampaignByIdempotencyKey,
} from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError, InsufficientCreditsError } from '../../utils/errors';
import type {
  Campaign,
  LocalizationProfile,
  CampaignAsset,
  MarketingCalendarItem,
  CampaignObjective,
  CTAType,
} from '../../types';
import { GenerationPipeline } from '../../services/ai/pipeline';
import { getBrandCreativeContext } from '../../services/ai/brandCreativeContext';
import {
  executeWithUsageControl,
  getGenerationCost,
  USAGE_ERROR_CODES,
} from '../../services/usageControl';
import {
  trackEvent,
  trackCreativeEvent,
  trackCampaignApproved,
  ANALYTICS_EVENTS,
} from '../../services/analyticsService';
import {
  computeSourceFingerprint,
  computeVerticalFactsFingerprint,
} from '../../services/ai/truthCheck';
import { assertVerticalImplemented, getVerticalConfig } from '../../config/verticals';

const createCampaignFromCalendarItemSchema = z.object({
  calendarItemId: z.string().min(1),
});

/**
 * Maps calendar strategy/goal or topic text to a valid CampaignObjective allowed for the vertical.
 */
function mapToAllowedObjective(
  strategy: string,
  allowedObjectives: readonly CampaignObjective[]
): CampaignObjective {
  const strategyLower = strategy.toLowerCase();
  if (strategyLower.includes('offer') || strategyLower.includes('discount')) {
    if (allowedObjectives.includes('discount')) return 'discount';
    if (allowedObjectives.includes('weekend_offer')) return 'weekend_offer';
    if (allowedObjectives.includes('package_promotion')) return 'package_promotion';
  }
  if (strategyLower.includes('brand') || strategyLower.includes('awareness')) {
    if (allowedObjectives.includes('brand_awareness')) return 'brand_awareness';
  }
  if (strategyLower.includes('product') || strategyLower.includes('dish')) {
    if (allowedObjectives.includes('new_dish')) return 'new_dish';
    if (allowedObjectives.includes('service_promotion')) return 'service_promotion';
    if (allowedObjectives.includes('property_promotion')) return 'property_promotion';
  }
  if (strategyLower.includes('festival') || strategyLower.includes('event')) {
    if (allowedObjectives.includes('festival')) return 'festival';
    if (allowedObjectives.includes('open_house')) return 'open_house';
  }
  return allowedObjectives[0] || 'weekend_offer';
}

/**
 * Maps calendar item callToAction text to a valid CTAType allowed for the vertical.
 */
function mapToAllowedCTA(ctaText: string, allowedCTAs: readonly CTAType[]): CTAType {
  const textLower = ctaText.toLowerCase();
  if (textLower.includes('whatsapp') || textLower.includes('order')) {
    if (allowedCTAs.includes('order_whatsapp')) return 'order_whatsapp';
  }
  if (textLower.includes('book') || textLower.includes('appointment')) {
    if (allowedCTAs.includes('book_appointment')) return 'book_appointment';
    if (allowedCTAs.includes('book_table')) return 'book_table';
  }
  if (textLower.includes('call') || textLower.includes('phone')) {
    if (allowedCTAs.includes('call_now')) return 'call_now';
  }
  if (
    textLower.includes('direction') ||
    textLower.includes('visit') ||
    textLower.includes('locate')
  ) {
    if (allowedCTAs.includes('get_directions')) return 'get_directions';
  }
  if (textLower.includes('menu')) {
    if (allowedCTAs.includes('view_menu')) return 'view_menu';
  }
  return allowedCTAs[0] || 'order_whatsapp';
}

export const createCampaignFromCalendarItem = onCall(
  {
    region: 'asia-south1',
    enforceAppCheck: true,
    maxInstances: 50,
    timeoutSeconds: 540,
    memory: '2GiB',
    secrets: ['GEMINI_API_KEY'],
  },
  validatedCallable(createCampaignFromCalendarItemSchema, async (data, context) => {
    const userId = context.userId;
    const { logger, startTime } = logFunctionStart('createCampaignFromCalendarItem', {
      userId,
      calendarItemId: data.calendarItemId,
    });

    const db = admin.firestore();
    const itemRef = db.collection('marketingCalendarItems').doc(data.calendarItemId);
    const itemDoc = await itemRef.get();

    if (!itemDoc.exists) {
      throw new HttpsError('not-found', 'Calendar item not found');
    }

    const item = itemDoc.data() as MarketingCalendarItem;
    if (item.userId !== userId) {
      throw new HttpsError('permission-denied', 'Unauthorized calendar item access');
    }

    if (item.status === 'skipped') {
      throw new HttpsError(
        'failed-precondition',
        'Cannot create campaign for a skipped calendar item'
      );
    }

    // Idempotency: If campaignId is already linked on this calendar item, return existing campaign
    if (item.campaignId) {
      const existingCampaign = await getCampaignDoc(item.campaignId);
      if (existingCampaign) {
        logFunctionComplete(logger, startTime, {
          success: true,
          campaignId: existingCampaign.campaignId,
          alreadyExisted: true,
        });
        return {
          campaignId: existingCampaign.campaignId,
          campaign: existingCampaign,
          alreadyExisted: true,
        };
      }
    }

    await verifyBusinessAccess(userId, item.businessId);
    await checkRateLimit(userId, 'createCampaignFromCalendarItem');

    const business = await getBusinessDoc(item.businessId);
    if (!business) {
      throw new HttpsError('not-found', `Business not found: ${item.businessId}`);
    }
    assertVerticalImplemented(business.category);
    const verticalConfig = getVerticalConfig(business.category);

    const idempotencyKey = `create_campaign_cal_${item.itemId}`;
    const existingByIdempotency = await getCampaignByIdempotencyKey(idempotencyKey);
    if (existingByIdempotency) {
      // Ensure calendar item is updated with this campaign link
      await itemRef.update({
        campaignId: existingByIdempotency.campaignId,
        status: 'content_created',
        updatedAt: new Date().toISOString(),
      });
      return {
        campaignId: existingByIdempotency.campaignId,
        campaign: existingByIdempotency,
        alreadyExisted: true,
      };
    }

    const creditsRequired = getGenerationCost('campaign_generation');
    const campaignId = uuidv7();

    try {
      const existingProduct = item.productId ? await getProductDoc(item.productId) : null;
      if (item.productId && (!existingProduct || existingProduct.businessId !== item.businessId)) {
        throw new HttpsError(
          'failed-precondition',
          'Associated product not found or does not belong to business'
        );
      }

      // An offer needs a real price. A calendar item carries none of its own, only a product, so
      // without a product with a price there is nothing true to put in the ad. This used to fall back
      // to a made-up ₹499, which would have been published as the customer's price.
      if (!existingProduct || !(existingProduct.price > 0)) {
        throw new HttpsError(
          'failed-precondition',
          'This calendar item has no product with a price, so there is no real price to build the offer from. Choose a product when you create the plan, then try again.'
        );
      }

      const objective = mapToAllowedObjective(item.strategy, verticalConfig.allowedObjectives);
      const cta = mapToAllowedCTA(item.callToAction, verticalConfig.allowedCTAs);

      const scheduledTimeMs = new Date(item.scheduledDate).getTime();
      const validScheduledDate = isNaN(scheduledTimeMs)
        ? new Date().toISOString()
        : new Date(scheduledTimeMs).toISOString();
      const validEndDate = isNaN(scheduledTimeMs)
        ? new Date(Date.now() + 7 * 86400000).toISOString()
        : new Date(scheduledTimeMs + 7 * 86400000).toISOString();

      const offerHeadline = item.offerHeadline || item.topic;
      const offerPrice = existingProduct.price;

      // The owner's own language and place. Nothing is defaulted to Hyderabad, Telangana or Telugu: a
      // business with no stored language is English, and the secondary language follows the primary (a
      // legacy record can carry a stale "te" next to primary "en").
      const storedLocalization = business.businessBrain?.localization;
      const primaryLanguage = storedLocalization?.primaryLanguage || 'en';
      const localization: LocalizationProfile = {
        country: 'India',
        state: business.location.state || '',
        city: business.location.city || '',
        locality: business.location.locality || business.location.city || '',
        primaryLanguage,
        secondaryLanguage:
          primaryLanguage === 'te_en' ? 'te' : primaryLanguage === 'hi_en' ? 'hi' : 'en',
        languageMixing: primaryLanguage.includes('_')
          ? storedLocalization?.languageMixing || 'natural'
          : 'minimal',
        regionalStyle: storedLocalization?.regionalStyle || 'neutral',
        slangPreference:
          (storedLocalization as any)?.slangPreference ||
          storedLocalization?.slangIntensity ||
          'none',
        audienceDescription: business.businessBrain?.audience?.targetCustomer || 'Local customers',
        brandTone: business.businessBrain?.brand?.tone || 'professional',
        campaignStyle: 'storytelling',
        contentFormat:
          item.contentType === 'post' ? 'poster' : (item.contentType as any) || 'poster',
      };

      const now = new Date().toISOString();

      const { result, creditsUsed } = await executeWithUsageControl(
        userId,
        idempotencyKey,
        'campaign_generation',
        async () => {
          const brandKit = await getBrandKitDoc(item.businessId);

          const campaign: Campaign = {
            campaignId,
            businessId: item.businessId,
            userId,
            sourceCalendarItemId: item.itemId,
            objective,
            productId: item.productId || undefined,
            offer: {
              headline: offerHeadline,
              description: item.hook,
              price: offerPrice,
              type: 'fixed',
              // No offer dates: the calendar item says WHEN to post, not when an offer is valid.
            },
            duration: {
              start: validScheduledDate,
              end: validEndDate,
            },
            audience: {
              localities: [business.location.locality || business.location.city || 'Local'],
            },
            cta,
            localization,
            status: 'validating',
            creditsReserved: creditsRequired,
            metadata: {
              idempotencyKey,
            },
            createdAt: now,
            updatedAt: now,
          };

          await createCampaignDoc(campaign);
          await updateCampaignDoc(campaignId, {
            status: 'analyzing',
            updatedAt: new Date().toISOString(),
          });

          await trackEvent(ANALYTICS_EVENTS.CAMPAIGN_STARTED, userId, item.businessId, campaignId);

          const { performanceRecommendationService } =
            await import('../../services/recommendation/performanceRecommendationService.js');
          const performanceRecommendations =
            await performanceRecommendationService.buildGenerationRecommendationContext(
              item.businessId
            );

          const pipeline = new GenerationPipeline();
          const pipelineResult = await pipeline.execute({
            businessId: item.businessId,
            campaignId,
            performanceRecommendations,
            businessName: business.name,
            businessCategory: business.category,
            businessLocation: {
              city: business.location.city,
              state: business.location.state,
              locality: business.location.locality,
            },
            whatsappNumber: business.contact.whatsapp,
            productId: item.productId || undefined,
            productName: existingProduct?.name || item.productName || item.topic,
            offerHeadline,
            offerPrice,
            offerType: 'fixed',
            offerDescription: item.hook,
            offerValidityStart: validScheduledDate,
            offerValidityEnd: validEndDate,
            objective,
            audience: campaign.audience,
            cta,
            localizationProfile: localization,
            campaignStyle: localization.campaignStyle,
            brandProfile: getBrandCreativeContext(brandKit),
            businessBrain: business.businessBrain,
            duration: campaign.duration,
            vertical: business.category,
          });

          await updateCampaignDoc(campaignId, {
            status: 'generating_creatives',
            updatedAt: new Date().toISOString(),
          });

          await updateCampaignDoc(campaignId, {
            status: 'validating_output',
            updatedAt: new Date().toISOString(),
          });

          const campaignPack = pipelineResult.campaignPack;
          if (campaignPack && campaignPack.assets) {
            const assetsToSave: CampaignAsset[] = campaignPack.assets.map((asset: any) => ({
              assetId: asset.assetId,
              campaignId,
              businessId: item.businessId,
              type: asset.type as any,
              index: asset.index,
              content: asset.content,
              imageUrl: asset.imageUrl,
              storagePath: asset.storagePath,
              status: asset.status,
              promptUsed: asset.content?.prompt,
              modelUsed: 'dall-e-3',
              createdAt: asset.createdAt,
            }));
            await createCampaignAssets(assetsToSave);
          }

          const truthCheckStatus = campaignPack?.truthCheck?.status || 'REVIEW_REQUIRED';
          const truthCheckResult = campaignPack?.truthCheck ?? undefined;
          const finalStatus =
            truthCheckStatus === 'PASS'
              ? 'verified'
              : truthCheckStatus === 'FAIL'
                ? 'failed'
                : 'generated';

          const sourceFingerprint = computeSourceFingerprint({
            businessPhone: business.contact.phone,
            businessWhatsApp: business.contact.whatsapp,
            businessLocationText: `${business.location.locality || ''} ${business.location.city} ${business.location.state}`,
            productPrice: existingProduct?.price,
          });

          const verticalFingerprint = computeVerticalFactsFingerprint({
            deliveryRadiusKm: business.businessBrain?.businessRules?.deliveryRadiusKm,
            minimumOrder: business.businessBrain?.businessRules?.minimumOrder,
            verticalProfileSnapshot: business.businessBrain?.verticalProfile
              ? JSON.stringify(business.businessBrain.verticalProfile)
              : undefined,
          });

          const truthCheckFailureError =
            truthCheckStatus === 'FAIL'
              ? {
                  code: 'TRUTH_CHECK_FAILED',
                  message:
                    campaignPack?.truthCheck?.summary ||
                    'Some details in this campaign could not be verified against your business information.',
                  stage: 'validating_output',
                  retryable: true,
                }
              : undefined;

          await updateCampaignDoc(campaignId, {
            status: finalStatus,
            creditsUsed: creditsRequired,
            ...(truthCheckFailureError ? { error: truthCheckFailureError } : {}),
            metadata: {
              idempotencyKey,
              generationTimeMs: Date.now() - new Date(startTime).getTime(),
              truthCheckStatus,
              truthCheckSummary: campaignPack?.truthCheck?.summary,
              truthCheckResult: truthCheckResult
                ? {
                    status: truthCheckResult.status,
                    checkedAt: truthCheckResult.checkedAt,
                    checks: truthCheckResult.checks,
                    summary: truthCheckResult.summary,
                    sourceFingerprint,
                    verticalFingerprint,
                  }
                : undefined,
            },
            updatedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          });

          // Atomically link campaignId to calendar item and update status
          await itemRef.update({
            campaignId,
            status: 'content_created',
            updatedAt: new Date().toISOString(),
          });

          // Increment plan createdCount if plan exists
          if (item.planId) {
            const planRef = db.collection('marketingPlans').doc(item.planId);
            await planRef
              .update({
                createdCount: FieldValue.increment(1),
                updatedAt: new Date().toISOString(),
              })
              .catch(() => {
                // Ignore plan increment error if plan doc missing
              });
          }

          await trackEvent(
            ANALYTICS_EVENTS.CAMPAIGN_GENERATED,
            userId,
            item.businessId,
            campaignId
          );

          if (finalStatus === 'verified') {
            await trackCampaignApproved(userId, item.businessId, campaignId);
          }

          if (campaignPack?.assets?.length > 0) {
            const asset = campaignPack.assets[0];
            await trackCreativeEvent({
              eventType: 'creative_generated',
              userId,
              businessId: item.businessId,
              creativeId: asset.id,
              campaignId,
              templateId: undefined,
              templateVersion: 1,
              creativeType: 'post',
              objective,
            });
          }

          return pipelineResult;
        },
        { businessId: item.businessId }
      );

      logFunctionComplete(logger, startTime, {
        success: true,
        campaignId,
        status: 'generated',
        creditsUsed,
      });

      return { campaignId, campaign: result };
    } catch (error: any) {
      if (error.code === USAGE_ERROR_CODES.INSUFFICIENT_CREDITS) {
        throw new InsufficientCreditsError(creditsRequired, 0).toHttpsError();
      }
      if (error.code === USAGE_ERROR_CODES.SUBSCRIPTION_REQUIRED) {
        throw new HttpsError('permission-denied', 'Subscription required for this operation');
      }
      logFunctionError(logger, startTime, error as Error);

      try {
        await updateCampaignDoc(campaignId, {
          status: 'failed',
          error: {
            code: error.code || 'GENERATION_FAILED',
            message:
              error instanceof Error && error.message
                ? error.message
                : 'Campaign generation from calendar item failed.',
            stage: 'generation',
            retryable: true,
          },
          updatedAt: new Date().toISOString(),
        });
      } catch (statusUpdateError) {
        logFunctionError(logger, startTime, statusUpdateError as Error, {
          note: 'Failed to persist failed status after generation error',
        });
      }

      throw mapErrorToHttpsError(error);
    }
  })
);
