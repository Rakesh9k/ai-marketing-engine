import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';
import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { createCreativeFeedbackDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { CreativeFeedback, CreativeFeedbackReason } from '../../types';

const submitCreativeFeedbackSchema = z.object({
  businessId: z.string().min(1),
  creativeId: z.string().min(1),
  campaignId: z.string().optional(),
  templateId: z.string().optional(),
  templateVersion: z.number().optional(),
  styleId: z.string().optional(),
  styleVersion: z.number().optional(),
  creativeType: z.enum(['post', 'reel']),
  sentiment: z.enum(['positive', 'negative']),
  reasons: z
    .array(
      z.enum([
        'more_premium',
        'more_local',
        'less_text',
        'more_humorous',
        'more_product_focused',
        'different',
      ])
    )
    .optional(),
  customReason: z.string().max(500).optional(),
});

export const submitCreativeFeedback = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(submitCreativeFeedbackSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('submitCreativeFeedback', {
      userId: context.userId,
      businessId: data.businessId,
      creativeId: data.creativeId,
    });
    try {
      await verifyBusinessAccess(context.userId, data.businessId);

      const now = new Date().toISOString();
      const feedback: CreativeFeedback = {
        feedbackId: uuidv7(),
        creativeId: data.creativeId,
        campaignId: data.campaignId,
        userId: context.userId,
        businessId: data.businessId,
        templateId: data.templateId,
        templateVersion: data.templateVersion,
        styleId: data.styleId,
        styleVersion: data.styleVersion,
        creativeType: data.creativeType,
        sentiment: data.sentiment,
        reasons: data.reasons as CreativeFeedbackReason[] | undefined,
        customReason: data.customReason,
        createdAt: now,
        updatedAt: now,
      };

      await createCreativeFeedbackDoc(feedback);

      // Phase 21 & Phase 16: Track Approval/Rejection & Like/Dislike
      const { trackCreativeEvent, trackCreativeLiked, trackCreativeDisliked } =
        await import('../../services/analyticsService.js');
      await trackCreativeEvent({
        eventType: data.sentiment === 'positive' ? 'creative_approved' : 'creative_rejected',
        userId: context.userId,
        businessId: data.businessId,
        creativeId: data.creativeId,
        campaignId: data.campaignId,
        templateId: data.templateId,
        templateVersion: data.templateVersion,
        styleId: data.styleId,
        styleVersion: data.styleVersion,
        creativeType: data.creativeType,
      });

      if (data.sentiment === 'positive') {
        await trackCreativeLiked(
          context.userId,
          data.businessId,
          data.creativeId,
          data.campaignId,
          {
            templateId: data.templateId,
            styleId: data.styleId,
            creativeType: data.creativeType,
          }
        );
      } else {
        await trackCreativeDisliked(
          context.userId,
          data.businessId,
          data.creativeId,
          data.campaignId,
          {
            templateId: data.templateId,
            styleId: data.styleId,
            creativeType: data.creativeType,
          }
        );
      }

      // Phase 17: Build Template Preference Memory
      const { updateCreativePreferences } = await import('../../services/preferenceService.js');
      await updateCreativePreferences(feedback);

      logFunctionComplete(logger, startTime, { success: true, feedbackId: feedback.feedbackId });
      return { feedbackId: feedback.feedbackId };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
