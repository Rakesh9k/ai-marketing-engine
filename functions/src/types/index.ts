export type UserRole = 'user' | 'agency_admin' | 'agency_member';

/**
 * The campaign-generation vertical a business is served by. `general` is a real, fully supported
 * vertical for every business that is not a restaurant, salon or real-estate agency (retail,
 * fitness, clinics, coaching, boutiques…): it has its own generic marketing context, objectives
 * and Truth Check rules. A business's actual line of work is kept separately in
 * `businessBrain.identity.industry` / `subcategory`, so a trade can later get a specialised
 * vertical without migrating the Business Brain.
 */
export type BusinessCategory = 'restaurant' | 'salon' | 'real_estate' | 'general';

export type BusinessStatus = 'active' | 'archived';

export type CampaignObjective =
  | 'weekend_offer'
  | 'new_dish'
  | 'festival'
  | 'discount'
  | 'brand_awareness'
  | 'service_promotion'
  | 'package_promotion'
  | 'appointment_promotion'
  | 'new_service'
  | 'property_promotion'
  | 'new_listing'
  | 'open_house'
  | 'project_promotion'
  | 'product_promotion'
  | 'new_product';

export type OfferType = 'percentage' | 'fixed' | 'bogo' | 'combo' | 'free_delivery' | 'loyalty';

export type CTAType =
  | 'order_whatsapp'
  | 'book_table'
  | 'view_menu'
  | 'call_now'
  | 'get_directions'
  | 'book_appointment';

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

export type TruthCheckStatus = 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';

export interface TruthCheckItem {
  category:
    'business' | 'product' | 'price' | 'offer' | 'location' | 'contact' | 'operations' | 'claim';
  status: TruthCheckStatus;
  generatedValue?: string;
  expectedValue?: string;
  reason?: string;
  /**
   * Why a check did not simply pass, so a missing required statement is never confused with a wrong
   * claim: 'missing_input' = the campaign lacks the fact needed to verify; 'required_mention_missing' =
   * the copy was asked to state something and did not; 'invalid_claim' = the copy states something
   * wrong; 'not_applicable' = nothing to verify for this campaign.
   */
  basis?: 'missing_input' | 'required_mention_missing' | 'invalid_claim' | 'not_applicable';
}

export interface TruthCheckResult {
  status: TruthCheckStatus;
  checkedAt: string;
  checks: TruthCheckItem[];
  summary: string;
  /**
   * Deterministic fingerprint of the authoritative source facts (business
   * phone/WhatsApp/location, product price) that were actually compared
   * against at verification time. Recomputing this from the CURRENT
   * Business/Product docs and comparing against the stored value is how
   * staleness is detected — if they differ, the source data has changed
   * since this result was produced and the PASS should no longer be
   * treated as current. See isVerificationStale() in truthCheck.ts.
   */
  sourceFingerprint?: string;
  /**
   * Phase 33 — a second, independent fingerprint covering
   * businessRules.deliveryRadiusKm/minimumOrder and verticalProfile
   * (services/packages/properties), which became editable after
   * generation in Phase 33. See computeVerticalFactsFingerprint's doc
   * comment in truthCheck.ts for why this is a separate field rather than
   * folded into sourceFingerprint. Absent on any campaign generated before
   * Phase 33 — isVerificationStale treats that as "not checked on this
   * dimension," not stale.
   */
  verticalFingerprint?: string;
}

export interface GenerationPipelineInput {
  businessId: string;
  campaignId?: string;
  templateId?: string;
  creativeObjective?: CreativeObjective;
  savedStyleId?: string;
  savedStyleVersion?: number;
  businessName: string;
  businessCategory: string;
  businessLocation: { city: string; state: string; locality?: string };
  whatsappNumber: string;
  businessPhone?: string;
  businessWebsite?: string;
  businessInstagram?: string;
  businessBrain: BusinessBrain;
  brandProfile: BrandCreativeContext;
  creativePreferences?: import('../services/ai/creativeContextSelector').CreativePreferenceContext;
  objective: string;
  productId?: string;
  productName: string;
  offerHeadline: string;
  offerDescription?: string;
  offerPrice: number;
  offerOriginalPrice?: number;
  offerType: string;
  offerValidityStart?: string;
  offerValidityEnd?: string;
  offerTerms?: string;
  duration: { start: string; end: string };
  audience: { localities: string[]; ageRange?: { min: number; max: number }; occasion?: string };
  cta: string;
  localizationProfile: LocalizationProfile;
  campaignStyle: string;
  savedStyleContext?: SavedStyleContext;
  newProduct?: {
    name: string;
    description?: string;
    price: number;
    images: string[];
    category: string;
  };
  vertical?: BusinessCategory;
  performanceRecommendations?: import('./recommendation').GenerationRecommendationContext;
}

