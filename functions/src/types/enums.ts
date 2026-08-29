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
  | 'generated'
  | 'verified'
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
