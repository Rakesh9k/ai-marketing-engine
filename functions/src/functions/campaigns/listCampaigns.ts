import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getCampaignsByBusiness } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Campaign, CampaignStatus } from '../../types';

const listCampaignsSchema = z.object({
  businessId: z.string().min(1),
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
  limit: z.number().int().positive().max(50).default(20),
  cursor: z.string().optional(),
});

export const listCampaigns = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(listCampaignsSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('listCampaigns', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      await verifyBusinessAccess(context.userId, data.businessId);
      const result = await getCampaignsByBusiness(data.businessId, data.status, data.limit);

      logFunctionComplete(logger, startTime, { success: true, count: result.campaigns.length });
      return { campaigns: result.campaigns, lastDoc: result.lastDoc?.id || null };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