export interface ExtractedPrice {
  amount: number;
  currency: string;
  rawText: string;
  isOriginalPrice?: boolean;
  isDiscount?: boolean;
}

export interface ExtractedFacts {
  businessNames: string[];
  productNames: string[];
  prices: ExtractedPrice[];
  discounts: string[];
  offers: string[];
  locations: string[];
  phoneNumbers: string[];
  whatsappNumbers: string[];
  dates: string[];
  operationalClaims: string[];
  marketingClaims: string[];
}

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
  | 'poster'
  | 'headline'
  | 'ad_copy'
  | 'caption'
  | 'story'
  | 'reel'
  | 'whatsapp'
  | 'cta'
  | 'product'
  | 'campaign'
  | 'brand-kit'
  | 'logo'
  // Raw video clip uploaded by a business owner as input to "Create a Reel"
  // (see ReelProject below) — distinct from 'reel', which is the existing
  // static-image/JSON storyboard asset type produced by the campaign
  // pipeline's runStage7(). A raw clip is never itself a finished creative.
  | 'reel_clip';

export type AssetStatus = 'generating' | 'completed' | 'failed' | 'superseded';

export type SubscriptionPlan = 'free' | 'starter' | 'business' | 'pro' | 'agency';

export type BillingCycle = 'monthly' | 'yearly';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';

export type TransactionType =
  | 'subscription'
  | 'credit_purchase'
  | 'reservation'
  | 'deduction'
  | 'refund'
  | 'grant'
  | 'setup_fee';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'expired';

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

export interface BusinessProfile {
  businessId: string;
  businessName: string;
  businessCategory: BusinessCategory;
  city: string;
  state: string;
  locality?: string;
  phone: string;
  whatsapp: string;
  operatingModes:
    | 'dine-in'
    | 'takeaway'
    | 'delivery'
    | 'dine-in & takeaway'
    | 'dine-in & delivery'
    | 'takeaway & delivery'
    | 'dine-in & takeaway & delivery';
}

