import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getProductDoc, updateProductDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Product } from '../../types';

const updateProductSchema = z.object({
  productId: z.string().min(1),
  businessId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  price: z.coerce.number().positive().optional(),
  originalPrice: z.coerce.number().positive().optional(),
  currency: z.literal('INR').optional(),
  category: z.string().min(1).max(100).optional(),
  tags: z.array(z.string().max(50)).optional(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        price: z.coerce.number().positive(),
        attributes: z.record(z.unknown()).optional(),
      })
    )
    .optional(),
  images: z
    .array(
      z.object({
        url: z.string(),
        storagePath: z.string().default(''),
        isPrimary: z.boolean().default(false),
      })
    )
    .optional(),
  attributes: z
    .object({
      veg: z.boolean().optional(),
      spiceLevel: z.enum(['mild', 'medium', 'hot', 'extra_hot']).optional(),
      prepTimeMinutes: z.number().positive().optional(),
      availableHours: z.record(z.boolean()).optional(),
      deliveryOnly: z.boolean().optional(),
      dineInOnly: z.boolean().optional(),
    })
    .passthrough()
    .optional(),
  status: z.enum(['active', 'archived']).optional(),
  sortOrder: z.number().optional(),
});

export const updateProduct = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(updateProductSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('updateProduct', {
      userId: context.userId,
      businessId: data.businessId,
      productId: data.productId,
    });

    try {
      const { productId, businessId, images, ...updateData } = data;
      await verifyBusinessAccess(context.userId, businessId);

      const existingProduct = await getProductDoc(productId);
      if (!existingProduct) {
        throw new HttpsError('not-found', 'Product not found');
      }

      if (existingProduct.businessId !== businessId) {
        throw new HttpsError('permission-denied', 'Product does not belong to this business');
      }

      const updatedProduct: Product = {
        ...existingProduct,
        ...updateData,
        ...(images
          ? {
              images: images.map((img) => ({
                url: img.url,
                storagePath: img.storagePath || '',
                isPrimary: Boolean(img.isPrimary),
              })),
            }
          : {}),
        updatedAt: new Date().toISOString(),
      };

      await updateProductDoc(productId, updatedProduct);

      logFunctionComplete(logger, startTime, { success: true });
      return { product: updatedProduct };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
