import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';

import { verifyAuthAndBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { updateCampaignDoc, getBusinessDoc, getBrandKitDoc, createCampaignAssets } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Campaign, LocalizationProfile, CampaignAsset } from '../../types';
import { GenerationPipeline } from '../../services/ai/pipeline';
import { reserveCredits, confirmCredits, refundCredits } from '../../services/firestore';
import { PRICING } from '../../config/pricing';

const generateCampaignStrategySchema = z.object({
  businessId: z.string().min(1),
  objective: z.enum(['weekend_offer', 'new_dish', 'festival', 'discount', 'brand_awareness']),
  productId: z.string().optional(),
  newProduct: z
    .object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      price: z.number().positive(),
      images: z.array(z.string().url()).min(1).max(5),
    })
    .optional(),
  offer: z.object({
    headline: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    price: z.number().positive(),
    originalPrice: z.number().positive().optional(),
    type: z.enum(['percentage', 'fixed', 'bogo', 'combo', 'free_delivery', 'loyalty']),
    validityStart: z.string().datetime(),
    validityEnd: z.string().datetime(),
    terms: z.string().max(1000).optional(),
  }),
  duration: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  audience: z.object({
    localities: z.array(z.string()).min(1).max(10),
    ageRange: z.object({ min: z.number().min(18), max: z.number().max(80) }).optional(),
    occasion: z.enum(['weekend', 'festival', 'weekday_lunch', 'family']).optional(),
  }),
  cta: z.enum(['order_whatsapp', 'book_table', 'view_menu', 'call_now', 'get_directions']),
  localization: z.object({
    country: z.string().min(1),
    state: z.string().min(1),
    city: z.string().min(1),
    locality: z.string().min(1),
    primaryLanguage: z.enum(['en', 'te', 'hi', 'te_en', 'hi_en']),
    secondaryLanguage: z.enum(['en', 'te', 'hi', 'te_en', 'hi_en']),
    languageMixing: z.enum(['minimal', 'natural', 'heavy']),
    regionalStyle: z.enum([
      'neutral',
      'hyderabadi',
      'telangana',
      'mumbai',
      'bangalore',
      'delhi',
      'chennai',
      'kolkata',
    ]),
    slangPreference: z.enum(['none', 'light', 'moderate', 'heavy']),
    audienceDescription: z.string().min(1),
    brandTone: z.enum([
      'professional',
      'friendly',
      'premium',
      'traditional',
      'modern',
      'luxury',
      'casual',
      'bold',
    ]),
    campaignStyle: z.enum([
      'funny',
      'quirky',
      'sarcastic',
      'dark_comedy',
      'emotional',
      'urgent',
      'fomo',
      'storytelling',
      'educational',
      'youthful',
    ]),
    contentFormat: z.enum(['poster', 'story', 'reel', 'caption', 'whatsapp']),
  }),
  idempotencyKey: z.string().uuid(),
});

