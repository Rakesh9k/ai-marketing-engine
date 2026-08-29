import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyAuthAndBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getBusinessDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Business } from '../../types';

const getBusinessSchema = z.object({
  businessId: z.string().min(1),
});

export const getBusiness = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(getBusinessSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('getBusiness', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      await verifyAuthAndBusinessAccess(context as any, data.businessId);
      const business = await getBusinessDoc(data.businessId);

      if (!business) {
        throw new HttpsError('not-found', 'Business not found');
      }

      logFunctionComplete(logger, startTime, { success: true });
      return { business };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
