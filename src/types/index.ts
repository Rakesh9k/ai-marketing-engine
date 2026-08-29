export type UserRole = 'user' | 'agency_admin' | 'agency_member';

export type BusinessCategory = 'restaurant' | 'salon' | 'real_estate';

export type BusinessStatus = 'active' | 'archived';

export type CampaignObjective =
  'weekend_offer' | 'new_dish' | 'festival' | 'discount' | 'brand_awareness';

export type OfferType = 'percentage' | 'fixed' | 'bogo' | 'combo' | 'free_delivery' | 'loyalty';

export type CTAType = 'order_whatsapp' | 'book_table' | 'view_menu' | 'call_now' | 'get_directions';

export type LanguageCode = 'en' | 'te' | 'hi' | 'te_en' | 'hi_en';

export type RegionalStyle =
  'neutral' | 'hyderabadi' | 'telangana' | 'mumbai' | 'bangalore' | 'delhi' | 'chennai' | 'kolkata';

export type BrandTone =
  'professional' | 'friendly' | 'premium' | 'traditional' | 'modern' | 'luxury' | 'casual' | 'bold';

export type CampaignStyle =
  | 'funny'
  | 'quirky'
  | 'sarcastic'
  | 'dark_comedy'
  | 'emotional'
  | 'urgent'
  | 'fomo'
  | 'storytelling'
  | 'educational'
  | 'youthful';

export type SlangIntensity = 'none' | 'light' | 'moderate' | 'heavy';

export type LanguageMixing = 'minimal' | 'natural' | 'heavy';

export type CampaignStatus =
  | 'draft'
  | 'validating'
  | 'queued'
  | 'analyzing'
  | 'strategizing'
  | 'generating_copy'
  | 'generating_creatives'
  | 'validating_output'
  | 'completed'
  | 'failed';

export type AssetType =
  'poster' | 'headline' | 'ad_copy' | 'caption' | 'story' | 'reel' | 'whatsapp' | 'cta';

export type AssetStatus = 'generating' | 'completed' | 'failed';

export type SubscriptionPlan = 'free' | 'starter' | 'business' | 'agency';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';

export type TransactionType =
  | 'subscription'
  | 'credit_purchase'
  | 'reservation'
  | 'deduction'
  | 'refund'
  | 'grant'
  | 'setup_fee';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface LocalizationProfile {
  country: string;
  state: string;
  city: string;
  locality: string;
  primaryLanguage: LanguageCode;
  secondaryLanguage: LanguageCode;
  languageMixing: LanguageMixing;
  regionalStyle: RegionalStyle;
  slangPreference: SlangIntensity;
  audienceDescription: string;
  brandTone: BrandTone;
  campaignStyle: CampaignStyle;
  contentFormat: 'poster' | 'story' | 'reel' | 'caption' | 'whatsapp';
}