export const generateCampaignStrategy = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 50 },
  validatedCallable(generateCampaignStrategySchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('generateCampaignStrategy', {
      userId: context.userId,
      businessId: data.businessId,
    });

    let campaignId = '';
    let creditsRequired = 0;

    try {
      await verifyAuthAndBusinessAccess(context as any, data.businessId);
      await checkRateLimit(context.userId, 'generateCampaignStrategy');

      // Calculate credits required
      // Base campaign + AI image generations (5 posters + 12 story frames + 15 reel frames = 32 images max)
      // But we limit to max 2 AI images per campaign for MVP (20 credits each)
      const maxAiImages = 2;
      const creditsRequired = PRICING.campaignBaseCredits + maxAiImages * PRICING.imageGenerationCredits;

      // Generate campaignId first (needed for reserveCredits)
      campaignId = uuidv7();
      const now = new Date().toISOString();

      // Reserve credits before starting generation
      await reserveCredits(
        context.userId,
        creditsRequired,
        data.idempotencyKey,
        campaignId,
        data.businessId
      );

      // Fetch business and brand kit for pipeline context
      const [business, brandKit] = await Promise.all([
        getBusinessDoc(data.businessId),
        getBrandKitDoc(data.businessId),
      ]);

      if (!business) {
        throw new Error(`Business not found: ${data.businessId}`);
      }

      // Create initial campaign document
      const campaign: Campaign = {
        campaignId,
        businessId: data.businessId,
        userId: context.userId,
        objective: data.objective,
        productId: data.productId,
        newProduct: data.newProduct
          ? {
              name: data.newProduct.name,
              description: data.newProduct.description,
              price: data.newProduct.price,
              images: data.newProduct.images,
            }
          : undefined,
        offer: data.offer,
        duration: data.duration,
        audience: data.audience,
        cta: data.cta,
        localization: data.localization as LocalizationProfile,
        status: 'validating',
        creditsReserved: creditsRequired,
        metadata: {
          idempotencyKey: data.idempotencyKey,
        },
        createdAt: now,
        updatedAt: now,
      };

      // Update status to analyzing
      await updateCampaignDoc(campaignId, { status: 'analyzing', updatedAt: new Date().toISOString() });

      const pipeline = new GenerationPipeline();
      const result = await pipeline.execute({
        businessId: data.businessId,
        campaignId,
        businessName: business.name,
        businessCategory: business.category,
        businessLocation: {
          city: business.location.city,
          state: business.location.state,
          locality: business.location.locality,
        },
        whatsappNumber: business.contact.whatsapp,
        productId: data.productId,
        productName: data.newProduct?.name || '',
        offerHeadline: data.offer.headline,
        offerPrice: data.offer.price,
        offerType: data.offer.type,
        offerDescription: data.offer.description,
        offerValidityStart: data.offer.validityStart,
        offerValidityEnd: data.offer.validityEnd,
        offerTerms: data.offer.terms,
        objective: data.objective,
        audience: data.audience,
        cta: data.cta,
        localizationProfile: data.localization,
        campaignStyle: data.localization.campaignStyle,
        brandProfile: brandKit || {},
        businessBrain: business.businessBrain,
        duration: data.duration,
        newProduct: data.newProduct
          ? {
              name: data.newProduct.name,
              description: data.newProduct.description,
              price: data.newProduct.price,
              images: data.newProduct.images,
              category: 'main',
            }
          : undefined,
      });

      // Update status to generating_creatives
      await updateCampaignDoc(campaignId, { status: 'generating_creatives', updatedAt: new Date().toISOString() });

      // Update status to validating_output
      await updateCampaignDoc(campaignId, { status: 'validating_output', updatedAt: new Date().toISOString() });

      // Save campaign assets to Firestore
      const campaignPack = result.campaignPack;
      if (campaignPack && campaignPack.assets) {
        const assetsToSave: CampaignAsset[] = campaignPack.assets.map((asset: any) => ({
          assetId: asset.assetId,
          campaignId,
          businessId: data.businessId,
          type: asset.type as any,
          index: asset.index,
          content: asset.content,
          imageUrl: asset.imageUrl,
          status: asset.status,
          promptUsed: asset.content?.prompt,
          modelUsed: 'dall-e-3',
          createdAt: asset.createdAt,
        }));
        await createCampaignAssets(assetsToSave);
      }

      // Update campaign with final results
      const truthCheckStatus = campaignPack?.truthCheck?.status || 'REVIEW_REQUIRED';
      const truthCheckResult = campaignPack?.truthCheck ?? undefined;
      const finalStatus = truthCheckStatus === 'PASS' ? 'verified' : truthCheckStatus === 'FAIL' ? 'failed' : 'generated';

      await updateCampaignDoc(campaignId, {
        status: finalStatus,
        creditsUsed: creditsRequired,
        metadata: {
          idempotencyKey: data.idempotencyKey,
          generationTimeMs: Date.now() - new Date(startTime).getTime(),
          truthCheckStatus,
          truthCheckSummary: campaignPack?.truthCheck?.summary,
          truthCheckResult: truthCheckResult ? {
            status: truthCheckResult.status,
            checkedAt: truthCheckResult.checkedAt,
            checks: truthCheckResult.checks,
            summary: truthCheckResult.summary,
          } : undefined,
        },
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      // Confirm credits
      await confirmCredits(data.idempotencyKey);

      logFunctionComplete(logger, startTime, { success: true, campaignId, status: finalStatus });
      return { campaignId, campaign: result };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      // Refund credits on failure
      await refundCredits(context.userId, creditsRequired, data.idempotencyKey, campaignId);
      throw mapErrorToHttpsError(error);
    }
  })
);