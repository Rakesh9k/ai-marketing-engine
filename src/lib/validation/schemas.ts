import { z } from 'zod';
import type {
  User,
  Business,
  BrandKit,
  Product,
  Campaign,
  CampaignAsset,
  Subscription,
  Usage,
  Transaction,
  AnalyticsEvent,
  GenerationLog,
  BusinessLocation,
  BusinessContact,
  BusinessSettings,
  LocalizationProfile,
} from '@/types';

export const businessLocationSchema: z.ZodType<BusinessLocation> = z.object({
  city: z.string().min(1),
  state: z.string().min(1),
  locality: z.string().optional(),
  address: z.string().optional(),
  coordinates: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
});

export const businessContactSchema: z.ZodType<BusinessContact> = z.object({
  phone: z.string().min(1),
  whatsapp: z.string().min(1),
  website: z.string().url().optional().or(z.literal('')),
  instagram: z.string().optional(),
});

export const businessSettingsSchema = z.object({
  timezone: z.string().default('Asia/Kolkata'),
  currency: z.literal('INR'),
  openingHours: z
    .record(
      z.object({
        open: z.string(),
        close: z.string(),
        closed: z.boolean().optional(),
      })
    )
    .optional()
    .default({}),
  deliveryRadiusKm: z.number().positive().optional(),
  minimumOrder: z.number().positive().optional(),
  bookingRequired: z.boolean().optional(),
}) as z.ZodType<BusinessSettings>;

export const localizationProfileSchema: z.ZodType<LocalizationProfile> = z.object({
  country: z.string().min(1),
  state: z.string().min(1),
  city: z.string().min(1),
  locality: z.string().min(1),
  primaryLanguage: z.enum(['en', 'te', 'hi', 'te_en', 'hi_en']),
  secondaryLanguage: z.enum(['en', 'te', 'hi', 'te_en', 'hi_en']),
  languageMixing: z.enum(['minimal', 'natural', 'heavy']),
  regionalStyle: z.enum([
    'neutral',
    'hyderabadi',
    'telangana',
    'mumbai',
    'bangalore',
    'delhi',
    'chennai',
    'kolkata',
  ]),
  slangPreference: z.enum(['none', 'light', 'moderate', 'heavy']),
  audienceDescription: z.string().min(1),
  brandTone: z.enum([
    'professional',
    'friendly',
    'premium',
    'traditional',
    'modern',
    'luxury',
    'casual',
    'bold',
  ]),
  campaignStyle: z.enum([
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
  ]),
  contentFormat: z.enum(['poster', 'story', 'reel', 'caption', 'whatsapp']),
});

export const userSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
  role: z.enum(['user', 'agency_admin', 'agency_member']).default('user'),
  businessIds: z.array(z.string()).default([]),
  agencyId: z.string().optional(),
  subscriptionId: z.string().optional(),
  settings: z.object({
    notifications: z.boolean().default(true),
    language: z.enum(['en', 'te', 'hi']).default('en'),
    timezone: z.string().default('Asia/Kolkata'),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().optional(),
  deletedAt: z.string().datetime().optional(),
}) as z.ZodType<User>;

