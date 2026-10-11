import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { metaService } from '../../services/meta/metaService';

const selectMetaPageSchema = z.object({
  stateId: z.string().min(1),
  selectedPageId: z.string().min(1),
});

export const selectMetaPage = onCall(
  {
    enforceAppCheck: true,
    region: 'asia-south1',
    maxInstances: 20,
    timeoutSeconds: 30,
    secrets: ['META_TOKEN_ENCRYPTION_KEY'],
  },
  validatedCallable(selectMetaPageSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('selectMetaPage', {
      userId: context.userId,
      stateId: data.stateId,
      selectedPageId: data.selectedPageId,
    });

    try {
      await checkRateLimit(context.userId, 'selectMetaPage');

      const connection = await metaService.finalizePageSelection(
        context.userId,
        data.stateId,
        data.selectedPageId
      );

      logFunctionComplete(logger, startTime, {
        success: true,
        connectionId: connection.connectionId,
      });
      return { connection };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
