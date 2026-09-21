import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

import { verifyBusinessAccess } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { getBusinessDoc, updateBusinessDoc } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { BusinessBrain } from '../../types';

// Phase 33 — customer-facing Business Brain editing. This schema is the
// enforcement boundary for "Do not allow users to modify: credits, Truth
// Check status, system ownership, tenant IDs, internal authorization,
// billing state" — those fields simply never appear below, so Zod strips
// anything else the client sends and there is no code path from here to
// them. Only the fields explicitly called out as safe/customer-facing in
// the Phase 33 spec are included.
const updateBusinessBrainSchema = z.object({
  businessId: z.string().min(1),

  // Brand — tone/style only, matching what generateCampaignStrategy and
  // the /brand page's engine-consumed fields actually use. No invented
  // brand properties.
  brand: z
    .object({
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
      personality: z.string().max(200).optional(),
      visualPreferences: z.string().max(200).optional(),
    })
    .optional(),

  // Audience
  audience: z
    .object({
      targetCustomer: z.string().max(300).optional(),
      ageRange: z
        .object({ min: z.number().int().min(0).max(120), max: z.number().int().min(0).max(120) })
        .optional(),
      localities: z.array(z.string().min(1)).max(20).optional(),
      preferences: z.string().max(300).optional(),
    })
    .optional(),

  // Localization — preserves the existing supported language/style options.
  localization: z
    .object({
      primaryLanguage: z.enum(['en', 'te', 'hi', 'te_en', 'hi_en']).optional(),
      secondaryLanguage: z.enum(['en', 'te', 'hi', 'te_en', 'hi_en']).optional(),
      regionalStyle: z
        .enum([
          'neutral',
          'hyderabadi',
          'telangana',
          'mumbai',
          'bangalore',
          'delhi',
          'chennai',
          'kolkata',
        ])
        .optional(),
      slangIntensity: z.enum(['none', 'light', 'moderate', 'heavy']).optional(),
      languageMixing: z.enum(['minimal', 'natural', 'heavy']).optional(),
    })
    .optional(),

  // Business Rules — safe subset only. openingHours is already editable via
  // updateBusiness/settings; deliberately excluded here to avoid a second,
  // divergent write path for the same data. Nothing security-critical
  // (credits, Truth Check, ownership, tenant, auth, billing) is here.
  businessRules: z
    .object({
      deliveryRadiusKm: z.number().positive().optional(),
      minimumOrder: z.number().nonnegative().optional(),
      offerValidityRules: z.string().max(500).optional(),
      pricingRules: z.string().max(500).optional(),
      operatingMode: z.enum(['dine-in', 'takeaway', 'delivery']).optional(),
    })
    .optional(),

  // Vertical profile — salon services/packages/appointmentSettings, or
  // real-estate properties. Shape mirrors createBusiness's schema exactly
  // so this is the one, consistent write path for these fields post-
  // onboarding (previously there was none at all — see Phase 30/31 known
  // limitations).
  services: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(100),
        category: z.enum(['hair', 'skin', 'nails', 'makeup', 'bridal', 'spa', 'grooming', 'other']),
        price: z.number().nonnegative(),
        durationMinutes: z.number().positive().optional(),
        active: z.boolean().default(true),
      })
    )
    .max(50)
    .optional(),
  packages: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        serviceIds: z.array(z.string()).default([]),
        packagePrice: z.number().nonnegative(),
        originalPrice: z.number().nonnegative().optional(),
        validityDays: z.number().positive().optional(),
        active: z.boolean().default(true),
      })
    )
    .max(20)
    .optional(),
  appointmentSettings: z
    .object({
      acceptInquiries: z.boolean().default(true),
      preferredBookingChannel: z.enum(['whatsapp', 'phone', 'in_person']).default('whatsapp'),
      bookingInstructions: z.string().max(500).optional(),
    })
    .optional(),
  properties: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1).max(150),
        propertyType: z.enum(['apartment', 'villa', 'plot', 'commercial', 'other']),
        projectName: z.string().max(150).optional(),
        areaSqft: z.number().positive().optional(),
        bedrooms: z.number().int().nonnegative().optional(),
        bathrooms: z.number().int().nonnegative().optional(),
        price: z.number().nonnegative(),
        possessionStatus: z.enum(['ready_to_move', 'under_construction', 'upcoming']),
        amenities: z.array(z.string()).default([]),
        availability: z.enum(['available', 'booked', 'sold']).default('available'),
        active: z.boolean().default(true),
      })
    )
    .max(100)
    .optional(),
});

