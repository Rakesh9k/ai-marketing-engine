/**
 * PHASE 10.34 — Build Local Intelligence
 * Type Definitions and Data Contracts
 */

export type ID = string;
export type ISODateTime = string;

export type KnowledgeStatus =
  | "DRAFT"
  | "REVIEW"
  | "APPROVED"
  | "DEPRECATED";

export type SignalEvidenceStatus =
  | "HYPOTHESIS"
  | "EMERGING"
  | "SUPPORTED"
  | "VALIDATED"
  | "ESTABLISHED";

export type LocalSourceType =
  | "OFFICIAL"
  | "GOVERNMENT"
  | "RESEARCH"
  | "NEWS"
  | "LOCAL_PUBLICATION"
  | "BUSINESS_DATA"
  | "USER_PROVIDED"
  | "PERFORMANCE_DERIVED"
  | "AI_GENERATED";

export interface LocalSourceMetadata {
  sourceType: LocalSourceType;
  sourceReference?: string;
  collectedAt: ISODateTime;
  confidence: number;
}

export interface LocalKnowledgeValidity {
  validFrom?: ISODateTime;
  validUntil?: ISODateTime;
  reviewAfter?: ISODateTime;
  volatility: "LOW" | "MEDIUM" | "HIGH";
}

export interface EvidenceReference {
  id: ID;
  title: string;
  sourceType: LocalSourceType;
  uri?: string;
  confidence: number;
}

