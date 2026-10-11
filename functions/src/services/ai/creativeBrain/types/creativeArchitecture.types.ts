/**
 * PHASE 10.41 — Master Creative Intelligence Architecture Types
 * Defines the final schemas, contracts, decision authority hierarchy,
 * and 6-Layer IP contracts for Mitra's Creative Intelligence System.
 */

// ==========================================
// 1. IP LAYER 1 — CREATIVE KNOWLEDGE
// ==========================================

export type KnowledgeCategory =
  | "PSYCHOLOGY"
  | "MECHANISM"
  | "INSIGHT"
  | "HOOK"
  | "STORY"
  | "VISUAL"
  | "COPY"
  | "OFFER"
  | "CTA"
  | "STYLE"
  | "RECIPE"
  | "RULE"
  | "ANTI_PATTERN";

export interface CreativeKnowledgeItem {
  id: string;
  category: KnowledgeCategory;
  name: string;
  description: string;
  version: number;
  maturity: "DRAFT" | "TESTING" | "ESTABLISHED" | "DEPRECATED";
  supportedIndustries: string[];
  combinesWith?: string[];
  conflictsWith?: string[];
  requiresProof?: boolean;
}

// ==========================================
// 2. IP LAYER 2 — CONTEXT INTELLIGENCE
// ==========================================

export interface BusinessContextContract {
  businessId: string;
  tenantId: string;
  name: string;
  industry: string;
  subVertical: string;
  positioning: string;
  brandVoice: {
    tone: string;
    formality: "CASUAL" | "PREMIUM" | "PROFESSIONAL" | "URGENT";
    languagePreference: string;
    forbiddenWords: string[];
    allowedClaims: string[];
  };
  verifiedEvidence: {
    hasTestimonials: boolean;
    hasReviewCount: boolean;
    reviewRating?: number;
    hasStatedExpiry: boolean;
    hasInventoryLimit: boolean;
    verifiedClaims: string[];
  };
}

export interface CampaignIntentContract {
  intentId: string;
  campaignObjective: "AWARENESS" | "ACQUISITION" | "CONVERSION" | "RETENTION";
  decisionStage: "AWARENESS" | "CONSIDERATION" | "INTENT" | "CONVERSION" | "RETENTION";
  targetAudience: string;
  audienceSituation: string;
  product?: string;
  offerDetails?: {
    hasOffer: boolean;
    offerTitle?: string;
    offerPrice?: number;
    hasStatedExpiry?: boolean;
    hasInventoryLimit?: boolean;
  };
  timing?: string;
}

export interface LocalIntelligenceContext {
  city: string;
  neighborhood?: string;
  localLanguage?: string;
  localBehavior?: string[];
  localOccasions?: string[];
}

export interface CulturalContextContract {
  culturalRegion: string;
  sensitivityRules: string[];
  preferredTone: string;
}

export interface DiversityContextContract {
  recentMechanismIds: string[];
  repetitionPenalty: number; // 0.0 (no penalty) to 1.0 (heavy penalty)
  explorationTargetCategory?: KnowledgeCategory;
}

export interface CreativeFatigueContextContract {
  fatigueLevel: "NONE" | "UNCONFIRMED" | "LIKELY" | "STRONG";
  saturatingMechanismId?: string;
  suggestedFresherDirection?: string;
}

export interface CreativeContext {
  contextId: string;
  business: BusinessContextContract;
  campaign: CampaignIntentContract;
  local?: LocalIntelligenceContext;
  cultural?: CulturalContextContract;
  diversity?: DiversityContextContract;
  fatigue?: CreativeFatigueContextContract;
  platform?: {
    platform: string;
    format: string;
    maxLength?: number;
  };
  timestamp: string;
}

// ==========================================
// 3. IP LAYER 3 — CREATIVE COMPOSITION
// ==========================================

export interface CreativeOpportunity {
  opportunityId: string;
  coreInsight: string;
  strategicProblem: string;
  desiredAudienceShift: string;
  recommendedAngle: string;
}