export const updateBusinessBrain = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(updateBusinessBrainSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('updateBusinessBrain', {
      userId: context.userId,
      businessId: data.businessId,
    });

    try {
      const { businessId, brand, audience, localization, businessRules, ...verticalData } = data;
      await verifyBusinessAccess(context.userId, businessId);

      const existingBusiness = await getBusinessDoc(businessId);
      if (!existingBusiness) {
        throw new HttpsError('not-found', 'Business not found');
      }

      const existingBrain = existingBusiness.businessBrain;

      const hasVerticalEdits =
        verticalData.services !== undefined ||
        verticalData.packages !== undefined ||
        verticalData.appointmentSettings !== undefined ||
        verticalData.properties !== undefined;

      if (hasVerticalEdits) {
        const isSalonField =
          verticalData.services !== undefined ||
          verticalData.packages !== undefined ||
          verticalData.appointmentSettings !== undefined;
        const isRealEstateField = verticalData.properties !== undefined;

        if (isSalonField && existingBusiness.category !== 'salon') {
          throw new HttpsError(
            'invalid-argument',
            'Services/packages can only be set for a salon business'
          );
        }
        if (isRealEstateField && existingBusiness.category !== 'real_estate') {
          throw new HttpsError(
            'invalid-argument',
            'Properties can only be set for a real-estate business'
          );
        }
      }

      const mergedBrand = brand ? { ...existingBrain.brand, ...brand } : existingBrain.brand;
      const mergedAudience = audience
        ? { ...existingBrain.audience, ...audience }
        : existingBrain.audience;
      const mergedLocalization = localization
        ? { ...existingBrain.localization, ...localization }
        : existingBrain.localization;
      const mergedBusinessRules = businessRules
        ? { ...existingBrain.businessRules, ...businessRules }
        : existingBrain.businessRules;

      let mergedVerticalProfile = existingBrain.verticalProfile;
      if (hasVerticalEdits) {
        mergedVerticalProfile = {
          ...existingBrain.verticalProfile,
          vertical: existingBusiness.category,
          ...(verticalData.services !== undefined
            ? {
                services: verticalData.services.map((s) => ({
                  id: s.id,
                  name: s.name,
                  category: s.category,
                  price: s.price,
                  durationMinutes: s.durationMinutes,
                  active: s.active ?? true,
                })),
              }
            : {}),
          ...(verticalData.packages !== undefined
            ? {
                packages: verticalData.packages.map((p) => ({
                  id: p.id,
                  name: p.name,
                  description: p.description,
                  serviceIds: p.serviceIds ?? [],
                  packagePrice: p.packagePrice,
                  originalPrice: p.originalPrice,
                  validityDays: p.validityDays,
                  active: p.active ?? true,
                })),
              }
            : {}),
          ...(verticalData.appointmentSettings !== undefined
            ? {
                appointmentSettings: {
                  acceptInquiries: verticalData.appointmentSettings.acceptInquiries ?? true,
                  preferredBookingChannel:
                    verticalData.appointmentSettings.preferredBookingChannel ?? 'whatsapp',
                  bookingInstructions: verticalData.appointmentSettings.bookingInstructions,
                },
              }
            : {}),
          ...(verticalData.properties !== undefined
            ? {
                properties: verticalData.properties.map((p) => ({
                  id: p.id,
                  title: p.title,
                  propertyType: p.propertyType,
                  projectName: p.projectName,
                  areaSqft: p.areaSqft,
                  bedrooms: p.bedrooms,
                  bathrooms: p.bathrooms,
                  price: p.price,
                  possessionStatus: p.possessionStatus,
                  amenities: p.amenities ?? [],
                  availability: p.availability ?? 'available',
                  active: p.active ?? true,
                })),
              }
            : {}),
        };
      }

      const updatedBrain: BusinessBrain = {
        ...existingBrain,
        brand: mergedBrand,
        audience: mergedAudience,
        localization: mergedLocalization,
        businessRules: mergedBusinessRules,
        ...(mergedVerticalProfile ? { verticalProfile: mergedVerticalProfile } : {}),
        lastSyncedAt: new Date().toISOString(),
      };

      await updateBusinessDoc(businessId, { businessBrain: updatedBrain });

      logFunctionComplete(logger, startTime, { success: true });
      return { businessBrain: updatedBrain };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
