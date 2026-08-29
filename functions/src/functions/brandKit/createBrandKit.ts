import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyAuthAndBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { createBrandKitDoc, getBrandKitDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { BrandKit } from '../../types';

const createBrandKitSchema = z.object({
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
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
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
      .default('#FFFFFF'),
    text: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .default('#1A1A1A'),
  }),
  fonts: z.object({
    heading: z.string().min(1),
    body: z.string().min(1),
  }),
  tone: z.enum([
    'professional',
    'friendly',
    'premium',
    'traditional',
    'modern',
    'luxury',
    'casual',
    'bold',
  ]),
  personality: z.string().max(500).optional(),
  visualPreferences: z.string().max(500).optional(),
  targetAudience: z.string().max(500).optional(),
});

export const createBrandKit = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(createBrandKitSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('createBrandKit', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      await verifyAuthAndBusinessAccess(context as any, data.businessId);

      const existingBrandKit = await getBrandKitDoc(data.businessId);
      const now = new Date().toISOString();

      const brandKit: BrandKit = {
        businessId: data.businessId,
        logo: data.logo,
        colors: {
          primary: data.colors.primary,
          secondary: data.colors.secondary,
          accent: data.colors.accent,
          background: data.colors.background || '#FFFFFF',
          text: data.colors.text || '#1A1A1A',
        },
        fonts: {
          heading: data.fonts.heading,
          body: data.fonts.body,
        },
        tone: data.tone,
        personality: data.personality,
        visualPreferences: data.visualPreferences,
        targetAudience: data.targetAudience,
        updatedAt: now,
      };

      await createBrandKitDoc(brandKit);

      logFunctionComplete(logger, startTime, { success: true });
      return { brandKit };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
