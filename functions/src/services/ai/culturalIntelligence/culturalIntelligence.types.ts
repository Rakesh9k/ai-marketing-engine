/**
 * PHASE 10.35 — Build Cultural Sensitivity
 * Type Definitions & Data Contracts
 */

import type { LocalSourceMetadata } from "../localIntelligence/localIntelligence.types";

export type ID = string;
export type ISODateTime = string;

export type CulturalExpressionLevel = "NONE" | "SUBTLE" | "MODERATE" | "EXPLICIT";

export type KnowledgeStatus = "DRAFT" | "APPROVED" | "DEPRECATED";

export type SignalEvidenceStatus =
  | "HYPOTHESIS"
  | "OBSERVED"
  | "SUPPORTED"
  | "VALIDATED"
  | "ESTABLISHED";

export type SensitivityRuleType =
  | "AVOID"
  | "CAUTION"
  | "REQUIRE_CONTEXT"
  | "VERIFY"
  | "PREFER";

export type SensitivityCategory =
  | "LANGUAGE"
  | "RELIGION"
  | "FESTIVAL"
  | "FOOD"
  | "FAMILY"
  | "GENDER"
  | "COMMUNITY"
  | "IDENTITY"
  | "HUMOR"
  | "HISTORY"
  | "POLITICS"
  | "TRADITION"
  | "OTHER";

export type RiskType =
  | "STEREOTYPE"
  | "FORCED_LOCALIZATION"
  | "INACCURATE_REFERENCE"
  | "LANGUAGE_MISUSE"
  | "CULTURAL_TRIVIALIZATION"
  | "SENSITIVE_OCCASION"
  | "INAPPROPRIATE_HUMOR"
  | "OVERGENERALIZATION";

export interface CulturalSignal {
  id: ID;
  marketId: ID;
  category:
    | "LANGUAGE"
    | "FOOD"
    | "FAMILY"
    | "SOCIAL"
    | "OCCASION"
    | "TRADITION"
    | "LIFESTYLE"
    | "COMMUNITY"
    | "COMMERCE"
    | "IDENTITY";
  description: string;
  relevanceContexts: string[];
  appropriateUses: string[];
  inappropriateUses: string[];
  confidence: number;
  sourceMetadata: LocalSourceMetadata[];
  status: SignalEvidenceStatus;
}

export interface TonePattern {
  name: string;
  description: string;
  formality: "FORMAL" | "INFORMAL" | "COLLOQUIAL";
  appropriateCategories: string[];
}

export interface ConversationalPattern {
  pattern: string;
  usageContext: string;
}

export interface FormalityPreference {
  audienceType: string;
  formalityLevel: "FORMAL" | "INFORMAL" | "CASUAL";
}

export interface HumorPattern {
  humorType: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  avoidContexts: string[];
}

export interface LanguageMixPattern {
  name: string;
  primaryLanguage: string;
  secondaryLanguage: string;
  appropriatenessScore: number;
}

export interface ToneAvoidancePattern {
  pattern: string;
  reason: string;
}

export interface RegionalToneProfile {
  marketId: ID;
  preferredTonePatterns: TonePattern[];
  conversationalPatterns: ConversationalPattern[];
  formalityPreferences: FormalityPreference[];
  humorPatterns?: HumorPattern[];
  languageMixPatterns?: LanguageMixPattern[];
  avoidPatterns: ToneAvoidancePattern[];
  confidence: number;
}

export interface LanguagePreference {
  languageCode: string;
  languageName: string;
  preferenceRank: number;
}

export interface ScriptPreference {
  languageCode: string;
  preferredScript: "NATIVE_SCRIPT" | "ROMANIZED" | "BI_SCRIPTAL";
  context: string;
}

export interface MixedLanguagePattern {
  name: string;
  baseLanguage: string;
  secondaryLanguage: string;
  commonContexts: string[];
  examplePhrases: string[];
}

export interface LanguageContextVariation {
  channelOrContext: string;
  recommendedLanguage: string;
  script: string;
}

export interface LanguagePreferenceProfile {
  marketId: ID;
  audienceId?: ID;
  preferredLanguages: LanguagePreference[];
  scriptPreferences: ScriptPreference[];
  mixedLanguagePatterns: MixedLanguagePattern[];
  contextVariations: LanguageContextVariation[];
  confidence: number;
}

export interface SensitivityRule {
  id: ID;
  marketId?: ID;
  category: SensitivityCategory;
  ruleType: SensitivityRuleType;
  description: string;
  appliesTo: string[];
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  rationale: string;
  sourceMetadata: LocalSourceMetadata[];
  status: KnowledgeStatus;
}

