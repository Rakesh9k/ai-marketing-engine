import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { metaService } from '../../services/meta/metaService';

const getPendingMetaPagesSchema = z.object({
  stateId: z.string().min(1),
});

export const getPendingMetaPages = onCall(
  {
    region: 'asia-south1',
    maxInstances: 20,
    timeoutSeconds: 30,
  },
  validatedCallable(getPendingMetaPagesSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('getPendingMetaPages', {
      userId: context.userId,
      stateId: data.stateId,
    });

    try {
      await checkRateLimit(context.userId, 'getPendingMetaPages');

      const pages = await metaService.getPendingPagesSession(context.userId, data.stateId);

      logFunctionComplete(logger, startTime, { success: true, count: pages.length });
      return { pages };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
