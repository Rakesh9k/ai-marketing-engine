import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { metaService } from '../../services/meta/metaService';

const disconnectMetaConnectionSchema = z.object({
  connectionId: z.string().min(1),
});

export const disconnectMetaConnection = onCall(
  {
    enforceAppCheck: true,
    region: 'asia-south1',
    maxInstances: 20,
    timeoutSeconds: 30,
  },
  validatedCallable(disconnectMetaConnectionSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('disconnectMetaConnection', {
      userId: context.userId,
      connectionId: data.connectionId,
    });

    try {
      await checkRateLimit(context.userId, 'disconnectMetaConnection');

      await metaService.disconnectConnection(context.userId, data.connectionId);

      logFunctionComplete(logger, startTime, { success: true });
      return { success: true, connectionId: data.connectionId };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
