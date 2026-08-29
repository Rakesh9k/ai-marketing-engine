import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyAuth } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getBusinessesByUser } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Business } from '../../types';

const listBusinessesSchema = z.object({
  limit: z.number().int().positive().max(50).default(20),
  cursor: z.string().optional(),
});

export const listBusinesses = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(listBusinessesSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('listBusinesses', { userId: context.userId });

    try {
      await verifyAuth(context as any);
      const businesses = await getBusinessesByUser(context.userId);

      logFunctionComplete(logger, startTime, { success: true, count: businesses.length });
      return { businesses };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
