import { z } from 'zod';
import type {
  BusinessBrain,
  BusinessCategory,
  CampaignObjective,
  OfferType,
  CTAType,
  LocalizationProfile,
  SavedStyleContext,
  CreativePreference,
  CreativeFeedback,
  CreativeGrammarStep,
} from '../../types';
import type { BusinessUnderstandingOutput, ProductUnderstandingOutput } from './pipeline';

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

export const CREATIVE_BRAIN_CONFIG = {
  DEFAULT_CANDIDATE_COUNT: 3,
  MIN_CANDIDATE_COUNT: 2,
  MAX_CANDIDATE_COUNT: 5,
  MIN_VIABILITY_THRESHOLD: 70, // Total score threshold out of 100
  SCORING_WEIGHTS: {
    TRUTH_ALIGNMENT_MAX: 25, // 100% Deterministic Hard Gate
    BRAND_FIT_MAX: 20,
    AUDIENCE_RELEVANCE_MAX: 20,
    OFFER_FIT_MAX: 15,
    HISTORICAL_PERFORMANCE_MAX: 10,
    EXECUTION_FEASIBILITY_MAX: 10,
  },
} as const;

// ============================================================================
// 1. INPUT CONTRACT
// ============================================================================

export interface CreativeBrainMemoryContext {
  readonly preferences: readonly CreativePreference[];
  readonly feedback: readonly CreativeFeedback[];
  readonly activeSavedStyle?: SavedStyleContext;
  readonly performanceRecommendations?: {
    readonly topPerformingAngles?: readonly string[];
    readonly topPerformingCTAs?: readonly string[];
    readonly historicalCTR?: number;
    readonly totalWhatsAppClicks?: number;
  };
}

export interface CreativeBrainCampaignIntent {
  readonly campaignId?: string;
  readonly businessId: string;
  readonly objective: CampaignObjective;
  readonly templateId?: string;
  readonly styleId?: string;
  readonly offer: {
    readonly headline: string;
    readonly description?: string;
    readonly price: number;
    readonly originalPrice?: number;
    readonly type: OfferType;
    readonly validityStart?: string;
    readonly validityEnd?: string;
    readonly terms?: string;
  };
  readonly duration: {
    readonly start: string;
    readonly end: string;
  };
  readonly audience: {
    readonly localities: readonly string[];
    readonly ageRange?: { readonly min: number; readonly max: number };
    readonly occasion?: string;
  };
  readonly cta: CTAType;
  readonly localization: LocalizationProfile;
}

export interface CreativeBrainConflictConstraints {
  readonly nonNegotiableRules: Record<string, string>;
  readonly directives: readonly string[];
  readonly detectedConflictsCount: number;
}

export interface CreativeBrainInput {
  readonly businessBrain: BusinessBrain;
  readonly vertical: BusinessCategory;
  readonly productContext?: {
    readonly productId?: string;
    readonly name: string;
    readonly description?: string;
    readonly price: number;
    readonly category?: string;
    readonly images: readonly string[];
  };
  readonly intent: CreativeBrainCampaignIntent;
  readonly businessUnderstanding: BusinessUnderstandingOutput;
  readonly productUnderstanding?: ProductUnderstandingOutput;
  readonly memory: CreativeBrainMemoryContext;
  readonly conflictConstraints: CreativeBrainConflictConstraints;
  readonly candidateCount?: number;
  readonly industryCreativeContext?: import('./creativeBrain/industry/industryKnowledge.types').IndustryCreativeContext;
}

// ============================================================================
// 2. CREATIVE OPPORTUNITY CONTRACT
// ============================================================================

export const OpportunityConstraintSetSchema = z.object({
  maxTextDensity: z.enum(['low', 'medium', 'high']),
  toneBoundary: z.string(),
  factualLimits: z.array(z.string()),
});

export const CreativeOpportunitySchema = z.object({
  opportunityId: z.string().min(1),
  vertical: z.enum(['restaurant', 'salon', 'real_estate', 'general']),
  problem: z.string().min(1),
  tension: z.string().min(1),
  motivation: z.string().min(1),
  occasion: z.string().optional(),
  audienceInsight: z.string().min(1),
  opportunityStatement: z.string().min(1),
  desiredBusinessOutcome: z.string().min(1),
  desiredAudienceResponse: z.string().min(1),
  supportingSignals: z.array(z.string()),
  constraints: OpportunityConstraintSetSchema,
  // ONE scale: a whole number from 0 to 100. A fraction (0.9) or a string is a contract violation: the schema
  // rejects it and the repair step asks the model to answer again, instead of the code guessing what it meant.
  confidence: z.number().int().min(0).max(100),
  rationale: z.string().min(1),

  // Phase 8 Explicit Strategic Fields (Optional for backward compatibility with legacy calls)
  audience: z.string().optional(),
  problemOrDesire: z.string().optional(),
  marketingObjective: z.string().optional(),
  productOrService: z.string().optional(),
  offer: z.string().optional(),
  customerTension: z.string().optional(),
  businessDifferentiator: z.string().optional(),
  relevantProof: z.array(z.string()).optional(),
  emotionalTerritory: z.string().optional(),
  creativeOpportunity: z.string().optional(),
  strategicRecommendation: z.string().optional(),
  thingsToAvoid: z.array(z.string()).optional(),
});

export type OpportunityConstraintSet = z.infer<typeof OpportunityConstraintSetSchema>;
export type CreativeOpportunity = z.infer<typeof CreativeOpportunitySchema>;

// ============================================================================
// 3. CONCEPT SCORE CONTRACT
// ============================================================================

