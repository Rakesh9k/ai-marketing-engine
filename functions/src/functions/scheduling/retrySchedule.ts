import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { schedulingService } from '../../services/scheduling/schedulingService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';

const retryScheduleSchema = z.object({
  scheduledPostId: z.string().min(1),
});

export const retrySchedule = onCall(async (request) => {
  const logCtx = logFunctionStart('retrySchedule', { authUid: request.auth?.uid });

  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to retry a scheduled post.'
    );
  }

  const parsed = retryScheduleSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', `Invalid request parameters: ${parsed.error.message}`);
  }

  try {
    const post = await schedulingService.retryScheduledPost(
      request.auth.uid,
      parsed.data.scheduledPostId
    );
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
