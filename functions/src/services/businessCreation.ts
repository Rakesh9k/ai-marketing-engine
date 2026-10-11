import { z } from 'zod';
import * as admin from 'firebase-admin';
import { FieldValue, type Transaction } from 'firebase-admin/firestore';

import { setCustomClaims } from '../middleware/auth';
import { websiteUrlSchema } from '../utils/zodHelpers';
import { DEFAULT_BRAIN_AGE_RANGE } from '../config/brainDefaults';
import type { Business, BrainKnowledge } from '../types';

/**
 * The one implementation of "create a business", shared by the original onboarding wizard
 * (createBusiness) and the conversational onboarding (confirmOnboardingBusiness).
 *
 * Two properties matter here and were previously missing:
 *  - Atomic. The plan-limit check, the business document and the link onto the user are one
 *    Firestore transaction. Before, the limit was checked, then written, in separate steps, so two
 *    concurrent submits could both pass it, and a failure part-way left a business behind that a
 *    retry could then never complete (it hit the limit).
 *  - Validated. Everything that becomes a business goes through `createBusinessSchema`, whichever
 *    path produced it.
 */

export const createBusinessSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['restaurant', 'salon', 'real_estate', 'general']),
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
    website: websiteUrlSchema,
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
  // Phase 30 — salon-only fields. Optional at the schema level (a restaurant request never sends
  // these, and the resulting businessBrain gets no verticalProfile at all — unchanged).
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
  // Phase 31 — real-estate-only fields. Same optional-at-the-schema-level rationale.
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

// The INPUT type: callables hand us the schema input, and buildBusiness applies each default itself.
export type CreateBusinessData = z.input<typeof createBusinessSchema>;

/**
 * What the conversational onboarding adds to the Business Brain, on top of the validated
 * `CreateBusinessData`. Deliberately NOT part of `createBusinessSchema`: that schema is what the
 * public `createBusiness` callable accepts from a browser, and a browser must never be able to
 * assert provenance. These only ever come from the server's own normalisation of an owner-confirmed
 * draft.
 */
export interface BrainExtras {
  industry?: string;
  subcategory?: string;
  owner?: { name?: string; role?: string };
  offerings?: { signature: string[] };
  audiencePrimary?: string[];
  usp?: string;
  knowledge?: BrainKnowledge;
}

export function buildBusiness(
  data: CreateBusinessData,
  userId: string,
  businessId: string,
  now: string,
  extras: BrainExtras = {}
): Business {
  return {
    businessId,
    userId,
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
        ...(extras.industry ? { industry: extras.industry } : {}),
        ...(extras.subcategory ? { subcategory: extras.subcategory } : {}),
      },
      products: [],
      brand: {
        tone:
          data.contentStyle === 'funny' || data.contentStyle === 'quirky' ? 'casual' : 'friendly',
        personality: data.contentStyle || '',
        visualPreferences: '',
        colors: { primary: '#E84D1A', secondary: '#FFFFFF', accent: '#FFD700' },
        fonts: { heading: 'Poppins', body: 'Inter' },
      },
      audience: {
        // Joined into the string the pipeline already reads, so what the owner chose reaches
        // generation without any prompt change; the list is kept alongside for the Business Brain UI.
        targetCustomer: extras.audiencePrimary?.join(', ') ?? '',
        ageRange: { ...DEFAULT_BRAIN_AGE_RANGE },
        localities: [data.location.locality || data.location.city],
        preferences: '',
        ...(extras.audiencePrimary?.length ? { primary: extras.audiencePrimary } : {}),
      },
      ...(extras.owner && (extras.owner.name || extras.owner.role) ? { owner: extras.owner } : {}),
      ...(extras.offerings?.signature.length ? { offerings: extras.offerings } : {}),
      ...(extras.usp ? { positioning: { usp: extras.usp } } : {}),
      ...(extras.knowledge ? { knowledge: extras.knowledge } : {}),
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
        // Unknown stays unknown: stored only when the owner gave it (never 5 km / "no minimum").
        ...(data.settings?.deliveryRadiusKm !== undefined
          ? { deliveryRadiusKm: data.settings.deliveryRadiusKm }
          : {}),
        ...(data.settings?.minimumOrder !== undefined
          ? { minimumOrder: data.settings.minimumOrder }
          : {}),
        offerValidityRules: '',
        pricingRules: '',
        // Unknown stays unknown: a mode is stored only when the owner chose it or it was derived from
        // something they said (a cloud kitchen is delivery-first). "dine-in" is not a default.
        ...(data.operatingMode ? { operatingMode: data.operatingMode } : {}),
      },
      // Phase 30/31: only set for a salon or real-estate business that actually submitted this
      // data — anything else (including `general`) gets no verticalProfile at all. Nothing here is
      // invented: every field is either user-provided or a safe structural default.
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
          ...(data.settings.deliveryRadiusKm !== undefined
            ? { deliveryRadiusKm: data.settings.deliveryRadiusKm }
            : {}),
          ...(data.settings.minimumOrder !== undefined
            ? { minimumOrder: data.settings.minimumOrder }
            : {}),
          bookingRequired: data.settings.bookingRequired || false,
        }
      : {
          timezone: 'Asia/Kolkata',
          currency: 'INR',
          openingHours: {},
          bookingRequired: false,
        },
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Counts the owner's non-archived businesses INSIDE the transaction. This is the same query (and so
 * the same composite index) as getBusinessesByUser; reading it through `tx` is what makes the plan
 * limit race-free: a concurrent creation forces one of the two transactions to retry and see the other.
 */
export async function countActiveBusinesses(tx: Transaction, userId: string): Promise<number> {
  const snap = await tx.get(
    admin
      .firestore()
      .collection('businesses')
      .where('userId', '==', userId)
      .where('status', '!=', 'archived')
      .orderBy('createdAt', 'desc')
  );
  return snap.size;
}

/** Stages the business document and its link onto the user. Call after ALL reads in the transaction. */
export function stageNewBusiness(tx: Transaction, business: Business): void {
  const db = admin.firestore();
  tx.set(db.collection('businesses').doc(business.businessId), {
    ...business,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  tx.update(db.collection('users').doc(business.userId), {
    businessIds: FieldValue.arrayUnion(business.businessId),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Re-mints the caller's custom claims with their current businessIds, so their next token lets them
 * write products/assets without signing out and in. `role` and `agencyId` come from the verified
 * token already attached to the request — NOT from the users/{uid} document — so this can never
 * become a role/agency self-escalation path even if rules regress. Idempotent.
 */
export async function refreshBusinessClaims(
  userId: string,
  token: Record<string, unknown> | undefined
): Promise<void> {
  const userDoc = await admin.firestore().collection('users').doc(userId).get();
  const userData = userDoc.data();
  if (!userData) return;
  const businessIds = (userData['businessIds'] as string[]) || [];
  await setCustomClaims(userId, {
    role: (token?.['role'] as string) || 'user',
    businessIds,
    agencyId: (token?.['agencyId'] as string) || null,
  });
}
