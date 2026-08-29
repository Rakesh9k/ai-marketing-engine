import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyAuthAndBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getCampaignDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Campaign } from '../../types';

const getCampaignSchema = z.object({
  campaignId: z.string().min(1),
  businessId: z.string().min(1),
});

export const getCampaign = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(getCampaignSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('getCampaign', {
      userId: context.userId,
      businessId: data.businessId,
      campaignId: data.campaignId,
    });

    try {
      await verifyAuthAndBusinessAccess(context as any, data.businessId);
      const campaign = await getCampaignDoc(data.campaignId);

      if (!campaign) {
        throw new HttpsError('not-found', 'Campaign not found');
      }

      if (campaign.businessId !== data.businessId) {
        throw new HttpsError('permission-denied', 'Campaign does not belong to this business');
      }

      logFunctionComplete(logger, startTime, { success: true });
      return { campaign };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
