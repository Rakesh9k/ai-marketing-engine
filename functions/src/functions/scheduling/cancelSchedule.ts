import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { schedulingService } from '../../services/scheduling/schedulingService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';

const cancelScheduleSchema = z.object({
  scheduledPostId: z.string().min(1),
});

export const cancelSchedule = onCall(async (request) => {
  const logCtx = logFunctionStart('cancelSchedule', { authUid: request.auth?.uid });

  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to cancel a scheduled post.'
    );
  }

  const parsed = cancelScheduleSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', `Invalid request parameters: ${parsed.error.message}`);
  }

  try {
    const post = await schedulingService.cancelSchedule(
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
