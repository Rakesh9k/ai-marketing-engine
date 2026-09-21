import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getReelProjectsByBusiness } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';

const listReelsSchema = z.object({
  businessId: z.string().min(1),
  limit: z.number().int().positive().max(50).default(20),
});

export const listReels = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(listReelsSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('listReels', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      await verifyBusinessAccess(context.userId, data.businessId);
      const result = await getReelProjectsByBusiness(data.businessId, data.limit);

      logFunctionComplete(logger, startTime, { success: true, count: result.reels.length });
      return { reels: result.reels, lastDoc: result.lastDoc?.id || null };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
