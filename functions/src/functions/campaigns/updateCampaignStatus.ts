import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import {
  getCampaignDoc,
  updateCampaignStatus as updateCampaignStatusService,
} from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
/**
 * This callable was publicly invokable (onCall, ownership-checked only) and
 * accepted the entire CampaignStatus enum, including 'completed'/'failed' —
 * every pipeline-internal and verification-implying status. It is not
 * called anywhere in the frontend (confirmed by search), but as a live
 * public Cloud Function, any authenticated user could have called it
 * directly to mark any of their own campaigns 'completed' with zero Truth
 * Check ever having run. generateCampaignStrategy.ts and regenerateAsset.ts
 * already set status transitions themselves via direct Admin SDK writes —
 * they never call this endpoint. Restricted to 'draft' only: the sole
 * client-meaningful status transition (resetting/un-drafting a campaign)
 * that carries no verification claim. See Phase 6 Truth Check report.
 */
const updateCampaignStatusSchema = z.object({
  campaignId: z.string().min(1),
  businessId: z.string().min(1),
  status: z.enum(['draft']),
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
      const { campaignId, businessId, status } = data;
      await verifyBusinessAccess(context.userId, businessId);

      const existingCampaign = await getCampaignDoc(campaignId);
      if (!existingCampaign) {
        throw new HttpsError('not-found', 'Campaign not found');
      }

      if (existingCampaign.businessId !== businessId) {
        throw new HttpsError('permission-denied', 'Campaign does not belong to this business');
      }

      await updateCampaignStatusService(campaignId, status);

      logFunctionComplete(logger, startTime, { success: true });
      return { success: true };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
