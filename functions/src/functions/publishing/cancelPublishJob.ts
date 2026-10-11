import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { publishingService } from '../../services/publishing/publishingService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';

const cancelPublishJobSchema = z.object({
  jobId: z.string().min(1),
});

export const cancelPublishJob = onCall({ enforceAppCheck: true }, async (request) => {
  const { logger, startTime } = logFunctionStart('cancelPublishJob', {
    auth: request.auth?.uid,
  });

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const parsed = cancelPublishJobSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid request body', parsed.error.flatten());
  }

  try {
    const job = await publishingService.cancelPublishJob(request.auth.uid, parsed.data.jobId);
    logFunctionComplete(logger, startTime, { success: true, jobId: job.jobId });
    return { job };
  } catch (err: any) {
    logFunctionError(logger, startTime, err instanceof Error ? err : new Error(String(err)));
    throw new HttpsError('failed-precondition', err.message || 'Failed to cancel publish job');
  }
});
