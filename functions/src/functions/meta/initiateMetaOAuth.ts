import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { validatedCallable } from '../../middleware/validation';
import { checkRateLimit } from '../../middleware/rateLimit';
import { verifyBusinessAccess } from '../../middleware/auth';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { metaService } from '../../services/meta/metaService';

const initiateMetaOAuthSchema = z.object({
  businessId: z.string().optional(),
  redirectPath: z.string().optional(),
});

export const initiateMetaOAuth = onCall(
  {
    region: 'asia-south1',
    maxInstances: 20,
    timeoutSeconds: 30,
    secrets: ['META_APP_SECRET', 'META_TOKEN_ENCRYPTION_KEY'],
  },
  validatedCallable(initiateMetaOAuthSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('initiateMetaOAuth', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      await checkRateLimit(context.userId, 'initiateMetaOAuth');

      if (data.businessId) {
        await verifyBusinessAccess(context.userId, data.businessId);
      }

      const result = await metaService.createAuthorizationUrl(
        context.userId,
        data.businessId,
        data.redirectPath
      );

      logFunctionComplete(logger, startTime, { success: true });
      return result;
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