export interface LocalMarketProfile {
  id: ID;
  countryCode: string;
  stateCode?: string;
  cityId: ID;
  cityName: string;
  region?: string;
  languageProfileId?: ID;
  culturalProfileId?: ID;
  behavioralProfileId?: ID;
  occasionProfileId?: ID;
  foodCultureProfileId?: ID;
  shoppingBehaviorProfileId?: ID;
  seasonalProfileId?: ID;
  neighborhoodProfileIds: ID[];
  audienceProfileIds: ID[];
  confidence: number;
  sourceMetadata: LocalSourceMetadata[];
  version: number;
  status: KnowledgeStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface LocalCharacteristic {
  key: string;
  value: string;
  confidence: number;
}

export interface LocalAudiencePattern {
  audienceName: string;
  density: "HIGH" | "MEDIUM" | "LOW";
  primaryNeeds: string[];
}

export interface LocalCommercialPattern {
  id: ID;
  marketId: ID;
  neighborhoodId?: ID;
  zoneType:
    | "OFFICE_PARK"
    | "RESIDENTIAL_COMMUNITY"
    | "HIGH_STREET"
    | "SHOPPING_MALL"
    | "EDUCATION_HUB"
    | "HOSPITALITY_DISTRICT"
    | "MIXED_DEVELOPMENT";
  primaryChannels: ("WHATSAPP" | "WALK_IN" | "ONLINE_DELIVERY" | "PHONE" | "WEBSITE")[];
  priceSensitivity: "HIGH" | "MEDIUM" | "LOW" | "PREMIUM";
  discoveryPatterns: string[];
  confidence: number;
}

export interface NeighborhoodProfile {
  id: ID;
  cityId: ID;
  name: string;
  alternateNames: string[];
  zoneType: string;
  characteristics: LocalCharacteristic[];
  audiencePatterns: LocalAudiencePattern[];
  commercialPatterns: LocalCommercialPattern[];
  relevantOccasions: LocalOccasion[];
  languageSignals: LanguageSignal[];
  confidence: number;
  sourceMetadata: LocalSourceMetadata[];
}

export interface LocalLanguage {
  code: string;
  name: string;
  isPrimary: boolean;
  script: string;
}

export interface MixedLanguagePattern {
  name: string; // e.g. "Hinglish", "Teluglish"
  baseLanguage: string;
  secondaryLanguage: string;
  commonContexts: string[];
  examplePhrases: string[];
}

export interface ScriptPreference {
  languageCode: string;
  preferredScript: "NATIVE_SCRIPT" | "ROMANIZED" | "BI_SCRIPTAL";
  targetAudience: string;
  context: string;
}

export interface LanguageTonePattern {
  tone: string;
  formality: "FORMAL" | "INFORMAL" | "COLLOQUIAL";
  commercialUsage: string;
}

export interface LocalTerm {
  term: string;
  meaning: string;
  context: string;
  sensitivityLevel: "NONE" | "MILD" | "HIGH";
}

export interface AudienceLanguageVariation {
  audienceType: string;
  preferredLanguages: string[];
  preferredStyle: string;
}

export interface LanguageSignal {
  languageCode: string;
  relevanceScore: number;
  context: string;
}

export interface LocalLanguageProfile {
  id: ID;
  cityId: ID;
  languages: LocalLanguage[];
  mixedLanguagePatterns: MixedLanguagePattern[];
  scriptPreferences: ScriptPreference[];
  commercialTonePatterns: LanguageTonePattern[];
  commonLocalTerms: LocalTerm[];
  avoidTerms: LocalTerm[];
  audienceVariations: AudienceLanguageVariation[];
  confidence: number;
  version: number;
}

export interface TimeContext {
  dayOfWeek?: ("WEEKDAY" | "WEEKEND" | "ALL")[];
  timeOfDay?: ("MORNING" | "LUNCH" | "AFTERNOON" | "EVENING" | "LATE_NIGHT")[];
  season?: string;
}

export interface LocalBehaviorSignal {
  id: ID;
  marketId: ID;
  neighborhoodId?: ID;
  behaviorType:
    | "WEEKDAY_OFFICE"
    | "WEEKEND_FAMILY"
    | "LATE_NIGHT_DINING"
    | "ONLINE_ORDERING"
    | "NEIGHBORHOOD_COMMUTE"
    | "DISCOUNT_HUNTING"
    | "PREMIUM_EXPERIENCE"
    | "FESTIVAL_SHOPPING"
    | "QUICK_CONVENIENCE";
  description: string;
  relevantAudienceIds: string[];
  relevantBusinessCategories: string[];
  timeContexts?: TimeContext[];
  strength: number; // 0 to 100
  confidence: number; // 0 to 1
  evidence: EvidenceReference[];
  status: SignalEvidenceStatus;
}

export interface OccasionTiming {
  type: "RECURRING" | "FIXED_DATE" | "SEASONAL_WINDOW";
  recurrence?: "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUAL";
  months?: number[];
  daysOfWeek?: string[];
}

export interface LocalOccasion {
  id: ID;
  name: string;
  marketId: ID;
  neighborhoodId?: ID;
  category:
    | "DAILY"
    | "WEEKLY"
    | "SEASONAL"
    | "CULTURAL"
    | "COMMERCIAL"
    | "LIFE_EVENT"
    | "LOCAL_EVENT";
  timing?: OccasionTiming;
  relevantAudiences: string[];
  relevantIndustries: string[];
  associatedNeeds: string[];
  associatedBehaviors: string[];
  confidence: number;
  sourceMetadata: LocalSourceMetadata[];
}

export interface FoodCultureSignal {
  id: ID;
  marketId: ID;
  neighborhoodId?: ID;
  dishOrCuisine: string;
  culturalRelevance: string;
  popularMealTimes: string[];
  dietaryNotes: string[];
  deliveryVsDineIn: "DELIVERY_HEAVY" | "DINE_IN_HEAVY" | "BALANCED";
  confidence: number;
  status: SignalEvidenceStatus;
}

export interface LocalAudienceProfile {
  id: ID;
  marketId: ID;
  name: string;
  description: string;
  lifeStage?: string;
  occupationContext?: string;
  geographicContext?: string;
  needs: string[];
  behaviors: string[];
  occasions: string[];
  languagePreferences: string[];
  culturalSignals: string[];
  shoppingSignals: string[];
  confidence: number;
  evidence: EvidenceReference[];
}

export type ReferenceType =
  | "LANDMARK"
  | "NEIGHBORHOOD"
  | "CULTURAL"
  | "FOOD"
  | "EVENT"
  | "TRANSPORT"
  | "COMMERCIAL"
  | "LANGUAGE"
  | "OTHER";

export interface LocalReference {
  id: ID;
  name: string;
  type: ReferenceType;
  description: string;
  relevance: string[];
  sensitivity?: string[];
  confidence: number;
  sourceMetadata: LocalSourceMetadata[];
  status: KnowledgeStatus;
}

export interface SeasonalSignal {
  id: ID;
  marketId: ID;
  seasonName: string;
  months: number[];
  temperatureOrWeatherPattern: string;
  commercialImpact: string;
  relevantCategories: string[];
  confidence: number;
}

export interface BusinessCatchment {
  businessId: ID;
  tenantId?: ID;
  primaryMarketId: ID;
  neighborhoodIds: ID[];
  radiusKm?: number;
  audienceProfiles: string[];
  localSignals: string[];
  confidence: number;
}

export interface LocalContext {
  marketId: ID;
  city: string;
  neighborhoods: string[];
  relevantLanguages: string[];
  relevantReferences: LocalReference[];
  behavioralSignals: LocalBehaviorSignal[];
  relevantOccasions: LocalOccasion[];
  audienceSignals: LocalAudienceProfile[];
  commerceSignals: LocalCommercialPattern[];
  foodCultureSignals?: FoodCultureSignal[];
  seasonalSignals: SeasonalSignal[];
  confidence: number;
  retrievalReasons: string[];
  localizationLevel: 0 | 1 | 2 | 3 | 4 | 5;
}

export interface CreativeBrainLocalContext {
  market: string;
  neighborhood?: string;
  audienceSignals: string[];
  behavioralSignals: string[];
  occasionSignals: string[];
  languageSignals: string[];
  culturalSignals: string[];
  relevantReferences: string[];
  confidence: number;
  localizationLevel: number;
}

export interface LocalRelevanceScore {
  overall: number; // 0 to 100
  audienceFit: number;
  geographicFit: number;
  culturalFit: number;
  occasionFit: number;
  businessFit: number;
  confidence: number;
}

export interface RetrievalQueryInput {
  businessId: ID;
  tenantId?: ID;
  businessCategory: string;
  campaignIntent?: string;
  audience?: string;
  objective?: string;
  product?: string;
  location?: {
    city?: string;
    neighborhood?: string;
    lat?: number;
    lng?: number;
  };
  platform?: string;
  format?: string;
  timeContext?: TimeContext;
}

export interface ContextBudgetConfig {
  maxLocalSignals: number;
  maxReferences: number;
  maxBehavioralSignals: number;
  maxLanguageSignals: number;
  maxOccasions: number;
}

export interface LocalAuditEvent {
  id: ID;
  eventType:
    | "LOCAL_PROFILE_CREATED"
    | "LOCAL_PROFILE_UPDATED"
    | "LOCAL_PROFILE_APPROVED"
    | "LOCAL_PROFILE_DEPRECATED"
    | "LOCAL_SIGNAL_CREATED"
    | "LOCAL_SIGNAL_UPDATED"
    | "LOCAL_SIGNAL_APPROVED"
    | "LOCAL_REFERENCE_ADDED"
    | "LOCAL_REFERENCE_DEPRECATED"
    | "LOCAL_OVERRIDE_CREATED"
    | "LOCAL_OVERRIDE_UPDATED"
    | "LOCAL_KNOWLEDGE_USED"
    | "LOCAL_KNOWLEDGE_REJECTED"
    | "LOCAL_KNOWLEDGE_LEARNED";
  businessId?: ID;
  tenantId?: ID;
  details: Record<string, unknown>;
  timestamp: ISODateTime;
}
