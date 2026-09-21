import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getBusinessDoc, updateBusinessDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Business, BusinessLocation, BusinessContact, BusinessSettings } from '../../types';

const updateBusinessSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  category: z.enum(['restaurant', 'salon', 'real_estate']).optional(),
  description: z.string().max(500).optional(),
  location: z
    .object({
      city: z.string().min(1),
      state: z.string().min(1),
      locality: z.string().optional(),
      address: z.string().optional(),
      coordinates: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
    })
    .optional(),
  contact: z
    .object({
      phone: z.string().min(1),
      whatsapp: z.string().min(1),
      website: z.string().url().optional().or(z.literal('')),
      instagram: z.string().optional(),
    })
    .optional(),
  settings: z
    .object({
      timezone: z.string().default('Asia/Kolkata'),
      currency: z.literal('INR'),
      openingHours: z
        .record(z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }))
        .optional(),
      deliveryRadiusKm: z.number().positive().optional(),
      minimumOrder: z.number().positive().optional(),
      bookingRequired: z.boolean().optional(),
    })
    .optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export const updateBusiness = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(updateBusinessSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('updateBusiness', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      const { businessId, ...updateData } = data;
      await verifyBusinessAccess(context.userId, businessId);

      const existingBusiness = await getBusinessDoc(businessId);
      if (!existingBusiness) {
        throw new HttpsError('not-found', 'Business not found');
      }

      const mergedSettings = {
        ...existingBusiness.settings,
        ...updateData.settings,
      };

      const updatedBusiness = {
        ...existingBusiness,
        ...updateData,
        settings: mergedSettings,
        updatedAt: new Date().toISOString(),
      };

      await updateBusinessDoc(businessId, updatedBusiness);

      logFunctionComplete(logger, startTime, { success: true });
      return { business: updatedBusiness };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
