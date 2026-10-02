import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { publishingService } from '../../services/publishing/publishingService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';

const createPublishJobSchema = z.object({
  campaignId: z.string().min(1),
  socialConnectionId: z.string().min(1),
  platform: z.enum(['instagram', 'facebook']),
  contentType: z.enum(['post', 'reel']),
  scheduledAt: z.string().nullable().optional(),
  captionOverride: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const createPublishJob = onCall(async (request) => {
  const { logger, startTime } = logFunctionStart('createPublishJob', {
    auth: request.auth?.uid,
  });

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const parsed = createPublishJobSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid request body', parsed.error.flatten());
  }

  try {
    const job = await publishingService.createPublishJob(request.auth.uid, parsed.data);
    logFunctionComplete(logger, startTime, { success: true, jobId: job.jobId, status: job.status });
    return { job };
  } catch (err: any) {
    logFunctionError(logger, startTime, err instanceof Error ? err : new Error(String(err)));
    throw new HttpsError('failed-precondition', err.message || 'Failed to create publish job');
  }
});
