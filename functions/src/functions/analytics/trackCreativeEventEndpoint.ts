import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { trackCreativeEvent } from '../../services/analyticsService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';

const schema = z.object({
  eventType: z.enum(['creative_template_viewed', 'creative_template_selected']),
  businessId: z.string().min(1),
  templateId: z.string().min(1),
  templateVersion: z.number().optional(),
  campaignId: z.string().optional(),
  creativeType: z.enum(['post', 'reel']).optional(),
  objective: z.string().optional(),
  metadata: z
    .record(z.unknown())
    .optional()
    .transform((meta) => {
      if (!meta) return meta;
      // Phase 21 Analytics Security: scrub sensitive data
      const safeMeta = { ...meta };
      delete safeMeta['businessBrain'];
      delete safeMeta['brandProfile'];
      delete safeMeta['prompts'];
      delete safeMeta['aiResponses'];
      delete safeMeta['referenceImages'];
      delete safeMeta['paymentData'];
      delete safeMeta['creditCard'];
      delete safeMeta['secrets'];
      return safeMeta;
    }),
});

export const trackCreativeEventEndpoint = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(schema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('trackCreativeEventEndpoint', {
      userId: context.userId,
      businessId: data.businessId,
      eventType: data.eventType,
    });
    try {
      await verifyBusinessAccess(context.userId, data.businessId);

      await trackCreativeEvent({
        eventType: data.eventType,
        userId: context.userId,
        businessId: data.businessId,
        templateId: data.templateId,
        templateVersion: data.templateVersion,
        campaignId: data.campaignId,
        creativeType: data.creativeType,
        objective: data.objective,
        metadata: data.metadata,
      });

      logFunctionComplete(logger, startTime, { success: true });
      return { success: true };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