export interface BusinessLocation {
  city: string;
  state: string;
  locality?: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface BusinessContact {
  phone: string;
  whatsapp: string;
  website?: string;
  instagram?: string;
}

export interface BusinessSettings {
  timezone: string;
  currency: 'INR';
  openingHours?: Record<string, { open: string; close: string; closed?: boolean }>;
  deliveryRadiusKm?: number;
  minimumOrder?: number;
  bookingRequired?: boolean;
}

export interface BusinessBrain {
  identity: {
    name: string;
    category: BusinessCategory;
    description: string;
    location: BusinessLocation;
    contact: BusinessContact;
  };
  products: Array<{
    productId: string;
    name: string;
    description: string;
    price: number;
    category: string;
    tags: string[];
    attributes: {
      veg?: boolean;
      spiceLevel?: string;
      prepTimeMinutes?: number;
    };
  }>;
  brand: {
    tone: BrandTone;
    personality: string;
    visualPreferences: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    fonts: {
      heading: string;
      body: string;
    };
  };
  audience: {
    targetCustomer: string;
    ageRange: { min: number; max: number };
    localities: string[];
    preferences: string;
  };
  localization: {
    primaryLanguage: LanguageCode;
    secondaryLanguage: LanguageCode;
    regionalStyle: RegionalStyle;
    slangIntensity: SlangIntensity;
    languageMixing: LanguageMixing;
  };
  businessRules: {
    openingHours: Record<string, { open: string; close: string; closed?: boolean }>;
    deliveryRadiusKm: number;
    minimumOrder: number;
    offerValidityRules: string;
    pricingRules: string;
  };
  campaignHistory: Array<{
    campaignId: string;
    date: string;
    objective: CampaignObjective;
    productName: string;
    offerSummary: string;
    language: LanguageCode;
    regionalStyle: RegionalStyle;
    campaignStyle: CampaignStyle;
    performance: {
      whatsappClicks: number;
      inquiries: number;
    };
  }>;
  lastSyncedAt: string;
}

export interface BrandKit {
  businessId: string;
  logo?: {
    primary?: { url: string; storagePath: string; width: number; height: number };
    secondary?: { url: string; storagePath: string; width: number; height: number };
  };
  colors: {
    primary: string;
    secondary?: string;
    accent?: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  tone: BrandTone;
  personality?: string;
  visualPreferences?: string;
  targetAudience?: string;
  updatedAt: string;
}

export interface Product {
  productId: string;
  businessId: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  currency: 'INR';
  category: string;
  tags: string[];
  variants: Array<{
    name: string;
    price: number;
    attributes?: Record<string, unknown>;
  }>;
  images: Array<{
    url: string;
    storagePath: string;
    isPrimary: boolean;
  }>;
  attributes: {
    veg?: boolean;
    spiceLevel?: 'mild' | 'medium' | 'hot' | 'extra_hot';
    prepTimeMinutes?: number;
    availableHours?: Record<string, boolean>;
    deliveryOnly?: boolean;
    dineInOnly?: boolean;
  };
  status: 'active' | 'archived';
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  campaignId: string;
  businessId: string;
  userId: string;
  objective: CampaignObjective;
  productId?: string;
  newProduct?: {
    name: string;
    description?: string;
    price: number;
    images: string[];
  };
  offer: {
    headline: string;
    description?: string;
    price: number;
    originalPrice?: number;
    type: OfferType;
    validityStart: string;
    validityEnd: string;
    terms?: string;
  };
  duration: {
    start: string;
    end: string;
  };
  audience: {
    localities: string[];
    ageRange?: { min: number; max: number };
    occasion?: string;
  };
  cta: CTAType;
  localization: LocalizationProfile;
  status: CampaignStatus;
  creditsReserved: number;
  creditsUsed?: number;
  error?: {
    code: string;
    message: string;
    stage: string;
    retryable: boolean;
  };
  metadata?: {
    idempotencyKey: string;
    generationTimeMs?: number;
    aiCostEstimateINR?: number;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CampaignAsset {
  assetId: string;
  campaignId: string;
  businessId: string;
  type: AssetType;
  index: number;
  content: Record<string, unknown>;
  imageUrl?: string;
  storagePath?: string;
  thumbnailUrl?: string;
  status: AssetStatus;
  promptUsed?: string;
  modelUsed?: string;
  generationLatencyMs?: number;
  validationResult?: Record<string, unknown>;
  createdAt: string;
}

export interface Subscription {
  subscriptionId: string;
  userId: string;
  planId: SubscriptionPlan;
  status: SubscriptionStatus;
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  creditsIncluded: number;
  creditsUsed: number;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  trialEnd?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Usage {
  usageId: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  planId: SubscriptionPlan;
  campaignsCreated: number;
  creditsUsed: number;
  imagesGenerated: number;
  copyGenerations: number;
  regenerations: number;
  failedGenerations: number;
  updatedAt: string;
}

export interface Transaction {
  transactionId: string;
  userId: string;
  businessId?: string;
  campaignId?: string;
  type: TransactionType;
  amount: number;
  currency: 'INR';
  balanceAfter: number;
  description: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
  status: TransactionStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
