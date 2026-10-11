import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { schedulingService } from '../../services/scheduling/schedulingService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';

const reschedulePostSchema = z.object({
  scheduledPostId: z.string().min(1),
  newScheduledAt: z.string().min(1),
  timezone: z.string().min(1),
});

export const reschedulePost = onCall({ enforceAppCheck: true }, async (request) => {
  const logCtx = logFunctionStart('reschedulePost', { authUid: request.auth?.uid });

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to reschedule a post.');
  }

  const parsed = reschedulePostSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', `Invalid request parameters: ${parsed.error.message}`);
  }

  try {
    const post = await schedulingService.reschedulePost(request.auth.uid, parsed.data);
    logFunctionComplete(logCtx.logger, logCtx.startTime, {
      success: true,
      scheduledPostId: post.scheduledPostId,
      newScheduledAt: post.scheduledAt,
    });
    return { success: true, post };
  } catch (err) {
    logFunctionError(logCtx.logger, logCtx.startTime, err as Error);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', String(err));
  }
});
