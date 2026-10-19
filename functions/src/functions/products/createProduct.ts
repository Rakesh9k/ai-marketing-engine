import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { createProductDoc, getProductsByBusiness } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Product } from '../../types';

const createProductSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  price: z.coerce.number().positive(),
  originalPrice: z.coerce.number().positive().optional(),
  currency: z.literal('INR').default('INR'),
  category: z.string().min(1).max(100).default('Main Course'),
  tags: z.array(z.string().max(50)).default([]),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        price: z.coerce.number().positive(),
        attributes: z.record(z.unknown()).optional(),
      })
    )
    .default([]),
  images: z
    .array(
      z.object({
        url: z.string(),
        storagePath: z.string().default(''),
        isPrimary: z.boolean().default(false),
      })
    )
    .default([]),
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
    .optional()
    .default({}),
  status: z.enum(['active', 'archived']).default('active'),
  sortOrder: z.number().optional(),
});

export const createProduct = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(createProductSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('createProduct', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      await verifyBusinessAccess(context.userId, data.businessId);

      const productId = uuidv7();
      const now = new Date().toISOString();

      const existingProducts = await getProductsByBusiness(data.businessId);
      const maxSortOrder = Math.max(...existingProducts.map((p) => p.sortOrder || 0), 0);

      const product: Product = {
        productId,
        businessId: data.businessId,
        name: data.name,
        description: data.description,
        price: data.price,
        originalPrice: data.originalPrice,
        currency: data.currency || 'INR',
        category: data.category || 'Main Course',
        tags: data.tags || [],
        variants: data.variants || [],
        images: (data.images || []).map((img) => ({
          url: img.url,
          storagePath: img.storagePath || '',
          isPrimary: Boolean(img.isPrimary),
        })),
        attributes: data.attributes || {},
        status: data.status || 'active',
        sortOrder: data.sortOrder ?? maxSortOrder + 1,
        createdAt: now,
        updatedAt: now,
      };

      await createProductDoc(product);

      logFunctionComplete(logger, startTime, { success: true });
      return { product };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
