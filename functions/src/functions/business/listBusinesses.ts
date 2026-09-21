import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

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
      // Auth is already verified by validatedCallable — context.userId is
      // the real, authenticated uid. A prior call here to
      // verifyAuth(context as any) always threw (context is {userId,
      // token}, not a CallableRequest with an .auth property), so this
      // function could never actually succeed for any caller.
      const businesses = await getBusinessesByUser(context.userId);

      logFunctionComplete(logger, startTime, { success: true, count: businesses.length });
      return { businesses };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