export interface CulturalRisk {
  type: RiskType;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  mitigation: string;
}

export interface LocalReferenceContext {
  referenceId: ID;
  relevanceScore: number;
  audienceFit: number;
  businessFit: number;
  situationalFit: number;
  culturalFit: number;
  sensitivityRisk: number;
  naturalnessScore: number;
  overuseScore: number;
  recommendation: "USE" | "CONSIDER" | "AVOID";
  reason: string;
}

export interface LocalityContribution {
  referenceId?: ID;
  contributionType:
    | "AUDIENCE"
    | "SITUATION"
    | "IDENTITY"
    | "EMOTION"
    | "TRUST"
    | "CLARITY"
    | "OCCASION"
    | "STORY";
  contributionScore: number;
  explanation: string;
}

export interface CulturalRelevanceScore {
  overall: number; // 0 to 100
  audienceRelevance: number;
  situationalRelevance: number;
  businessRelevance: number;
  geographicRelevance: number;
  occasionRelevance: number;
  languageRelevance: number;
  referenceRelevance: number;
  confidence: number;
  explanation: string;
}

export interface LocalizationDecision {
  shouldLocalize: boolean;
  expressionLevel: CulturalExpressionLevel;
  recommendedLanguages: string[];
  recommendedReferences: string[];
  culturalSignals: string[];
  reasons: string[];
  sensitivityWarnings: string[];
  confidence: number;
}

export interface LocalizationStrategy {
  level: CulturalExpressionLevel;
  strategicInfluence: string[];
  visibleExpressions: string[];
  languageChoice?: string;
  referenceChoice?: string[];
  culturalSignalsUsed: string[];
  signalsIntentionallyNotUsed: string[];
  explanation: string;
}

export interface CulturalContext {
  marketId: ID;
  culturalSignals: CulturalSignal[];
  regionalTone?: RegionalToneProfile;
  languagePreference?: LanguagePreferenceProfile;
  localReferences: LocalReferenceContext[];
  sensitivityRules: SensitivityRule[];
  culturalRelevanceScore: number;
  expressionRecommendation: CulturalExpressionLevel;
  confidence: number;
  retrievedAt: ISODateTime;
}

export interface CulturalCreativeContext {
  localizationDecision: LocalizationDecision;
  culturalContext: CulturalContext;
  languagePreference?: LanguagePreferenceProfile;
  regionalTone?: RegionalToneProfile;
  sensitivityRules: SensitivityRule[];
  localReferences: LocalReferenceContext[];
  culturalRisks: CulturalRisk[];
  explanation: string;
}

export interface CulturalPreferenceOverride {
  businessId: ID;
  tenantId?: ID;
  preferenceType:
    | "LANGUAGE_CHOICE"
    | "LOCALIZATION_LEVEL"
    | "REFERENCE_USAGE"
    | "CULTURAL_THEME";
  value: string; // e.g. "ENGLISH_ONLY", "TELUGU_ONLY", "NO_LOCAL_REFERENCES"
  reason?: string;
  createdAt: ISODateTime;
}

export interface CulturalAuditEvent {
  id: ID;
  eventType:
    | "CULTURAL_CONTEXT_CREATED"
    | "CULTURAL_CONTEXT_UPDATED"
    | "CULTURAL_CONTEXT_APPROVED"
    | "CULTURAL_CONTEXT_DEPRECATED"
    | "LANGUAGE_PREFERENCE_CREATED"
    | "LANGUAGE_PREFERENCE_UPDATED"
    | "LOCAL_REFERENCE_APPROVED"
    | "LOCAL_REFERENCE_REJECTED"
    | "SENSITIVITY_RULE_CREATED"
    | "SENSITIVITY_RULE_UPDATED"
    | "CULTURAL_OVERRIDE_CREATED"
    | "CULTURAL_RECOMMENDATION_SHOWN"
    | "CULTURAL_RECOMMENDATION_ACCEPTED"
    | "CULTURAL_RECOMMENDATION_REJECTED";
  businessId?: ID;
  tenantId?: ID;
  details: Record<string, unknown>;
  timestamp: ISODateTime;
}

export interface CulturalEvalInput {
  businessId: ID;
  tenantId?: ID;
  businessCategory: string;
  brandVoice?: string;
  businessPreferences?: CulturalPreferenceOverride[];
  campaignIntent?: string;
  audience?: string;
  objective?: string;
  product?: string;
  location?: {
    city?: string;
    neighborhood?: string;
  };
  platform?: string;
  format?: string;
}
