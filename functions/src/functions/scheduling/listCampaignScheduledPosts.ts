import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { schedulingService } from '../../services/scheduling/schedulingService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';

const listCampaignScheduledPostsSchema = z.object({
  campaignId: z.string().min(1),
});

export const listCampaignScheduledPosts = onCall(async (request) => {
  const logCtx = logFunctionStart('listCampaignScheduledPosts', { authUid: request.auth?.uid });

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to list scheduled posts.');
  }

  const parsed = listCampaignScheduledPostsSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', `Invalid request parameters: ${parsed.error.message}`);
  }

  try {
    const posts = await schedulingService.listScheduledPostsForCampaign(
      request.auth.uid,
      parsed.data.campaignId
    );
    logFunctionComplete(logCtx.logger, logCtx.startTime, {
      success: true,
      campaignId: parsed.data.campaignId,
      count: posts.length,
    });
    return { success: true, posts };
  } catch (err) {
    logFunctionError(logCtx.logger, logCtx.startTime, err as Error);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', String(err));
  }
});
