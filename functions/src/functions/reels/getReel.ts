import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getReelProjectDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';

const getReelSchema = z.object({
  businessId: z.string().min(1),
  reelId: z.string().min(1),
});

export const getReel = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(getReelSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('getReel', {
      userId: context.userId,
      businessId: data.businessId,
      reelId: data.reelId,
    });

    try {
      await verifyBusinessAccess(context.userId, data.businessId);
      const reel = await getReelProjectDoc(data.reelId);

      if (!reel) {
        throw new HttpsError('not-found', 'Reel not found');
      }
      if (reel.businessId !== data.businessId) {
        throw new HttpsError('permission-denied', 'Reel does not belong to this business');
      }

      logFunctionComplete(logger, startTime, { success: true });
      return { reel };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
