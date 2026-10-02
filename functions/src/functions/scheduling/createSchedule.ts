import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { schedulingService } from '../../services/scheduling/schedulingService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';

const createScheduleSchema = z.object({
  campaignId: z.string().min(1),
  socialConnectionId: z.string().min(1),
  platform: z.enum(['instagram', 'facebook']),
  contentType: z.enum(['post', 'reel']),
  scheduledAt: z.string().min(1),
  timezone: z.string().min(1),
  captionOverride: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const createSchedule = onCall(async (request) => {
  const logCtx = logFunctionStart('createSchedule', { authUid: request.auth?.uid });

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to schedule a post.');
  }

  const parsed = createScheduleSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', `Invalid request parameters: ${parsed.error.message}`);
  }

  try {
    const post = await schedulingService.createSchedule(request.auth.uid, parsed.data);
    logFunctionComplete(logCtx.logger, logCtx.startTime, {
      success: true,
      scheduledPostId: post.scheduledPostId,
      status: post.status,
    });
    return { success: true, post };
  } catch (err) {
    logFunctionError(logCtx.logger, logCtx.startTime, err as Error);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', String(err));
  }
});