export interface ConceptScoreBreakdown {
  readonly truthAlignment: number; // Max 25 (100% Deterministic Hard Gate)
  readonly brandFit: number; // Max 20
  readonly audienceRelevance: number; // Max 20
  readonly offerFit: number; // Max 15
  readonly historicalPerformance: number; // Max 10
  readonly executionFeasibility: number; // Max 10
}

export interface CreativeConceptScore {
  readonly totalScore: number; // 0 - 100
  readonly breakdown: ConceptScoreBreakdown;
  readonly evaluationNotes: readonly string[];
  readonly isViable: boolean; // Total Score >= 70
}

// ============================================================================
// 4. CREATIVE CONCEPT CONTRACT
// ============================================================================

export const VisualPremiseSpecificationSchema = z.object({
  emphasis: z.enum(['product-led', 'text-led', 'image-led', 'offer-led']),
  composition: z.enum([
    'hero-product',
    'split-composition',
    'editorial',
    'minimal',
    'high-contrast',
  ]),
  mood: z.string(),
  compositionHints: z.array(z.string()),
});

export const CandidateConceptGenerationItemSchema = z.object({
  conceptId: z.string().min(1),
  title: z.string().min(1),
  angle: z.string().min(1),
  coreIdea: z.string().min(1),
  hookDirection: z.string().min(1),
  emotionalDriver: z.enum([
    'playful',
    'serious',
    'professional',
    'warm',
    'bold',
    'premium',
    'energetic',
  ]),
  audienceFraming: z.string().min(1),
  message: z.string().min(1),
  offerFraming: z.string().min(1),
  ctaDirection: z.string().min(1),
  visualPremise: VisualPremiseSpecificationSchema,
  differentiation: z.string().min(1),
  expectedResponse: z.string().min(1),
  templateId: z.string().min(1),
});

export const CandidateConceptsLLMOutputSchema = z.object({
  concepts: z.array(CandidateConceptGenerationItemSchema).min(2).max(5),
});

export type VisualPremiseSpecification = z.infer<typeof VisualPremiseSpecificationSchema>;
export type CandidateConceptGenerationItem = z.infer<typeof CandidateConceptGenerationItemSchema>;

export interface CreativeConcept extends CandidateConceptGenerationItem {
  readonly opportunityId: string;
  readonly grammar: readonly CreativeGrammarStep[];
  readonly score: CreativeConceptScore;
}

// ============================================================================
// 5. CREATIVE BLUEPRINT CONTRACT
// ============================================================================

export const BlueprintStrategyDirectivesSchema = z.object({
  angle: z.string().min(1),
  hook: z.string().min(1),
  offerFraming: z.string().min(1),
  audienceInsight: z.string().min(1),
  keyMessages: z.array(z.string()).length(5),
  ctaPrimary: z.string().min(1),
  differentiators: z.array(z.string()).min(1),
});

export const BlueprintCopyDirectivesSchema = z.object({
  headlineTone: z.string().min(1),
  requiredKeywords: z.array(z.string()),
  prohibitedTerms: z.array(z.string()),
  maxHeadlineLength: z.number().positive(),
  primaryLanguage: z.enum(['en', 'te', 'hi', 'te_en', 'hi_en']),
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
});

export const BlueprintVisualDirectivesSchema = z.object({
  emphasis: z.enum(['product-led', 'text-led', 'image-led', 'offer-led']),
  composition: z.enum([
    'hero-product',
    'split-composition',
    'editorial',
    'minimal',
    'high-contrast',
  ]),
  visualMood: z.string().min(1),
  heroPromptGuidance: z.string().min(1),
  textOverlayRules: z.object({
    showPrice: z.boolean(),
    showOriginalPriceStrikethrough: z.boolean(),
    showOfferBadge: z.boolean(),
    ctaPlacement: z.enum(['bottom', 'top', 'integrated']),
  }),
});

export const CreativeBlueprintTraceSchema = z.object({
  traceId: z.string().uuid(),
  evaluatedConceptsCount: z.number().nonnegative(),
  winningConceptId: z.string(),
  winningScore: z.number().min(0).max(100),
  reasoningSummary: z.string(),
  generatedAt: z.string(),
});

export const CreativeBlueprintSchema = z.object({
  blueprintId: z.string().min(1),
  campaignId: z.string(),
  businessId: z.string(),
  opportunity: CreativeOpportunitySchema,
  winningConcept: z.any(), // CreativeConcept validated at runtime
  selectedTemplateId: z.string(),
  strategyDirectives: BlueprintStrategyDirectivesSchema,
  copyDirectives: BlueprintCopyDirectivesSchema,
  visualDirectives: BlueprintVisualDirectivesSchema,
  trace: CreativeBlueprintTraceSchema,
});

export type BlueprintStrategyDirectives = z.infer<typeof BlueprintStrategyDirectivesSchema>;
export type BlueprintCopyDirectives = z.infer<typeof BlueprintCopyDirectivesSchema>;
export type BlueprintVisualDirectives = z.infer<typeof BlueprintVisualDirectivesSchema>;
export type CreativeBlueprintTrace = z.infer<typeof CreativeBlueprintTraceSchema>;
export type CreativeBlueprint = z.infer<typeof CreativeBlueprintSchema>;

// ============================================================================
// 6. CREATIVE BRAIN RESULT CONTRACT
// ============================================================================

export interface CreativeBrainResult {
  readonly success: boolean;
  readonly blueprint: CreativeBlueprint;
  readonly fallbackTriggered: boolean;
  readonly executionTimeMs: number;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}
