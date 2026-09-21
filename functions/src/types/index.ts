export type UserRole = 'user' | 'agency_admin' | 'agency_member';

export type BusinessCategory = 'restaurant' | 'salon' | 'real_estate';

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
  | 'project_promotion';

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
  businessName: string;
  businessCategory: string;
  businessLocation: { city: string; state: string; locality?: string };
  whatsappNumber: string;
  businessPhone?: string;
  businessWebsite?: string;
  businessInstagram?: string;
  businessBrain: any;
  brandProfile: any;
  objective: string;
  productId?: string;
  productName: string;
  offerHeadline: string;
  offerDescription?: string;
  offerPrice: number;
  offerOriginalPrice?: number;
  offerType: string;
  offerValidityStart: string;
  offerValidityEnd: string;
  offerTerms?: string;
  duration: { start: string; end: string };
  audience: { localities: string[]; ageRange?: { min: number; max: number }; occasion?: string };
  cta: string;
  localizationProfile: any;
  campaignStyle: string;
  newProduct?: {
    name: string;
    description?: string;
    price: number;
    images: string[];
    category: string;
  };
  vertical?: 'restaurant' | 'salon' | 'real_estate';
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
    minimumOrderRequired: boolean;
    deliveryRadiusKm: number;
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
    operatingMode?: 'dine-in' | 'takeaway' | 'delivery';
  };
  verticalProfile?: {
    vertical?: 'restaurant' | 'salon' | 'real_estate';
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
    truthCheckStatus?: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';
    truthCheckSummary?: string;
    truthCheckResult?: TruthCheckResult;
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
  vertical: 'restaurant' | 'salon' | 'real_estate';
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
