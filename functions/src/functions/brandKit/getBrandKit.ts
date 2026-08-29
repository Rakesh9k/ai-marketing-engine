import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyAuthAndBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getBrandKitDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { BrandKit } from '../../types';

const getBrandKitSchema = z.object({
  businessId: z.string().min(1),
});

export const getBrandKit = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(getBrandKitSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('getBrandKit', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      await verifyAuthAndBusinessAccess(context as any, data.businessId);
      const brandKit = await getBrandKitDoc(data.businessId);

      if (!brandKit) {
        throw new HttpsError('not-found', 'Brand kit not found');
      }

      logFunctionComplete(logger, startTime, { success: true });
      return { brandKit };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