export const businessSchema = z.object({
  businessId: z.string().min(1),
  userId: z.string().min(1),
  agencyId: z.string().optional(),
  name: z.string().min(1).max(100),
  category: z.enum(['restaurant', 'salon', 'real_estate']),
  description: z.string().max(500).optional(),
  location: businessLocationSchema,
  contact: businessContactSchema,
  businessBrain: z.any(),
  settings: businessSettingsSchema,
  status: z.enum(['active', 'archived']).default('active'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().optional(),
}) as z.ZodType<Business>;

export const brandKitSchema = z.object({
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
  updatedAt: z.string().datetime(),
}) as z.ZodType<BrandKit>;

export const productSchema = z.object({
  productId: z.string().min(1),
  businessId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  originalPrice: z.number().positive().optional(),
  currency: z.literal('INR').default('INR'),
  category: z.enum(['starter', 'main', 'dessert', 'beverage', 'combo', 'service', 'package']),
  tags: z
    .array(z.enum(['signature', 'bestseller', 'new', 'seasonal', 'vegetarian', 'spicy']))
    .default([]),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        price: z.number().positive(),
        attributes: z.record(z.unknown()).optional(),
      })
    )
    .default([]),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        storagePath: z.string(),
        isPrimary: z.boolean(),
      })
    )
    .min(1),
  attributes: z
    .object({
      veg: z.boolean().optional(),
      spiceLevel: z.enum(['mild', 'medium', 'hot', 'extra_hot']).optional(),
      prepTimeMinutes: z.number().positive().optional(),
      availableHours: z.record(z.boolean()).optional(),
      deliveryOnly: z.boolean().optional(),
      dineInOnly: z.boolean().optional(),
    })
    .optional()
    .default({}),
  status: z.enum(['active', 'archived']).default('active'),
  sortOrder: z.number().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}) as z.ZodType<Product>;

export const campaignSchema: z.ZodType<Campaign> = z.object({
  campaignId: z.string().min(1),
  businessId: z.string().min(1),
  userId: z.string().min(1),
  objective: z.enum(['weekend_offer', 'new_dish', 'festival', 'discount', 'brand_awareness']),
  productId: z.string().optional(),
  newProduct: z
    .object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      price: z.number().positive(),
      images: z.array(z.string().url()).min(1).max(5),
    })
    .optional(),
  offer: z.object({
    headline: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    price: z.number().positive(),
    originalPrice: z.number().positive().optional(),
    type: z.enum(['percentage', 'fixed', 'bogo', 'combo', 'free_delivery', 'loyalty']),
    validityStart: z.string().datetime(),
    validityEnd: z.string().datetime(),
    terms: z.string().max(1000).optional(),
  }),
  duration: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  audience: z.object({
    localities: z.array(z.string()).min(1).max(10),
    ageRange: z
      .object({
        min: z.number().min(18),
        max: z.number().max(80),
      })
      .optional(),
    occasion: z.enum(['weekend', 'festival', 'weekday_lunch', 'family']).optional(),
  }),
  cta: z.enum(['order_whatsapp', 'book_table', 'view_menu', 'call_now', 'get_directions']),
  localization: localizationProfileSchema,
  status: z.enum([
    'draft',
    'validating',
    'queued',
    'analyzing',
    'strategizing',
    'generating_copy',
    'generating_creatives',
    'validating_output',
    'completed',
    'failed',
  ]),
  creditsReserved: z.number().positive(),
  creditsUsed: z.number().nonnegative().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      stage: z.string(),
      retryable: z.boolean(),
    })
    .optional(),
  metadata: z
    .object({
      idempotencyKey: z.string().uuid(),
      generationTimeMs: z.number().optional(),
      aiCostEstimateINR: z.number().optional(),
    })
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});

export const campaignAssetSchema: z.ZodType<CampaignAsset> = z.object({
  assetId: z.string().min(1),
  campaignId: z.string().min(1),
  businessId: z.string().min(1),
  type: z.enum(['poster', 'headline', 'ad_copy', 'caption', 'story', 'reel', 'whatsapp', 'cta']),
  index: z.number().int().nonnegative(),
  content: z.record(z.unknown()),
  imageUrl: z.string().url().optional(),
  storagePath: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  status: z.enum(['generating', 'completed', 'failed']),
  promptUsed: z.string().optional(),
  modelUsed: z.string().optional(),
  generationLatencyMs: z.number().optional(),
  validationResult: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
});

