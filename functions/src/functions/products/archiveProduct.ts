import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getProductDoc, updateProductDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Product } from '../../types';

const archiveProductSchema = z.object({
  productId: z.string().min(1),
  businessId: z.string().min(1),
});

export const archiveProduct = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(archiveProductSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('archiveProduct', {
      userId: context.userId,
      businessId: data.businessId,
      productId: data.productId,
    });

    try {
      await verifyBusinessAccess(context.userId, data.businessId);

      const existingProduct = await getProductDoc(data.productId);
      if (!existingProduct) {
        throw new HttpsError('not-found', 'Product not found');
      }

      if (existingProduct.businessId !== data.businessId) {
        throw new HttpsError('permission-denied', 'Product does not belong to this business');
      }

      const updatedProduct: Product = {
        ...existingProduct,
        status: 'archived',
        updatedAt: new Date().toISOString(),
      };

      await updateProductDoc(data.productId, updatedProduct);

      logFunctionComplete(logger, startTime, { success: true });
      return { product: updatedProduct };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
