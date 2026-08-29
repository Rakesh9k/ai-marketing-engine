import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyAuthAndBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getBrandKitDoc, updateBrandKitDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { BrandKit } from '../../types';

const updateBrandKitSchema = z.object({
  businessId: z.string().min(1),
  logo: z
    .object({
      primary: z
        .object({
          url: z.string().url(),
          storagePath: z.string(),
          width: z.number(),
          height: z.number(),
        })
        .optional(),
      secondary: z
        .object({
          url: z.string().url(),
          storagePath: z.string(),
          width: z.number(),
          height: z.number(),
        })
        .optional(),
    })
    .optional(),
  colors: z
    .object({
      primary: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      secondary: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      accent: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      background: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      text: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
    })
    .optional(),
  fonts: z
    .object({
      heading: z.string().min(1).optional(),
      body: z.string().min(1).optional(),
    })
    .optional(),
  tone: z
    .enum([
      'professional',
      'friendly',
      'premium',
      'traditional',
      'modern',
      'luxury',
      'casual',
      'bold',
    ])
    .optional(),
  personality: z.string().max(500).optional(),
  visualPreferences: z.string().max(500).optional(),
  targetAudience: z.string().max(500).optional(),
});

export const updateBrandKit = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(updateBrandKitSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('updateBrandKit', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      const { businessId, ...updateData } = data;
      await verifyAuthAndBusinessAccess(context as any, businessId);

      const existingBrandKit = await getBrandKitDoc(businessId);
      if (!existingBrandKit) {
        throw new HttpsError('not-found', 'Brand kit not found');
      }

      const updatedBrandKit: BrandKit = {
        ...existingBrandKit,
        ...updateData,
        colors: {
          ...existingBrandKit.colors,
          ...updateData.colors,
        },
        fonts: {
          ...existingBrandKit.fonts,
          ...updateData.fonts,
        },
        updatedAt: new Date().toISOString(),
      };

      await updateBrandKitDoc(businessId, updatedBrandKit);

      logFunctionComplete(logger, startTime, { success: true });
      return { brandKit: updatedBrandKit };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