export const subscriptionSchema: z.ZodType<Subscription> = z.object({
  subscriptionId: z.string().min(1),
  userId: z.string().min(1),
  planId: z.enum(['free', 'starter', 'business', 'agency']),
  status: z.enum(['active', 'canceled', 'past_due', 'trialing', 'incomplete']),
  razorpaySubscriptionId: z.string().optional(),
  razorpayCustomerId: z.string().optional(),
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
  creditsIncluded: z.number().nonnegative(),
  creditsUsed: z.number().nonnegative(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.string().datetime().optional(),
  trialEnd: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const usageSchema = z.object({
  usageId: z.string().min(1),
  userId: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  planId: z.enum(['free', 'starter', 'business', 'agency']),
  creditsIncluded: z.number().int().nonnegative(),
  campaignsCreated: z.number().int().nonnegative(),
  creditsUsed: z.number().int().nonnegative(),
  imagesGenerated: z.number().int().nonnegative(),
  copyGenerations: z.number().int().nonnegative(),
  regenerations: z.number().int().nonnegative(),
  failedGenerations: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export const transactionSchema = z.object({
  transactionId: z.string().min(1),
  userId: z.string().min(1),
  businessId: z.string().optional(),
  campaignId: z.string().optional(),
  type: z.enum([
    'subscription',
    'credit_purchase',
    'reservation',
    'deduction',
    'refund',
    'grant',
    'setup_fee',
  ]),
  amount: z.number(),
  currency: z.literal('INR').default('INR'),
  balanceAfter: z.number(),
  description: z.string().min(1),
  razorpayPaymentId: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpaySubscriptionId: z.string().optional(),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
}) as z.ZodType<Transaction>;

export const analyticsEventSchema: z.ZodType<AnalyticsEvent> = z.object({
  eventId: z.string().min(1),
  userId: z.string().min(1),
  businessId: z.string().optional(),
  campaignId: z.string().optional(),
  creativeId: z.string().optional(),
  eventType: z.enum([
    'campaign_created',
    'campaign_generated',
    'campaign_failed',
    'asset_downloaded',
    'asset_regenerated',
    'asset_deleted',
    'whatsapp_link_clicked',
    'whatsapp_message_copied',
    'subscription_upgraded',
    'subscription_downgraded',
    'subscription_canceled',
    'credit_purchased',
    'credit_consumed',
    'credit_refunded',
    'brand_kit_updated',
    'product_added',
    'product_archived',
    'login',
    'signup',
    'onboarding_completed',
  ]),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

export const generationLogSchema: z.ZodType<GenerationLog> = z.object({
  logId: z.string().min(1),
  campaignId: z.string().min(1),
  stage: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  inputHash: z.string().min(1),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  latencyMs: z.number().int().positive(),
  costEstimateUSD: z.number().optional(),
  costEstimateINR: z.number().optional(),
  status: z.enum(['success', 'failed', 'retry']),
  error: z.record(z.unknown()).optional(),
  retryCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export function validateUser(data: unknown): User {
  return userSchema.parse(data);
}

export function validateBusiness(data: unknown): Business {
  return businessSchema.parse(data);
}

export function validateBrandKit(data: unknown): BrandKit {
  return brandKitSchema.parse(data);
}

export function validateProduct(data: unknown): Product {
  return productSchema.parse(data);
}

export function validateCampaign(data: unknown): Campaign {
  return campaignSchema.parse(data);
}

export function validateCampaignAsset(data: unknown): CampaignAsset {
  return campaignAssetSchema.parse(data);
}

export function validateSubscription(data: unknown): Subscription {
  return subscriptionSchema.parse(data);
}

export function validateUsage(data: unknown): Usage {
  return usageSchema.parse(data);
}

export function validateTransaction(data: unknown): Transaction {
  return transactionSchema.parse(data);
}

export function validateAnalyticsEvent(data: unknown): AnalyticsEvent {
  return analyticsEventSchema.parse(data);
}

export function validateGenerationLog(data: unknown): GenerationLog {
  return generationLogSchema.parse(data);
}

export const createUserInputSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
  role: z.enum(['user', 'agency_admin', 'agency_member']).default('user'),
  businessIds: z.array(z.string()).default([]),
  agencyId: z.string().optional(),
  subscriptionId: z.string().optional(),
  settings: z.object({
    notifications: z.boolean().default(true),
    language: z.enum(['en', 'te', 'hi']).default('en'),
    timezone: z.string().default('Asia/Kolkata'),
  }),
});

export const createBusinessInputSchema = z.object({
  businessId: z.string().min(1),
  userId: z.string().min(1),
  agencyId: z.string().optional(),
  name: z.string().min(1).max(100),
  category: z.enum(['restaurant', 'salon', 'real_estate']),
  description: z.string().max(500).optional(),
  location: businessLocationSchema,
  contact: businessContactSchema,
  businessBrain: z.any(),
  settings: businessSettingsSchema,
  status: z.enum(['active', 'archived']).default('active'),
});

export const createBrandKitInputSchema = z.object({
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

export const createProductInputSchema = z.object({
  productId: z.string().min(1),
  businessId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  originalPrice: z.number().positive().optional(),
  currency: z.literal('INR').default('INR'),
  category: z.enum(['starter', 'main', 'dessert', 'beverage', 'combo', 'service', 'package']),
  tags: z
    .array(z.enum(['signature', 'bestseller', 'new', 'seasonal', 'vegetarian', 'spicy']))
    .default([]),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        price: z.number().positive(),
        attributes: z.record(z.unknown()).optional(),
      })
    )
    .default([]),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        storagePath: z.string(),
        isPrimary: z.boolean(),
      })
    )
    .min(1),
  attributes: z
    .object({
      veg: z.boolean().optional(),
      spiceLevel: z.enum(['mild', 'medium', 'hot', 'extra_hot']).optional(),
      prepTimeMinutes: z.number().positive().optional(),
      availableHours: z.record(z.boolean()).optional(),
      deliveryOnly: z.boolean().optional(),
      dineInOnly: z.boolean().optional(),
    })
    .optional()
    .default({}),
  status: z.enum(['active', 'archived']).default('active'),
  sortOrder: z.number().optional(),
});

export const createCampaignInputSchema = z.object({
  campaignId: z.string().min(1),
  businessId: z.string().min(1),
  userId: z.string().min(1),
  objective: z.enum(['weekend_offer', 'new_dish', 'festival', 'discount', 'brand_awareness']),
  productId: z.string().optional(),
  newProduct: z
    .object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      price: z.number().positive(),
      images: z.array(z.string().url()).min(1).max(5),
    })
    .optional(),
  offer: z.object({
    headline: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    price: z.number().positive(),
    originalPrice: z.number().positive().optional(),
    type: z.enum(['percentage', 'fixed', 'bogo', 'combo', 'free_delivery', 'loyalty']),
    validityStart: z.string().datetime(),
    validityEnd: z.string().datetime(),
    terms: z.string().max(1000).optional(),
  }),
  duration: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  audience: z.object({
    localities: z.array(z.string()).min(1).max(10),
    ageRange: z
      .object({
        min: z.number().min(18),
        max: z.number().max(80),
      })
      .optional(),
    occasion: z.enum(['weekend', 'festival', 'weekday_lunch', 'family']).optional(),
  }),
  cta: z.enum(['order_whatsapp', 'book_table', 'view_menu', 'call_now', 'get_directions']),
  localization: localizationProfileSchema,
  status: z.enum([
    'draft',
    'validating',
    'queued',
    'analyzing',
    'strategizing',
    'generating_copy',
    'generating_creatives',
    'validating_output',
    'completed',
    'failed',
  ]),
  creditsReserved: z.number().positive(),
  creditsUsed: z.number().nonnegative().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      stage: z.string(),
      retryable: z.boolean(),
    })
    .optional(),
  metadata: z
    .object({
      idempotencyKey: z.string().uuid(),
      generationTimeMs: z.number().optional(),
      aiCostEstimateINR: z.number().optional(),
    })
    .optional(),
});

