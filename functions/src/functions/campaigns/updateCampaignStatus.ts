import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyAuthAndBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import {
  getCampaignDoc,
  updateCampaignStatus as updateCampaignStatusService,
} from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Campaign, CampaignStatus } from '../../types';

const updateCampaignStatusSchema = z.object({
  campaignId: z.string().min(1),
  businessId: z.string().min(1),
  status: z.enum([
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
  ]),
  creditsUsed: z.number().nonnegative().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      stage: z.string(),
      retryable: z.boolean(),
    })
    .optional(),
  generationTimeMs: z.number().optional(),
  aiCostEstimateINR: z.number().optional(),
});

export const updateCampaignStatus = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(updateCampaignStatusSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('updateCampaignStatus', {
      userId: context.userId,
      businessId: data.businessId,
      campaignId: data.campaignId,
    });

    try {
      const { campaignId, businessId, status, ...additionalData } = data;
      await verifyAuthAndBusinessAccess(context as any, businessId);

      const existingCampaign = await getCampaignDoc(campaignId);
      if (!existingCampaign) {
        throw new HttpsError('not-found', 'Campaign not found');
      }

      if (existingCampaign.businessId !== businessId) {
        throw new HttpsError('permission-denied', 'Campaign does not belong to this business');
      }

      await updateCampaignStatusService(campaignId, status, additionalData);

      logFunctionComplete(logger, startTime, { success: true });
      return { success: true };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