export interface CreativeExplanationContract {
  primaryWhy: string;
  decisionTrace: string[];
  rejectedAlternatives: string[];
}

export interface CreativeStrategy {
  strategyId: string;
  contextId: string;
  strategicDirection: string;

  psychologyIds: string[];
  mechanismIds: string[];
  insightIds?: string[];

  recipeId?: string;
  recipeVersion?: number;

  audienceSituation: string;
  customerTension?: string;

  emotionalTerritory?: string[];

  storyStructureId?: string;
  hookPatternId?: string;
  visualStructureId?: string;
  copyStructureId?: string;

  offerMechanismId?: string;
  ctaMechanismId?: string;

  strategicRecommendation: string;
  thingsToAvoid: string[];

  whyThisStrategy: CreativeExplanationContract;

  confidence: number;
  diversityContribution?: number;
  culturalInfluence?: string[];

  createdAt: string;
}

export type RefusalReason =
  | "NO_VALID_DIRECTION"
  | "INSUFFICIENT_CONTEXT"
  | "REQUIRES_HUMAN_INPUT"
  | "TRUTH_VIOLATION"
  | "BRAND_VOICE_VIOLATION";

export interface RefusalResult {
  refused: true;
  reason: RefusalReason;
  message: string;
  missingRequirements: string[];
}

// ==========================================
// 4. IP LAYER 4 — CREATIVE EXPRESSION
// ==========================================

export interface CreativeExpressionArtifact {
  artifactId: string;
  strategyId: string;
  headline: string;
  bodyCopy: string;
  hookText: string;
  visualConcept: string;
  callToAction: string;
  styleConfig: {
    tone: string;
    visualMood: string;
    layoutType: string;
    colorPalette?: string[];
  };
  platformFormat: string;
  generatedAt: string;
}

// ==========================================
// 5. IP LAYER 5 — CREATIVE EVALUATION
// ==========================================

export interface EvaluationResult {
  passed: boolean;
  score: number;
  details?: string;
}

export interface EvaluationViolation {
  code: string;
  severity: "BLOCKER" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  message: string;
}

export interface EvaluationRecommendation {
  suggestion: string;
  rationale: string;
}

export interface CreativeEvaluation {
  evaluationId: string;
  artifactId: string;
  truth: EvaluationResult;
  brand: EvaluationResult;
  quality: EvaluationResult;
  platform: EvaluationResult;
  cultural: EvaluationResult;
  overallStatus: "PASS" | "REVIEW" | "FAIL";
  violations: EvaluationViolation[];
  improvements: EvaluationRecommendation[];
  evaluatedAt: string;
}

// ==========================================
// 6. IP LAYER 6 — CREATIVE LEARNING
// ==========================================

export interface CreativeFingerprint {
  fingerprintId: string;
  campaignId: string;
  businessId: string;
  tenantId: string;
  strategyId: string;

  psychologyIds: string[];
  mechanismIds: string[];
  recipeIds: string[];

  storyPatternIds: string[];
  hookPatternIds: string[];
  visualPatternIds: string[];
  copyPatternIds: string[];

  offerFramingIds: string[];
  ctaPatternIds: string[];

  platform?: string;
  format?: string;

  createdAt: string;
}

export interface EvidenceReference {
  campaignId: string;
  metricName: string;
  metricValue: number;
  benchmarkValue: number;
  sampleSize: number;
}

export interface CreativeLearning {
  learningId: string;
  subjectType: "PSYCHOLOGY" | "MECHANISM" | "RECIPE" | "HOOK" | "STORY" | "VISUAL" | "CTA";
  subjectId: string;
  context: {
    industry?: string;
    objective?: string;
    audience?: string;
    platform?: string;
    location?: string;
  };
  observation: string;
  evidence: EvidenceReference[];
  confidence: number;
  status: "HYPOTHESIS" | "OBSERVED" | "SUPPORTED" | "VALIDATED" | "ESTABLISHED";
  createdAt: string;
}
