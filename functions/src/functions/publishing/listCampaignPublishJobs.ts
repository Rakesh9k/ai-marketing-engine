import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { publishingService } from '../../services/publishing/publishingService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';

const listCampaignPublishJobsSchema = z.object({
  campaignId: z.string().min(1),
});

export const listCampaignPublishJobs = onCall({ enforceAppCheck: true }, async (request) => {
  const { logger, startTime } = logFunctionStart('listCampaignPublishJobs', {
    auth: request.auth?.uid,
  });

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const parsed = listCampaignPublishJobsSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid request body', parsed.error.flatten());
  }

  try {
    const jobs = await publishingService.listCampaignJobs(request.auth.uid, parsed.data.campaignId);
    logFunctionComplete(logger, startTime, {
      success: true,
      campaignId: parsed.data.campaignId,
      count: jobs.length,
    });
    return { jobs };
  } catch (err: any) {
    logFunctionError(logger, startTime, err instanceof Error ? err : new Error(String(err)));
    throw new HttpsError(
      'failed-precondition',
      err.message || 'Failed to list campaign publish jobs'
    );
  }
});