export interface BrandProfile {
  businessId: string;
  brandName?: string;
  tagline?: string;
  brandTone: BrandTone;
  brandPersonality: string;
  visualPreferences: string;
  colors: {
    primary: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  logo?: {
    url: string;
    storagePath: string;
    width: number;
    height: number;
  };
}

export interface BusinessRules {
  factuality: {
    allowCreativeFraming: boolean;
    requireExplicitPricing: boolean;
    prohibitInventedProducts: boolean;
    prohibitInventedClaims: boolean;
  };
  availability: {
    displayUnavailableItems: boolean;
    // Only facts the owner gave; absent means unknown.
    minimumOrderRequired?: boolean;
    deliveryRadiusKm?: number;
  };
  communication: {
    contactInformationAllowed: boolean;
    operatingHoursRespectRequired: boolean;
    brandRestrictions: string[];
  };
}

export interface ProductVisualAttributes {
  dishName: string;
  platingStyle: string;
  colorPalette: string[];
  ambianceCues: string[];
  keyVisualElements: string[];
  suggestedCompositions: string[];
  garnish?: string[];
}

/**
 * Image Generation Types (Phase 14)
 */
export interface ImageGenerationRequest {
  readonly prompt: string;
  readonly negativePrompt?: string;
  readonly sourceImageUrl?: string;
  readonly aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9';
  readonly width?: number;
  readonly height?: number;
  readonly generationMode: 'product_ad' | 'social_post' | 'story' | 'campaign_creative';
  readonly brandContext?: {
    readonly colors?: readonly string[];
    readonly style?: string;
    readonly logoUrl?: string;
  };
  readonly metadata?: Record<string, unknown>;
}

export interface ImageGenerationResponse {
  readonly success: boolean;
  readonly imageUrl?: string;
  /** Inline image bytes (Gemini returns bytes, not a hosted URL). */
  readonly imageData?: { readonly base64: string; readonly mimeType: string };
  readonly provider?: string;
  readonly model?: string;
  readonly metadata?: Record<string, unknown>;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

export interface ImageValidationResult {
  readonly passed: boolean;
  readonly checks: {
    readonly generationSucceeded: boolean;
    readonly imageExists: boolean;
    readonly validUrl: boolean;
    readonly validMimeType: boolean;
    readonly acceptableDimensions: boolean;
    readonly reasonableFileSize: boolean;
    readonly providerOutputUsable: boolean;
    readonly productConsistent?: boolean;
    readonly noProhibitedContent?: boolean;
    readonly noUnexpectedBusinessIdentity?: boolean;
  };
  readonly warnings?: readonly string[];
  readonly errors?: readonly string[];
}

/**
 * How a Business Brain fact was established. Only owner-confirmed information ever reaches the
 * Brain, so every entry is one of these. A value the owner never typed is never recorded as
 * something they explicitly supplied: a phone number copied from their WhatsApp number is
 * DERIVED_FROM_WHATSAPP, and an operating mode that follows from the business type they chose is
 * DERIVED_FROM_SUBCATEGORY. An explicit value later replaces a derived one.
 */
export type BrainFactSource =
  | 'USER_CONFIRMED'
  | 'DERIVED_FROM_WHATSAPP'
  | 'DERIVED_FROM_SUBCATEGORY'
  /** A value Mitra filled in so the Brain is complete. The owner never said it; it is not a business fact. */
  | 'SYSTEM_DEFAULT';

export interface BrainKnowledge {
  origin: 'conversational_onboarding';
  confirmedAt: string;
  /** Keyed by field path, e.g. 'contact.phone', 'identity.industry'. */
  facts: Record<string, { source: BrainFactSource }>;
}

export interface BusinessBrain {
  identity: {
    name: string;
    category: BusinessCategory;
    description: string;
    location: BusinessLocation;
    contact: BusinessContact;
    /**
     * The owner's actual line of work (a taxonomy id such as 'fitness'), distinct from `category`,
     * which is only the campaign-generation vertical. Absent on businesses created before the
     * conversational onboarding.
     */
    industry?: string;
    /** A taxonomy id, or the owner's own words. */
    subcategory?: string;
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
    /** Who the owner most wants to reach, as they chose it (also joined into `targetCustomer`). */
    primary?: string[];
  };
  /** Who is behind the business. Only set by the conversational onboarding. */
  owner?: { name?: string; role?: string };
  /** What the business is known for, in the owner's words. Not a product catalogue. */
  offerings?: { signature: string[] };
  /** Why customers choose this business, stored as the owner said it (never rewritten). */
  positioning?: { usp?: string };
  /** Where each onboarding-supplied fact came from. Only owner-confirmed facts are ever stored. */
  knowledge?: BrainKnowledge;
  localization: {
    primaryLanguage: LanguageCode;
    secondaryLanguage: LanguageCode;
    regionalStyle: RegionalStyle;
    slangIntensity: SlangIntensity;
    languageMixing: LanguageMixing;
  };
  businessRules: {
    openingHours: Record<string, { open: string; close: string; closed?: boolean }>;
    // Absent means the owner never said. Unknown is not zero and not a default.
    deliveryRadiusKm?: number;
    minimumOrder?: number;
    offerValidityRules: string;
    pricingRules: string;
    operatingMode?: 'dine-in' | 'takeaway' | 'delivery';
  };
  verticalProfile?: {
    vertical?: BusinessCategory;
    // Salon-specific fields
    services?: Array<{
      id: string;
      name: string;
      category: 'hair' | 'skin' | 'nails' | 'makeup' | 'bridal' | 'spa' | 'grooming' | 'other';
      price: number;
      durationMinutes?: number;
      active: boolean;
    }>;
    packages?: Array<{
      id: string;
      name: string;
      description?: string;
      serviceIds: string[];
      packagePrice: number;
      originalPrice?: number;
      validityDays?: number;
      active: boolean;
    }>;
    // Optional: only present for a salon business that actually submitted
    // appointment settings — real_estate businesses never have this.
    appointmentSettings?: {
      acceptInquiries: boolean;
      preferredBookingChannel: 'whatsapp' | 'phone' | 'in_person';
      bookingInstructions?: string;
      businessHours?: {
        open: string;
        close: string;
        closed?: boolean;
      };
    };
    // Real-estate-specific fields (Phase 31). Each entry is one listing/
    // property/project this business can generate campaigns about.
    properties?: Array<{
      id: string;
      title: string;
      propertyType: 'apartment' | 'villa' | 'plot' | 'commercial' | 'other';
      projectName?: string;
      areaSqft?: number;
      bedrooms?: number;
      bathrooms?: number;
      price: number;
      possessionStatus: 'ready_to_move' | 'under_construction' | 'upcoming';
      amenities: string[];
      availability: 'available' | 'booked' | 'sold';
      active: boolean;
    }>;
  };
  campaignHistory: Array<{
    campaignId: string;
    date: string;
    objective: CampaignObjective;
    productName?: string;
    serviceName?: string;
    packageName?: string;
    offerSummary: string;
    language: LanguageCode;
    regionalStyle: RegionalStyle;
    campaignStyle: CampaignStyle;
    performance: {
      whatsappClicks: number;
      inquiries: number;
      appointmentRequests?: number;
      appointmentConfirmed?: number;
      appointmentCompleted?: number;
    };
  }>;
  lastSyncedAt: string;
}

/**
 * Phase 34 — the single, server-authoritative aggregate for a campaign's
 * real-world performance. `BusinessBrain.campaignHistory[].performance`
 * above is a pre-existing type-level placeholder that no Cloud Function has
 * ever written (confirmed by audit) — this is a deliberately separate
 * collection (`campaign_performance/{campaignId}`, already reserved in
 * firestore.rules), not a second writer for that dead field, so there is
 * exactly one source of truth for performance data.
 *
 * `whatsappClicks` is real: it's incremented only by a verified, idempotent
 * write in recordWhatsAppClick.ts, sourced from the same `whatsapp_clicked`
 * analytics event the Phase 32 dashboard already counts.
 *
 * `inquiries` has no integrated source anywhere in this codebase (no
 * webhook, no WhatsApp Business API reply tracking, no form). It is always
 * `null` — meaning "unknown/unavailable," never a fabricated 0 — until a
 * real source is integrated. Never derive it from clicks, downloads, or
 * campaign generation.
 */
export interface CampaignPerformance {
  campaignId: string;
  businessId: string;
  whatsappClicks: number;
  inquiries: number | null;
  postsPerformance?: import('./meta').PostPerformanceRecord[];
  updatedAt: string;
  lastEventAt?: string;
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

export interface PipelineTraceStep<T = unknown> {
  stepId: string;
  name: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  timestamp: string;
  data: T;
  summary?: string;
}

export interface UserRequestStageData {
  request: string;
  language: string;
  style: string;
  objective: string;
  targetProduct?: string;
  rawInput?: Record<string, unknown>;
}

export interface IntentExtractionStageData {
  extractedLanguage: string;
  extractedStyle: string;
  extractedProduct: string;
  extractedObjective: string;
  extractedOccasion?: string;
  confidence: number;
}

export interface BusinessBrainRetrievalStageData {
  business: string;
  location: string;
  product: string;
  price: string;
  brandTone: string;
  languagePreference: string;
  audience: string;
  businessRules?: Record<string, unknown>;
}

export interface ContextSelectedStageData {
  selectedContext: {
    businessIdentity: boolean;
    productInformation: boolean;
    currentOffer: boolean;
    location: boolean;
    language: boolean;
    tone: boolean;
    relevantPreviousCampaignPreferences: boolean;
    brandRules: boolean;
  };
  contextSummary: string;
}

export interface GeminiRequestStageData {
  systemInstruction: string;
  businessContext: string;
  userRequest: string;
  task: string;
  outputSchema: Record<string, unknown> | string;
}

export interface GeminiResponseStageData {
  headline?: string;
  caption?: string;
  language?: string;
  tone?: string;
  cta?: string;
  rawOutput?: Record<string, unknown>;
}

export interface ValidationCheckItem {
  name: string;
  status: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';
  expected?: string;
  actual?: string;
  details?: string;
}

export interface ValidationStageData {
  passed: boolean;
  checks: ValidationCheckItem[];
  summary: string;
}

export interface MitraTransformationsStageData {
  appliedTransformations: Array<{
    name: string;
    description: string;
  }>;
  textOverlay?: Record<string, unknown>;
}

export interface CreativeGenerationStageData {
  generatedPostersCount: number;
  storyFramesCount: number;
  reelStoryboardCount: number;
  assetsMetadata: Array<{
    type: string;
    url?: string;
    prompt?: string;
  }>;
}

export interface FinalCampaignStageData {
  campaignId: string;
  status: string;
  deliveredAssetsCount: number;
  customerSummary: string;
  headlinePreview?: string;
  captionPreview?: string;
  whatsappMessagePreview?: string;
}

export interface PipelineTrace {
  traceId: string;
  campaignId: string;
  businessId: string;
  createdAt: string;
  conflictResolution?: {
    conflictsDetected: Array<{
      id: string;
      category: string;
      description: string;
      appliedHierarchy: string;
      winningResolution: string;
      geminiDirective: string;
    }>;
    nonNegotiables: Record<string, string>;
    geminiConflictDirectives: string[];
  };
  userRequest: PipelineTraceStep<UserRequestStageData>;
  mitraUi: PipelineTraceStep<Record<string, unknown>>;
  intentExtraction: PipelineTraceStep<IntentExtractionStageData>;
  businessBrainRetrieval: PipelineTraceStep<BusinessBrainRetrievalStageData>;
  contextAssembly: PipelineTraceStep<ContextSelectedStageData>;
  promptBuilder: PipelineTraceStep<GeminiRequestStageData>;
  geminiResponse: PipelineTraceStep<GeminiResponseStageData>;
  validationTruthCheck: PipelineTraceStep<ValidationStageData>;
  mitraTransformations: PipelineTraceStep<MitraTransformationsStageData>;
  creativeGeneration: PipelineTraceStep<CreativeGenerationStageData>;
  finalCampaign: PipelineTraceStep<FinalCampaignStageData>;
}

export interface Campaign {
  campaignId: string;
  businessId: string;
  userId: string;
  sourceCalendarItemId?: string;
  objective: CampaignObjective;
  templateId?: string;
  creativeObjective?: CreativeObjective;
  savedStyleId?: string;
  savedStyleVersion?: number;
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
    /** The OFFER's own dates; absent when the owner gave none (campaign duration is not offer validity). */
    validityStart?: string;
    validityEnd?: string;
    validitySource?: 'owner_dates' | 'whole_campaign';
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
    truthCheckStatus?: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';
    truthCheckSummary?: string;
    truthCheckResult?: TruthCheckResult;
    savedStyleId?: string;
    savedStyleVersion?: number;
    pipelineTrace?: PipelineTrace;
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
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface Asset {
  assetId: string;
  userId: string;
  businessId: string;
  name: string;
  description?: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  assetType: AssetType;
  status: AssetStatus;
  previewUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  subscriptionId: string;
  userId: string;
  planId: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  creditsIncluded: number;
  creditsUsed: number;
  cancelAtPeriodEnd: boolean;
  provider?: string;
  /** Legacy Razorpay (kept for historical records and the deployed legacy functions). */
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
  payuMandateTxnId?: string;
  /** Paddle: billing interval of the subscribed price. */
  billingCycle?: 'monthly' | 'yearly';
  paddleCustomerId?: string;
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
  /**
   * Display total for the period: monthly plan credits + bonusCredits.
   * Enforcement (usageControl.ts) derives availability from planId + bonusCredits,
   * not from this field.
   */
  creditsIncluded?: number;
  /** Credits bought via top-up packs for this period (additive to the plan's monthly credits). */
  bonusCredits?: number;
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
  /** Legacy Razorpay (kept for historical records and the deployed legacy functions). */
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
  status: TransactionStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface User {
  userId: string;
  email: string;
  phone?: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  businessIds: string[];
  agencyId?: string;
  subscriptionId?: string;
  termsVersion?: string;
  privacyVersion?: string;
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
  settings: {
    notifications: boolean;
    language: 'en' | 'te' | 'hi';
    timezone: string;
  };
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  deletedAt?: string;
}

/**
 * Agency interface — organizational container for clients and businesses
 */
export interface Agency {
  agencyId: string;
  name: string;
  ownerUserId: string;
  vertical: BusinessCategory;
  members: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Client interface — a business entity managed within an agency workspace
 */
export interface Client {
  clientId: string;
  name: string;
  agencyId: string;
  businessIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  businessId: string;
  userId: string;
  agencyId?: string;
  name: string;
  category: BusinessCategory;
  description?: string;
  location: BusinessLocation;
  contact: BusinessContact;
  businessBrain: BusinessBrain;
  settings: BusinessSettings;
  status: BusinessStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface AnalyticsEvent {
  eventId: string;
  userId: string;
  businessId?: string;
  campaignId?: string;
  creativeId?: string;
  eventType: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Truth Check Types (Phase 16)
 */
export interface TruthCheckResult {
  status: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';
  checkedAt: string;
  checks: TruthCheckItem[];
  summary: string;
}

export interface TruthCheckItem {
  category:
    'business' | 'product' | 'price' | 'offer' | 'location' | 'contact' | 'operations' | 'claim';
  status: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';
  generatedValue?: string;
  expectedValue?: string;
  reason?: string;
}

/**
 * "Create a Reel" — turns 3-10 raw uploaded video clips into a finished
 * 15/30/45s vertical Instagram Reel. Distinct from the campaign pipeline's
 * runStage7() "reel" storyboard (a static-image/text JSON object, no video
 * encoding) — this is the first real video-rendering feature in the
 * codebase, following the same create/reserve-credits/AI-stage/status-poll
 * pattern as Campaign (see generateReel.ts / generateCampaignStrategy.ts).
 */
export type ReelGoal =
  | 'food_showcase'
  | 'behind_the_scenes'
  | 'offer_promotion'
  | 'new_product'
  | 'local_attraction'
  | 'surprise_me';

export type ReelStyle = 'fast_engaging' | 'premium' | 'local_fun' | 'minimal' | 'cinematic';

export type ReelDurationSeconds = 15 | 30 | 45;

export type ReelStatus =
  'draft' | 'uploading' | 'analyzing' | 'planning' | 'rendering' | 'completed' | 'failed';

export type ReelSceneType =
  'food' | 'preparation' | 'cooking' | 'chef' | 'interior' | 'customer' | 'product' | 'unknown';

export type ReelTransition = 'hard_cut' | 'fade' | 'dissolve' | 'zoom_punch';

export type ReelTemplateId = 'food_reveal' | 'offer' | 'behind_the_scenes';

/**
 * Deterministic + Vision-AI-derived metadata for one uploaded clip. Built by
 * combining ffprobe/frame-extraction facts from the renderer service (see
 * VideoRenderer.analyzeClip in services/videoRenderer.ts) with a Vision AI
 * scene classification of the extracted thumbnail — never a full per-frame
 * AI pass over the whole clip (cost control, see PRICING).
 */
export interface ReelClipAnalysis {
  clipId: string;
  storagePath: string;
  durationMs: number;
  qualityScore: number; // 0-1, deterministic (brightness/stability/blur heuristics)
  relevanceScore: number; // 0-1, from Vision AI scene classification
  sceneType: ReelSceneType;
  suggestedStartMs: number;
  suggestedEndMs: number;
  description: string;
  isLikelyDuplicateOfClipId?: string;
}

export interface ReelEditPlanSegment {
  clipId: string;
  startMs: number;
  endMs: number;
  text?: string;
  transitionIn: ReelTransition;
}

/**
 * The AI's structured output for Stage B (see AI prompt design). Never
 * trusted directly — always parsed via ReelEditPlanSchema (zod) and passed
 * through validateReelEditPlan before being handed to the renderer. See
 * services/ai/reelPipeline.ts.
 */
export interface ReelEditPlan {
  templateId: ReelTemplateId;
  hook: { text: string; durationMs: number };
  segments: ReelEditPlanSegment[];
  offer?: { text: string; durationMs: number };
  ending: { text: string; durationMs: number; cta?: string; whatsapp?: string; location?: string };
  musicTrackId: string;
  totalDurationMs: number;
}

export interface ReelMusicTrack {
  id: string;
  name: string;
  category: 'energetic' | 'premium' | 'local' | 'food' | 'cinematic' | 'fun' | 'minimal' | 'offer';
  mood: string;
  durationSeconds: number;
  /** Beats per minute, when known — informational only, not used for beat-synced editing (out of scope for this MVP). */
  bpm?: number;
  /** Rights basis for this track — must justify commercial use in customer-generated Reels posted publicly. */
  license: string;
  /** Where the track came from — provenance for the license claim above. */
  source: string;
  /** Whether the license requires on-screen/description attribution when a business posts a Reel using this track. */
  attributionRequired: boolean;
  /** Exact attribution text to surface to the business if attributionRequired is true. */
  attributionText?: string;
  /** Linear gain multiplier (0-1) the renderer applies when mixing this track under the video's own audio — tracks with busier/louder masters should recommend a lower value. */
  recommendedVolume: number;
  storagePath: string;
}

export interface ReelProject {
  reelId: string;
  businessId: string;
  userId: string;
  status: ReelStatus;
  goal: ReelGoal;
  templateId?: string;
  creativeObjective?: CreativeObjective;
  savedStyleId?: string;
  savedStyleVersion?: number;
  productId?: string;
  offerId?: string;
  style: ReelStyle;
  durationSeconds: ReelDurationSeconds;
  /** Asset IDs (assetType: 'reel_clip') of the uploaded raw clips, 3-10. */
  inputClipIds: string[];
  offer?: string;
  cta?: string;
  additionalMessage?: string;
  clipAnalyses?: ReelClipAnalysis[];
  editPlan?: ReelEditPlan;
  outputUrl?: string;
  /** Same file with Content-Disposition: attachment, for the Download button. */
  downloadUrl?: string;
  outputStoragePath?: string;
  thumbnailUrl?: string;
  thumbnailStoragePath?: string;
  creditsReserved?: number;
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
    clipsUsed?: number;
    clipsUploaded?: number;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface GenerationLog {
  logId: string;
  campaignId: string;
  stage: string;
  provider: string;
  model: string;
  inputHash: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  costEstimateUSD?: number;
  costEstimateINR?: number;
  status: 'success' | 'failed' | 'retry';
  error?: Record<string, unknown>;
  retryCount: number;
  createdAt: string;
}
export interface BrandCreativeContext {
  logo?: {
    primaryUrl?: string;
    secondaryUrl?: string;
    // Durable Storage path for the primary logo, used to fetch real logo
    // bytes server-side for deterministic compositing (compositor.ts) —
    // the AI image model can't use logoUrl as a visual reference, so the
    // actual pixels have to reach the final creative some other way.
    primaryStoragePath?: string;
    primaryWidth?: number;
    primaryHeight?: number;
  };
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
  };
  tone?: string;
  visualPreferences?: string;
}

export type SavedStyleTone =
  'playful' | 'serious' | 'professional' | 'warm' | 'bold' | 'premium' | 'energetic';
export type SavedStyleVisualDensity = 'minimal' | 'low' | 'medium' | 'high';
export type SavedStyleProductProminence = 'subtle' | 'balanced' | 'high' | 'dominant';
export type SavedStyleTextDensity = 'minimal' | 'concise' | 'moderate' | 'detailed';
export type SavedStyleColorMode = 'brand' | 'neutral' | 'monochrome' | 'vibrant';
export type SavedStyleHumor = 'none' | 'light' | 'moderate' | 'high';
export type SavedStyleCtaStyle = 'soft' | 'direct' | 'urgent' | 'conversational';
export type SavedStyleLanguage =
  'business-default' | 'english' | 'hinglish' | 'telugu-english' | 'regional';
export type CreativeFeedbackReason =
  | 'more_premium'
  | 'more_local'
  | 'less_text'
  | 'more_humorous'
  | 'more_product_focused'
  | 'different';

export interface CreativeFeedback {
  feedbackId: string;
  creativeId: string; // The ID of the generated asset or reel
  campaignId?: string;
  userId: string;
  businessId: string;
  templateId?: string;
  templateVersion?: number;
  styleId?: string;
  styleVersion?: number;
  creativeType: 'post' | 'reel';
  sentiment: 'positive' | 'negative';
  reasons?: CreativeFeedbackReason[];
  customReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreativePreferenceSource = 'explicit_user' | 'approval' | 'rejection';
export type CreativePreferenceState = 'preferred' | 'avoided' | 'none';

export interface CreativePreference {
  preferenceId: string;
  businessId: string;
  templateId: string;
  preference: CreativePreferenceState;
  confidence: number;
  evidenceCount: number;
  positiveEvidenceCount: number;
  negativeEvidenceCount: number;
  source: CreativePreferenceSource;
  createdAt: string;
  updatedAt: string;
}

export type SavedStyleComposition =
  | 'centered'
  | 'hero-focused'
  | 'split-layout'
  | 'editorial'
  | 'grid'
  | 'asymmetric'
  | 'negative-space-heavy'
  | 'left-aligned'
  | 'right-aligned';
export type SavedStyleVisualHierarchyItem =
  'product' | 'headline' | 'cta' | 'brand' | 'supporting-copy';
export type SavedStyleCtaPlacement =
  'bottom' | 'top' | 'end-card' | 'integrated' | 'product-adjacent';
export type SavedStyleHookStructure =
  | 'question'
  | 'bold-statement'
  | 'visual-surprise'
  | 'product-first'
  | 'problem-first'
  | 'offer-first'
  | 'curiosity';
export type SavedStyleShotPacing = 'slow' | 'moderate' | 'fast' | 'dynamic' | 'cinematic';

export interface SavedStyle {
  styleId: string;
  businessId: string;
  userId: string;
  name: string;
  description?: string;
  tone: SavedStyleTone;
  visualDensity: SavedStyleVisualDensity;
  productProminence: SavedStyleProductProminence;
  textDensity: SavedStyleTextDensity;
  colorMode: SavedStyleColorMode;
  humor: SavedStyleHumor;
  ctaStyle: SavedStyleCtaStyle;
  language?: SavedStyleLanguage;
  composition?: SavedStyleComposition;
  visualHierarchy?: SavedStyleVisualHierarchyItem[];
  ctaPlacement?: SavedStyleCtaPlacement;
  hookStructure?: SavedStyleHookStructure;
  shotPacing?: SavedStyleShotPacing;
  source?: 'reference_analysis' | 'manual';
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavedStyleContext {
  styleId: string;
  styleVersion: number;
  tone: SavedStyleTone;
  visualDensity: SavedStyleVisualDensity;
  productProminence: SavedStyleProductProminence;
  textDensity: SavedStyleTextDensity;
  colorMode: SavedStyleColorMode;
  humor: SavedStyleHumor;
  ctaStyle: SavedStyleCtaStyle;
  language?: SavedStyleLanguage;
  composition?: SavedStyleComposition;
  visualHierarchy?: SavedStyleVisualHierarchyItem[];
  ctaPlacement?: SavedStyleCtaPlacement;
  hookStructure?: SavedStyleHookStructure;
  shotPacing?: SavedStyleShotPacing;
  source?: 'reference_analysis' | 'manual';
}

export type CreativeTemplateType = 'post' | 'reel';

export type CreativeObjective =
  'awareness' | 'engagement' | 'conversion' | 'launch' | 'promotion' | 'retention';

export type CreativeGrammarRole =
  | 'hook'
  | 'context'
  | 'setup'
  | 'problem'
  | 'product'
  | 'benefit'
  | 'proof'
  | 'differentiator'
  | 'offer'
  | 'payoff'
  | 'urgency'
  | 'social-proof'
  | 'objection'
  | 'emotion'
  | 'cta'
  | 'closing';

export interface CreativeGrammarStep {
  id: string;
  role: CreativeGrammarRole;
  purpose: string;
  required: boolean;
}

export type CreativeTemplateSource = 'system' | 'user';

export interface PostStructure {
  type: 'post';
  grammar: CreativeGrammarStep[];
}

export interface ReelStructure {
  type: 'reel';
  grammar: CreativeGrammarStep[];
}

export type CreativeStructure = PostStructure | ReelStructure;

export type VisualEmphasis = 'product-led' | 'text-led' | 'image-led' | 'offer-led';

export type VisualComposition =
  'hero-product' | 'split-composition' | 'editorial' | 'minimal' | 'high-contrast';

export interface VisualGrammar {
  emphasis: VisualEmphasis;
  composition: VisualComposition;
}

export type AdaptationCondition =
  | { check: 'offerAvailable' }
  | { check: 'proofAvailable' }
  | { check: 'productImageAvailable' }
  | { check: 'vertical'; equals: string }
  | { check: 'ctaType'; equals: string };

export type AdaptationAction =
  | { action: 'include'; role: CreativeGrammarRole }
  | { action: 'exclude'; role: CreativeGrammarRole }
  | { action: 'emphasize'; role: CreativeGrammarRole }
  | { action: 'deemphasize'; role: CreativeGrammarRole }
  | { action: 'prioritize'; role: CreativeGrammarRole }
  | { action: 'fallback'; role: CreativeGrammarRole; to: CreativeGrammarRole };

export interface AdaptationRule {
  id: string;
  condition: AdaptationCondition;
  action: AdaptationAction;
}

export interface PostTemplateConstraints {
  type: 'post';
  minSections: number;
  maxSections: number;
  maxTextDensity?: 'low' | 'medium' | 'high';
}

export interface ReelTemplateConstraints {
  type: 'reel';
  minSections: number;
  maxSections: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
}

export type TemplateConstraints = PostTemplateConstraints | ReelTemplateConstraints;

export interface CreativeTemplate {
  id: string;
  name: string;
  description: string;
  type: CreativeTemplateType;
  objectives: CreativeObjective[];
  compatibleVerticals: BusinessCategory[];
  structure: CreativeStructure;
  visualGrammar: VisualGrammar;
  adaptationRules: AdaptationRule[];
  constraints: TemplateConstraints;
  version: number;
  active: boolean;
  source: CreativeTemplateSource;
}

export * from './publishing';
export * from './scheduling';
export * from './calendar';
export * from './recommendation';
export * from './beta';
