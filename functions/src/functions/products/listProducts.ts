import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getProductsByBusiness } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Product } from '../../types';

const listProductsSchema = z.object({
  businessId: z.string().min(1),
  limit: z.number().int().positive().max(50).default(20),
  cursor: z.string().optional(),
});

export const listProducts = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(listProductsSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('listProducts', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      await verifyBusinessAccess(context.userId, data.businessId);
      const products = await getProductsByBusiness(data.businessId);

      logFunctionComplete(logger, startTime, { success: true, count: products.length });
      return { products };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
