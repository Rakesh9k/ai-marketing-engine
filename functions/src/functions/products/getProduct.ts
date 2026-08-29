import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyAuthAndBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getProductDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Product } from '../../types';

const getProductSchema = z.object({
  productId: z.string().min(1),
  businessId: z.string().min(1),
});

export const getProduct = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(getProductSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('getProduct', {
      userId: context.userId,
      businessId: data.businessId,
      productId: data.productId,
    });

    try {
      await verifyAuthAndBusinessAccess(context as any, data.businessId);
      const product = await getProductDoc(data.productId);

      if (!product) {
        throw new HttpsError('not-found', 'Product not found');
      }

      if (product.businessId !== data.businessId) {
        throw new HttpsError('permission-denied', 'Product does not belong to this business');
      }

      logFunctionComplete(logger, startTime, { success: true });
      return { product };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
