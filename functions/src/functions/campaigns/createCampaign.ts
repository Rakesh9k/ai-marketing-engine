import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import {
  createCampaignDoc,
  getCampaignsByBusiness,
  reserveCredits,
} from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Campaign, LocalizationProfile } from '../../types';
import { PRICING } from '../../config/pricing';

const createCampaignSchema = z.object({
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

export const createCampaign = onCall(
  { region: 'asia-south1', enforceAppCheck: true, maxInstances: 50 },
  validatedCallable(createCampaignSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('createCampaign', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      await verifyBusinessAccess(context.userId, data.businessId);
      await checkRateLimit(context.userId, 'createCampaign');

      // Calculate credits required based on campaign input
      const extraImages = data.newProduct?.images?.length || 0;
      const creditsRequired =
        PRICING.campaignBaseCredits + extraImages * PRICING.imageGenerationCredits;

      // Generate campaignId first (needed for reserveCredits)
      const campaignId = uuidv7();
      const now = new Date().toISOString();

      // Reserve credits before starting generation
      await reserveCredits(
        context.userId,
        creditsRequired,
        data.idempotencyKey,
        campaignId,
        data.businessId
      );

      const campaign: Campaign = {
        campaignId,
        businessId: data.businessId,
        userId: context.userId,
        objective: data.objective,
        productId: data.productId,
        newProduct: data.newProduct,
        offer: data.offer,
        duration: data.duration,
        audience: data.audience,
        cta: data.cta,
        localization: data.localization as LocalizationProfile,
        status: 'draft',
        creditsReserved: creditsRequired,
        metadata: {
          idempotencyKey: data.idempotencyKey,
        },
        createdAt: now,
        updatedAt: now,
      };

      await createCampaignDoc(campaign);

      logFunctionComplete(logger, startTime, { success: true });
      return { campaignId, campaign };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
