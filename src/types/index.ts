export type UserRole = 'user' | 'agency_admin' | 'agency_member';

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

export type MetaPerformanceStatus = 'pending' | 'available' | 'partial' | 'unavailable' | 'error';

export type MetaPerformanceErrorCode =
  | 'AUTH_REQUIRED'
  | 'CONNECTION_REVOKED'
  | 'PERMISSION_DENIED'
  | 'POST_NOT_FOUND'
  | 'METRIC_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'META_API_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface MetaMetrics {
  likes?: number | null;
  comments?: number | null;
  reach?: number | null;
  impressions?: number | null;
  shares?: number | null;
  videoViews?: number | null;
  clicks?: number | null;
}

export type HookType =
  | 'price'
  | 'problem_solution'
  | 'question'
  | 'curiosity'
  | 'urgency'
  | 'local_identity'
  | 'product_first'
  | 'offer_first'
  | 'story'
  | 'social_proof'
  | 'unknown';

export interface PerformanceAttributes {
  hookType?: HookType;
  contentType?: 'post' | 'reel' | 'story';
  language?: LanguageCode;
  tone?: string;
  offerType?: string;
  creativeFormat?: string;
  postingHour?: number;
  dayOfWeek?: number;
  platform?: 'facebook' | 'instagram';
}

export interface PerformanceObservationMetrics {
  reach?: number | null;
  impressions?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  videoViews?: number | null;
  clicks?: number | null;
}

export interface PerformanceObservationFeedback {
  liked?: boolean;
  disliked?: boolean;
  regenerated?: boolean;
}

export interface PerformanceObservation {
  observationId: string;
  campaignId: string;
  businessId: string;
  userId: string;
  publishJobId?: string;
  platform: 'facebook' | 'instagram';
  externalPostId?: string;

  attributes: PerformanceAttributes;
  metrics: PerformanceObservationMetrics;
  feedback?: PerformanceObservationFeedback;

  observedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type RecommendationEvidenceLevel = 'insufficient_data' | 'low' | 'moderate' | 'high';

export interface PerformanceRecommendationItem {
  recommendedContentType?: 'post' | 'reel' | 'story';
  recommendedLanguage?: LanguageCode;
  recommendedTone?: string;
  recommendedHookType?: HookType;
  recommendedOfferType?: string;
  recommendedPostingWindow?: {
    startHour: number;
    endHour: number;
  };
  reason: string;
  confidence: RecommendationEvidenceLevel;
  evidenceCount: number;
}

export interface PerformanceRecommendationResult {
  businessId: string;
  hasEnoughEvidence: boolean;
  evidenceLevel: RecommendationEvidenceLevel;
  sampleSize: number;
  recommendations: PerformanceRecommendationItem[];
  summaryMessage: string;
  generatedAt: string;
  dataVersion: number;
}

export interface PostPerformanceRecord {
  performanceId: string;
  campaignId: string;
  businessId: string;
  userId: string;
  publishJobId?: string | null;
  scheduledPostId?: string | null;
  calendarItemId?: string | null;
  platform: 'instagram' | 'facebook';
  contentType: 'post' | 'reel';
  externalPostId: string;
  status: MetaPerformanceStatus;
  metrics: MetaMetrics;
  errorCode?: MetaPerformanceErrorCode | null;
  errorMessage?: string | null;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignPerformance {
  campaignId: string;
  businessId: string;
  whatsappClicks: number;
  inquiries: number | null;
  postsPerformance?: PostPerformanceRecord[];
  updatedAt: string;
  lastEventAt?: string;
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
  | 'logo';

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

/**
 * How a Business Brain fact was established. Only owner-confirmed information ever reaches the
 * Brain, so every entry is one of these. A value the owner never typed is never recorded as
 * something they explicitly supplied: a phone number copied from their WhatsApp number is
 * DERIVED_FROM_WHATSAPP, and an operating mode that follows from the business type they chose is
 * DERIVED_FROM_SUBCATEGORY. An explicit value later replaces a derived one.
 */
export type BrainFactSource =
  'USER_CONFIRMED' | 'DERIVED_FROM_WHATSAPP' | 'DERIVED_FROM_SUBCATEGORY' | 'SYSTEM_DEFAULT';

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
  // Phase 33 — mirrors functions/src/types/index.ts's BusinessBrain.verticalProfile
  // exactly, so the customer-facing Business Profile page can read/edit
  // salon services/packages or real-estate properties without inventing a
  // separate shape.
  verticalProfile?: {
    vertical?: BusinessCategory;
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
    appointmentSettings?: {
      acceptInquiries: boolean;
      preferredBookingChannel: 'whatsapp' | 'phone' | 'in_person';
      bookingInstructions?: string;
    };
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
  sourceFingerprint?: string;
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
    /**
     * The OFFER's own dates. Absent when the owner gave none: the campaign's duration is not offer validity.
     * validitySource records how the dates came to be ('owner_dates' = the owner typed them; 'whole_campaign' =
     * the owner said the offer is valid for the whole campaign).
     */
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
  deletedAt?: string;
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

export type ReelGoal =
  | 'food_showcase'
  | 'behind_the_scenes'
  | 'offer_promotion'
  | 'new_product'
  | 'local_attraction'
  | 'surprise_me';

export type ReelStyle = 'fast_engaging' | 'premium' | 'local_fun' | 'minimal' | 'cinematic';

export type CreativeObjective =
  'awareness' | 'engagement' | 'conversion' | 'launch' | 'promotion' | 'retention';

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

export type ReelDurationSeconds = 15 | 30 | 45;

export type ReelStatus =
  'draft' | 'uploading' | 'analyzing' | 'planning' | 'rendering' | 'completed' | 'failed';

export interface ReelProject {
  reelId: string;
  businessId: string;
  userId: string;
  status: ReelStatus;
  goal: ReelGoal;
  templateId?: string;
  creativeObjective?: CreativeObjective;
  savedStyleId?: string;
  style: ReelStyle;
  durationSeconds: ReelDurationSeconds;
  inputClipIds: string[];
  offer?: string;
  cta?: string;
  additionalMessage?: string;
  outputUrl?: string;
  /** Same file served as an attachment (forces a real download). */
  downloadUrl?: string;
  thumbnailUrl?: string;
  creditsReserved?: number;
  creditsUsed?: number;
  error?: {
    code: string;
    message: string;
    stage: string;
    retryable: boolean;
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
  creditsIncluded: number;
  /** One-time welcome credits in this period (they do not expire and carry into later periods until used). */
  welcomeCredits?: number;
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

export interface AgencyMember {
  userId: string;
  email: string;
  name: string;
  role: 'agency_admin' | 'agency_member';
  assignedClientIds?: string[];
  addedAt: string;
}

export interface Agency {
  agencyId: string;
  name: string;
  ownerUserId: string;
  vertical?: BusinessCategory;
  members: AgencyMember[];
  clientCount: number;
  allocatedCredits: number;
  totalCredits: number;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  clientId: string;
  agencyId: string;
  businessId: string;
  name: string;
  category: BusinessCategory;
  status: 'ACTIVE' | 'ONBOARDING' | 'PAUSED' | 'ARCHIVED';
  allocatedCredits: number;
  usedCredits: number;
  activeCampaignsCount: number;
  totalInquiries: number;
  createdAt: string;
  updatedAt: string;
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

export interface BusinessBrainContext {
  business: BusinessProfile;
  brand: BrandProfile;
  localization: LocalizationProfile;
  products: Product[];
  rules: BusinessRules;
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

export type SocialConnectionStatus =
  'pending' | 'active' | 'expired' | 'revoked' | 'error' | 'disconnected';

export interface MetaFacebookPageMetadata {
  id: string;
  name: string;
  username?: string;
  pictureUrl?: string;
}

export interface MetaInstagramAccountMetadata {
  id?: string;
  username?: string;
  accountType?: string;
  name?: string;
  profilePictureUrl?: string;
}

export interface SocialConnection {
  connectionId: string;
  userId: string;
  businessId?: string;
  provider: 'meta';
  status: SocialConnectionStatus;
  facebookPage: MetaFacebookPageMetadata;
  instagram: MetaInstagramAccountMetadata;
  permissions: string[];
  tokenReference: string;
  connectedAt: string;
  updatedAt: string;
  lastValidatedAt?: string;
  metadata: {
    metaApiVersion: string;
  };
}

export interface PendingMetaPage {
  pageId: string;
  pageName: string;
  pageUsername?: string;
  pictureUrl?: string;
  instagramAccount?: {
    id: string;
    username?: string;
    accountType?: string;
    name?: string;
    profilePictureUrl?: string;
  };
}

export type PublishPlatform = 'instagram' | 'facebook';

export type PublishContentType = 'post' | 'reel';

export type PublishStatus =
  | 'draft'
  | 'approved'
  | 'scheduled'
  | 'processing'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

export type PublishErrorCode =
  | 'AUTH_REQUIRED'
  | 'CONNECTION_REVOKED'
  | 'PERMISSION_DENIED'
  | 'INVALID_MEDIA'
  | 'UNSUPPORTED_CONTENT'
  | 'RATE_LIMITED'
  | 'META_API_ERROR'
  | 'NETWORK_ERROR'
  | 'PROCESSING_TIMEOUT'
  | 'UNKNOWN';

export interface PublishJob {
  jobId: string;
  userId: string;
  businessId: string;
  campaignId: string;
  socialConnectionId: string;
  platform: PublishPlatform;
  contentType: PublishContentType;
  mediaUrl: string;
  caption: string;
  scheduledAt?: string | null;
  status: PublishStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string | null;
  nextAttemptAt?: string | null;
  publishedAt?: string | null;
  externalPostId?: string | null;
  externalContainerId?: string | null;
  idempotencyKey: string;
  errorCode?: PublishErrorCode | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublishInput {
  campaignId: string;
  socialConnectionId: string;
  platform: PublishPlatform;
  contentType: PublishContentType;
  scheduledAt?: string | null;
  captionOverride?: string;
  idempotencyKey?: string;
}

export interface PublishResult {
  success: boolean;
  job: PublishJob;
  externalPostId?: string | null;
  error?: {
    code: PublishErrorCode;
    message: string;
    retryable: boolean;
  };
}

export type ScheduledPostStatus = 'scheduled' | 'processing' | 'published' | 'failed' | 'cancelled';

export interface ScheduledPost {
  scheduledPostId: string;
  userId: string;
  businessId: string;
  campaignId: string;
  socialConnectionId: string;
  platform: PublishPlatform;
  contentType: PublishContentType;
  mediaUrls: string[];
  caption: string;
  scheduledAt: string;
  timezone: string;
  status: ScheduledPostStatus;
  processingBy?: string | null;
  processingAt?: string | null;
  leaseExpiresAt?: string | null;
  attemptId?: string | null;
  publishJobId?: string | null;
  externalPostId?: string | null;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string | null;
  nextAttemptAt?: string | null;
  errorCode?: PublishErrorCode | string | null;
  errorMessage?: string | null;
  publishedAt?: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  campaignId: string;
  socialConnectionId: string;
  platform: PublishPlatform;
  contentType: PublishContentType;
  scheduledAt: string;
  timezone: string;
  captionOverride?: string;
  idempotencyKey?: string;
}

export interface RescheduleInput {
  scheduledPostId: string;
  newScheduledAt: string;
  timezone: string;
}

// Phase 14 — 30-Day AI Marketing Calendar V1 Types
export type MarketingGoal =
  'get_customers' | 'promote_offers' | 'build_awareness' | 'promote_products';

export type PostingFrequency = 'three_per_week' | 'five_per_week' | 'daily';

export type CalendarItemStatus =
  'planned' | 'content_created' | 'scheduled' | 'published' | 'skipped';

export interface MarketingPlan {
  planId: string;
  userId: string;
  businessId: string;
  goal: MarketingGoal;
  frequency: PostingFrequency;
  startDate: string;
  endDate: string;
  timezone: string;
  status: 'active' | 'archived';
  totalItems: number;
  createdCount: number;
  metadata?: {
    promptVersion?: string;
    aiModel?: string;
    businessBrainVersion?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MarketingCalendarItem {
  itemId: string;
  planId: string;
  userId: string;
  businessId: string;
  scheduledDate: string;
  suggestedTime: string;
  timezone: string;
  contentType: PublishContentType;
  strategy: string;
  topic: string;
  hook: string;
  offerHeadline?: string | null;
  productId?: string | null;
  productName?: string | null;
  callToAction: string;
  status: CalendarItemStatus;
  campaignId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratePlanInput {
  businessId: string;
  goal: MarketingGoal;
  frequency: PostingFrequency;
  specificProductId?: string;
  startDate?: string;
  timezone?: string;
  idempotencyKey?: string;
}

export * from './beta';
