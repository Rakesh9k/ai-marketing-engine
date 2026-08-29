import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyAuthAndBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getCampaignDoc, updateCampaignDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Campaign, CampaignStatus } from '../../types';

const updateCampaignSchema = z.object({
  campaignId: z.string().min(1),
  businessId: z.string().min(1),
  objective: z
    .enum(['weekend_offer', 'new_dish', 'festival', 'discount', 'brand_awareness'])
    .optional(),
  productId: z.string().optional(),
  newProduct: z
    .object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      price: z.number().positive(),
      images: z.array(z.string().url()).min(1).max(5),
    })
    .optional(),
  offer: z
    .object({
      headline: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      price: z.number().positive(),
      originalPrice: z.number().positive().optional(),
      type: z.enum(['percentage', 'fixed', 'bogo', 'combo', 'free_delivery', 'loyalty']),
      validityStart: z.string().datetime(),
      validityEnd: z.string().datetime(),
      terms: z.string().max(1000).optional(),
    })
    .optional(),
  duration: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional(),
  audience: z
    .object({
      localities: z.array(z.string()).min(1).max(10),
      ageRange: z.object({ min: z.number().min(18), max: z.number().max(80) }).optional(),
      occasion: z.enum(['weekend', 'festival', 'weekday_lunch', 'family']).optional(),
    })
    .optional(),
  cta: z
    .enum(['order_whatsapp', 'book_table', 'view_menu', 'call_now', 'get_directions'])
    .optional(),
  localization: z
    .object({
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
    })
    .optional(),
  status: z
    .enum([
      'draft',
      'validating',
      'queued',
      'analyzing',
      'strategizing',
      'generating_copy',
      'generating_creatives',
      'validating_output',
      'completed',
      'failed',
    ])
    .optional(),
  creditsReserved: z.number().positive().optional(),
  creditsUsed: z.number().nonnegative().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      stage: z.string(),
      retryable: z.boolean(),
    })
    .optional(),
  metadata: z
    .object({
      idempotencyKey: z.string().uuid(),
      generationTimeMs: z.number().optional(),
      aiCostEstimateINR: z.number().optional(),
    })
    .optional(),
});

export const updateCampaign = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(updateCampaignSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('updateCampaign', {
      userId: context.userId,
      businessId: data.businessId,
      campaignId: data.campaignId,
    });

    try {
      const { campaignId, businessId, ...updateData } = data;
      await verifyAuthAndBusinessAccess(context as any, businessId);

      const existingCampaign = await getCampaignDoc(campaignId);
      if (!existingCampaign) {
        throw new HttpsError('not-found', 'Campaign not found');
      }

      if (existingCampaign.businessId !== businessId) {
        throw new HttpsError('permission-denied', 'Campaign does not belong to this business');
      }

      const updatedCampaign: Campaign = {
        ...existingCampaign,
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      await updateCampaignDoc(campaignId, updatedCampaign);

      logFunctionComplete(logger, startTime, { success: true });
      return { campaign: updatedCampaign };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
