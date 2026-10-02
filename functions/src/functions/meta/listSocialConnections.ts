import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { validatedCallable } from '../../middleware/validation';
import { verifyBusinessAccess } from '../../middleware/auth';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { metaService } from '../../services/meta/metaService';

const listSocialConnectionsSchema = z.object({
  businessId: z.string().optional(),
});

export const listSocialConnections = onCall(
  {
    region: 'asia-south1',
    maxInstances: 20,
    timeoutSeconds: 30,
  },
  validatedCallable(listSocialConnectionsSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('listSocialConnections', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      if (data.businessId) {
        await verifyBusinessAccess(context.userId, data.businessId);
      }

      const connections = await metaService.listConnections(context.userId);

      logFunctionComplete(logger, startTime, { success: true, count: connections.length });
      return { connections };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
