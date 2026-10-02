import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getBusinessDoc, updateBusinessDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import { websiteUrlSchema } from '../../utils/zodHelpers';
import type { Business, BusinessLocation, BusinessContact, BusinessSettings } from '../../types';

const updateBusinessSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  // category and status are deliberately NOT accepted here (B2 in the fix
  // plan): the UI explicitly disables editing category
  // (business-profile/page.tsx), and this schema previously accepted it
  // anyway — changing a business's vertical after the fact would desync
  // businessBrain.verticalProfile, identity.category, and any existing
  // products/services/properties, none of which this callable migrates. A
  // real category change needs a dedicated, deliberate migration path, not
  // a side-effect of an otherwise-ordinary profile edit. Same reasoning for
  // status (archival) — that deserves its own explicit callable, not an
  // incidental field on a general-purpose update.
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
      website: websiteUrlSchema,
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

      // businessBrain.identity is a separate, once-written-at-onboarding
      // snapshot (createBusiness.ts) that Stage 1 (pipeline.ts) and the
      // creative template context actually read from — NOT the top-level
      // fields this callable was updating. Without this, editing the
      // business name/description/location/contact here never reached
      // campaign generation at all; it kept using whatever was true at
      // signup.
      const mergedIdentity = {
        ...existingBusiness.businessBrain?.identity,
        name:
          updateData.name ??
          existingBusiness.businessBrain?.identity?.name ??
          existingBusiness.name,
        category: existingBusiness.businessBrain?.identity?.category ?? existingBusiness.category,
        description:
          updateData.description ?? existingBusiness.businessBrain?.identity?.description ?? '',
        location: updateData.location ?? existingBusiness.businessBrain?.identity?.location,
        contact: updateData.contact ?? existingBusiness.businessBrain?.identity?.contact,
      };

      const updatedBusiness = {
        ...existingBusiness,
        ...updateData,
        settings: mergedSettings,
        businessBrain: {
          ...existingBusiness.businessBrain,
          identity: mergedIdentity,
          lastSyncedAt: new Date().toISOString(),
        },
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
