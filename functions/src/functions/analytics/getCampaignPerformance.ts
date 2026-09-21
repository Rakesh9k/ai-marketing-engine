import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getCampaignDoc, getCampaignPerformanceDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';

/**
 * Phase 34 — read side of the campaign performance record. Returns the
 * real aggregate from `campaign_performance/{campaignId}` (written only by
 * recordWhatsAppClick.ts). `whatsappClicks` is a true count — 0 is a valid,
 * known answer when no click has ever been recorded. `inquiries` is always
 * null and `inquiriesAvailable` is always false: there is no integrated
 * source for it anywhere in this system (see docs/PERFORMANCE_DATA_READINESS.md)
 * — the frontend must render "Not available," never "0".
 */
const getCampaignPerformanceSchema = z.object({
  businessId: z.string().min(1),
  campaignId: z.string().min(1),
});

export interface CampaignPerformanceResult {
  campaignId: string;
  whatsappClicks: number;
  inquiries: null;
  inquiriesAvailable: false;
  updatedAt: string | null;
}

export const getCampaignPerformance = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(getCampaignPerformanceSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('getCampaignPerformance', {
      userId: context.userId,
      businessId: data.businessId,
      campaignId: data.campaignId,
    });

    try {
      await verifyBusinessAccess(context.userId, data.businessId);

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

      const performance = await getCampaignPerformanceDoc(data.campaignId);

      const result: CampaignPerformanceResult = {
        campaignId: data.campaignId,
        // No event recorded yet is a known "zero clicks," not "unknown" —
        // the absence of a document here means the click genuinely never
        // happened, unlike inquiries below where the absence means the
        // system simply has no way to observe the answer.
        whatsappClicks: performance?.whatsappClicks ?? 0,
        inquiries: null,
        inquiriesAvailable: false,
        updatedAt: performance?.updatedAt ?? null,
      };

      logFunctionComplete(logger, startTime, { success: true });
      return result;
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