export const createCampaignAssetInputSchema = z.object({
  assetId: z.string().min(1),
  campaignId: z.string().min(1),
  businessId: z.string().min(1),
  type: z.enum(['poster', 'headline', 'ad_copy', 'caption', 'story', 'reel', 'whatsapp', 'cta']),
  index: z.number().int().nonnegative(),
  content: z.record(z.unknown()),
  imageUrl: z.string().url().optional(),
  storagePath: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  status: z.enum(['generating', 'completed', 'failed']),
  promptUsed: z.string().optional(),
  modelUsed: z.string().optional(),
  generationLatencyMs: z.number().optional(),
  validationResult: z.record(z.unknown()).optional(),
});

export const createSubscriptionInputSchema = z.object({
  subscriptionId: z.string().min(1),
  userId: z.string().min(1),
  planId: z.enum(['free', 'starter', 'business', 'agency']),
  status: z.enum(['active', 'canceled', 'past_due', 'trialing', 'incomplete']),
  razorpaySubscriptionId: z.string().optional(),
  razorpayCustomerId: z.string().optional(),
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
  creditsIncluded: z.number().nonnegative(),
  creditsUsed: z.number().nonnegative(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.string().datetime().optional(),
  trialEnd: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const createUsageInputSchema = z.object({
  usageId: z.string().min(1),
  userId: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  planId: z.enum(['free', 'starter', 'business', 'agency']),
  campaignsCreated: z.number().int().nonnegative(),
  creditsUsed: z.number().int().nonnegative(),
  imagesGenerated: z.number().int().nonnegative(),
  copyGenerations: z.number().int().nonnegative(),
  regenerations: z.number().int().nonnegative(),
  failedGenerations: z.number().int().nonnegative(),
});

export const createTransactionInputSchema = z.object({
  transactionId: z.string().min(1),
  userId: z.string().min(1),
  businessId: z.string().optional(),
  campaignId: z.string().optional(),
  type: z.enum([
    'subscription',
    'credit_purchase',
    'reservation',
    'deduction',
    'refund',
    'grant',
    'setup_fee',
  ]),
  amount: z.number(),
  currency: z.literal('INR').default('INR'),
  balanceAfter: z.number(),
  description: z.string().min(1),
  razorpayPaymentId: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpaySubscriptionId: z.string().optional(),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']),
  metadata: z.record(z.unknown()).optional(),
});

export const createAnalyticsEventInputSchema = z.object({
  eventId: z.string().min(1),
  userId: z.string().min(1),
  businessId: z.string().optional(),
  campaignId: z.string().optional(),
  creativeId: z.string().optional(),
  eventType: z.enum([
    'campaign_created',
    'campaign_generated',
    'campaign_failed',
    'asset_downloaded',
    'asset_regenerated',
    'asset_deleted',
    'whatsapp_link_clicked',
    'whatsapp_message_copied',
    'subscription_upgraded',
    'subscription_downgraded',
    'subscription_canceled',
    'credit_purchased',
    'credit_consumed',
    'credit_refunded',
    'brand_kit_updated',
    'product_added',
    'product_archived',
    'login',
    'signup',
    'onboarding_completed',
  ]),
  metadata: z.record(z.unknown()).optional(),
});

export const createGenerationLogInputSchema = z.object({
  logId: z.string().min(1),
  campaignId: z.string().min(1),
  stage: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  inputHash: z.string().min(1),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  latencyMs: z.number().int().positive(),
  costEstimateUSD: z.number().optional(),
  costEstimateINR: z.number().optional(),
  status: z.enum(['success', 'failed', 'retry']),
  error: z.record(z.unknown()).optional(),
  retryCount: z.number().int().nonnegative(),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type CreateBusinessInput = z.infer<typeof createBusinessInputSchema>;
export type CreateBrandKitInput = z.infer<typeof createBrandKitInputSchema>;
export type CreateProductInput = z.infer<typeof createProductInputSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignInputSchema>;
export type CreateCampaignAssetInput = z.infer<typeof createCampaignAssetInputSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionInputSchema>;
export type CreateUsageInput = z.infer<typeof createUsageInputSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;
export type CreateAnalyticsEventInput = z.infer<typeof createAnalyticsEventInputSchema>;
export type CreateGenerationLogInput = z.infer<typeof createGenerationLogInputSchema>;
