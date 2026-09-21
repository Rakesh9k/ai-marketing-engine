import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { v7 as uuidv7 } from 'uuid';

import { setCustomClaims } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { createBusinessDoc } from '../../services/firestore';
import { trackEvent, ANALYTICS_EVENTS } from '../../services/analyticsService';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Business } from '../../types';

const createBusinessSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['restaurant', 'salon', 'real_estate']),
  description: z.string().max(500).optional(),
  location: z.object({
    city: z.string().min(1),
    state: z.string().min(1),
    locality: z.string().optional(),
    address: z.string().optional(),
    coordinates: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
  }),
  contact: z.object({
    phone: z.string().min(1),
    whatsapp: z.string().min(1),
    website: z.string().url().optional().or(z.literal('')),
    instagram: z.string().optional(),
  }),
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
  operatingMode: z.enum(['dine-in', 'takeaway', 'delivery']).optional(),
  // Phase 30 — salon-only fields. Optional at the schema level (a
  // restaurant request never sends these, and the resulting businessBrain
  // gets no verticalProfile at all — unchanged from before this phase).
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
  // Phase 31 — real-estate-only fields. Same optional-at-the-schema-level
  // rationale as services/packages/appointmentSettings above.
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
  language: z.enum(['en', 'te', 'hi', 'te_en', 'hi_en']).optional(),
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
  contentStyle: z
    .enum([
      'funny',
      'quirky',
      'sarcastic',
      'dark_comedy',
      'emotional',
      'urgent',
      'fomo',
      'storytelling',
      'educational',
      'youthful',
    ])
    .optional(),
});

export const createBusiness = onCall(
  { region: 'asia-south1', enforceAppCheck: true },
  validatedCallable(createBusinessSchema, async (data, context) => {
    const { logger, startTime } = logFunctionStart('createBusiness', { userId: context.userId });

    try {
      const businessId = uuidv7();
      const now = new Date().toISOString();

      const business: Business = {
        businessId,
        userId: context.userId,
        name: data.name,
        category: data.category,
        description: data.description,
        location: data.location,
        contact: data.contact,
        businessBrain: {
          identity: {
            name: data.name,
            category: data.category,
            description: data.description || '',
            location: data.location,
            contact: data.contact,
          },
          products: [],
          brand: {
            tone:
              data.contentStyle === 'funny' || data.contentStyle === 'quirky'
                ? 'casual'
                : 'friendly',
            personality: data.contentStyle || '',
            visualPreferences: '',
            colors: { primary: '#E84D1A', secondary: '#FFFFFF', accent: '#FFD700' },
            fonts: { heading: 'Poppins', body: 'Inter' },
          },
          audience: {
            targetCustomer: '',
            ageRange: { min: 18, max: 65 },
            localities: [data.location.locality || data.location.city],
            preferences: '',
          },
          localization: {
            primaryLanguage: data.language || 'en',
            secondaryLanguage:
              data.language === 'te_en' ? 'te' : data.language === 'hi_en' ? 'hi' : 'en',
            regionalStyle: data.regionalStyle || 'neutral',
            slangIntensity: 'moderate',
            languageMixing: data.language?.includes('_') ? 'natural' : 'minimal',
          },
          businessRules: {
            openingHours: data.settings?.openingHours || {},
            deliveryRadiusKm: data.settings?.deliveryRadiusKm || 5,
            minimumOrder: data.settings?.minimumOrder || 0,
            offerValidityRules: '',
            pricingRules: '',
            operatingMode: data.operatingMode || 'dine-in',
          },
          // Phase 30/31: only set for a salon or real-estate business that
          // actually submitted this data — a restaurant (or a salon/real
          // estate business that skipped it) gets no verticalProfile at
          // all, exactly as before Phase 30. Nothing here is invented:
          // every field is either user-provided or a safe structural
          // default for the type's optional sub-shapes.
          ...(data.category === 'salon' &&
          (data.services?.length || data.packages?.length || data.appointmentSettings)
            ? {
                verticalProfile: {
                  vertical: data.category,
                  services: (data.services || []).map((s) => ({
                    id: s.id,
                    name: s.name,
                    category: s.category,
                    price: s.price,
                    durationMinutes: s.durationMinutes,
                    active: s.active ?? true,
                  })),
                  packages: (data.packages || []).map((p) => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    serviceIds: p.serviceIds ?? [],
                    packagePrice: p.packagePrice,
                    originalPrice: p.originalPrice,
                    validityDays: p.validityDays,
                    active: p.active ?? true,
                  })),
                  appointmentSettings: {
                    acceptInquiries: data.appointmentSettings?.acceptInquiries ?? true,
                    preferredBookingChannel:
                      data.appointmentSettings?.preferredBookingChannel ?? 'whatsapp',
                    bookingInstructions: data.appointmentSettings?.bookingInstructions,
                  },
                },
              }
            : {}),
          ...(data.category === 'real_estate' && data.properties?.length
            ? {
                verticalProfile: {
                  vertical: data.category,
                  properties: data.properties.map((p) => ({
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
                },
              }
            : {}),
          campaignHistory: [],
          lastSyncedAt: now,
        },
        settings: data.settings
          ? {
              timezone: data.settings.timezone || 'Asia/Kolkata',
              currency: data.settings.currency || 'INR',
              openingHours: data.settings.openingHours || {},
              deliveryRadiusKm: data.settings.deliveryRadiusKm || 5,
              minimumOrder: data.settings.minimumOrder || 0,
              bookingRequired: data.settings.bookingRequired || false,
            }
          : {
              timezone: 'Asia/Kolkata',
              currency: 'INR',
              openingHours: {},
              deliveryRadiusKm: 5,
              minimumOrder: 0,
              bookingRequired: false,
            },
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      await createBusinessDoc(business);
      await admin
        .firestore()
        .collection('users')
        .doc(context.userId)
        .update({
          businessIds: FieldValue.arrayUnion(businessId),
          updatedAt: FieldValue.serverTimestamp(),
        });

      // Track onboarding_complete event - business data successfully persisted
      await trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETE, context.userId, businessId);

      // Update custom claims with the new businessIds array. role and
      // agencyId are deliberately taken from context.token — the current,
      // cryptographically-verified custom claims already attached to this
      // authenticated request — and NOT re-read from the users/{uid}
      // Firestore document. That document's role/businessIds/agencyId
      // fields are now protected by firestore.rules from client writes,
      // but this also matters as defense in depth: custom-claims refresh
      // logic must never trust a Firestore document for the values it's
      // about to re-mint into a real auth token, even one current rules
      // happen to protect, since a rules regression would otherwise turn
      // this function back into a role/agency self-escalation path.
      const userDoc = await admin.firestore().collection('users').doc(context.userId).get();
      const userData = userDoc.data();
      if (userData) {
        const businessIds = (userData['businessIds'] as string[]) || [];
        await setCustomClaims(context.userId, {
          role: (context.token?.['role'] as string) || 'user',
          businessIds,
          agencyId: (context.token?.['agencyId'] as string) || null,
        });
      }

      logFunctionComplete(logger, startTime, { success: true });
      return { businessId, business };
    } catch (error) {
      logFunctionError(logger, startTime, error as Error);
      throw mapErrorToHttpsError(error);
    }
  })
);
