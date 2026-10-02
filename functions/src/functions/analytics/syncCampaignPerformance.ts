import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { getCampaignDoc } from '../../services/firestore';
import { performanceSyncService } from '../../services/publishing/performanceSyncService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';

const syncCampaignPerformanceSchema = z.object({
  businessId: z.string().min(1),
  campaignId: z.string().min(1),
});

export const syncCampaignPerformance = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(syncCampaignPerformanceSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('syncCampaignPerformance', {
      userId: context.userId,
      businessId: data.businessId,
      campaignId: data.campaignId,
    });

    try {
      await verifyBusinessAccess(context.userId, data.businessId);
      await checkRateLimit(context.userId, 'syncCampaignPerformance');

      const campaign = await getCampaignDoc(data.campaignId);
      if (!campaign) {
        throw new HttpsError('not-found', 'Campaign not found');
      }
      if (campaign.businessId !== data.businessId) {
        throw new HttpsError(
          'permission-denied',
          'This campaign does not belong to the specified business'
        );
      }

      const postsPerformance = await performanceSyncService.syncCampaignPerformance(
        context.userId,
        data.campaignId
      );

      logFunctionComplete(logger, startTime, {
        success: true,
        campaignId: data.campaignId,
        syncedPosts: postsPerformance.length,
      });

      return {
        success: true,
        campaignId: data.campaignId,
        postsPerformance,
      };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
