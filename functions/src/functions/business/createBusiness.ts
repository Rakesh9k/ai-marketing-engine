import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { v7 as uuidv7 } from 'uuid';

import { verifyAuth, verifyBusinessAccess, setCustomClaims } from '../../middleware/auth';
import { validatedCallable } from '../../middleware/validation';
import { createBusinessDoc, getBusinessesByUser } from '../../services/firestore';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../../utils/logging';
import { mapErrorToHttpsError } from '../../utils/errors';
import type { Business, BusinessLocation, BusinessContact, BusinessSettings } from '../../types';

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
            tone: 'friendly',
            personality: '',
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
            primaryLanguage: 'te_en',
            secondaryLanguage: 'en',
            regionalStyle: 'hyderabadi',
            slangIntensity: 'moderate',
            languageMixing: 'natural',
          },
          businessRules: {
            openingHours: data.settings?.openingHours || {},
            deliveryRadiusKm: data.settings?.deliveryRadiusKm || 5,
            minimumOrder: data.settings?.minimumOrder || 0,
            offerValidityRules: '',
            pricingRules: '',
          },
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
          businessIds: admin.firestore.FieldValue.arrayUnion(businessId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Update custom claims with new businessIds array
      const userDoc = await admin.firestore().collection('users').doc(context.userId).get();
      const userData = userDoc.data();
      if (userData) {
        const businessIds = (userData['businessIds'] as string[]) || [];
        await setCustomClaims(context.userId, {
          role: (userData['role'] as string) || 'user',
          businessIds,
          agencyId: (userData['agencyId'] as string) || null,
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
