import type { ID, ISODateTime, Score } from "./primitives";
import type { ConfidenceLevel, MarketingObjective } from "./enums";
import type { PlatformContext, FormatContext } from "./platforms";
import type { LocationContext } from "./location";
import type { AudienceContext, AudienceProfileReference } from "./audience";
import type { OfferContext } from "./offers";
import type { IndustryContext } from "./context";
import type { PerformanceSource } from "./memory";

/**
 * Phase 10.27 — Learning Scope Hierarchy
 */
export type LearningScope =
  | "GLOBAL"
  | "INDUSTRY"
  | "BUSINESS_TYPE"
  | "AUDIENCE"
  | "OBJECTIVE"
  | "OFFER_TYPE"
  | "PLATFORM"
  | "TENANT";

/**
 * Phase 10.27 — Learning Classification Types
 */
export type LearningType =
  | "PERFORMANCE_PATTERN"
  | "CONTEXT_PATTERN"
  | "AUDIENCE_PATTERN"
  | "OFFER_PATTERN"
  | "OBJECTIVE_PATTERN"
  | "PLATFORM_PATTERN"
  | "SEASONAL_PATTERN"
  | "FAILURE_PATTERN"
  | "COMBINATION_PATTERN";

/**
 * Phase 10.27 — Evidence Strength Level
 */
export type EvidenceStrength =
  | "WEAK"
  | "EMERGING"
  | "MODERATE"
  | "STRONG"
  | "VERY_STRONG";

/**
 * Phase 10.27 — Learning Lifecycle Status
 */
export type LearningLifecycleStatus =
  | "OBSERVED"
  | "EMERGING"
  | "VALIDATING"
  | "VALIDATED"
  | "DECAYING"
  | "REJECTED"
  | "ARCHIVED";

/**
 * Phase 10.27 — Creative Lineage Record
 * Preserves the exact creative intelligence lineage for every generated campaign.
 */
export interface CreativeLineage {
  lineageId: ID;
  campaignId: ID;
  tenantId: ID;
  businessId: ID;
  conceptId?: ID;
  blueprintId?: ID;
  recipeId?: ID;
  mechanismIds: ID[];
  psychologicalPrincipleIds: ID[];
  emotionalTerritory?: string;
  audienceId?: ID;
  audienceContext?: AudienceContext | AudienceProfileReference;
  audienceSituationId?: ID;
  objective: MarketingObjective;
  offerType?: string;
  offerContext?: OfferContext;
  executionFormat: FormatContext;
  platform: PlatformContext;
  templateId?: ID;
  industry: IndustryContext | string;
  location?: LocationContext;
  generatedAt: ISODateTime;
}

/**
 * Phase 10.27 — Normalized Platform-Neutral Performance Evidence
 */
export interface NormalizedPerformanceEvidence {
  evidenceId: ID;
  campaignId: ID;
  tenantId: ID;
  businessId: ID;
  creativeId?: ID;
  mechanismIds: ID[];
  platform: PlatformContext;
  format: FormatContext;
  objective: MarketingObjective;
  industry: IndustryContext | string;
  location?: LocationContext;
  audienceContext?: AudienceContext | AudienceProfileReference;
  offerContext?: OfferContext;

  // Raw counts (undefined !== 0 invariant)
  impressions?: number;
  reach?: number;
  engagements?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  leads?: number;
  conversions?: number;
  spend?: number;
  revenue?: number;

  // Calculated normalized rates
  engagementRate?: number;
  ctr?: number;
  conversionRate?: number;
  saveRate?: number;
  shareRate?: number;
  costPerLead?: number;
  costPerConversion?: number;
  revenuePerSpend?: number;

  source: PerformanceSource;
  collectedAt: ISODateTime;
  periodStart: ISODateTime;
  periodEnd: ISODateTime;
}

/**
 * Evidence Reference for Learning provenance
 */
export interface EvidenceReference {
  evidenceId: ID;
  campaignId: ID;
  tenantId?: ID;
  observedLift: number;
  metric: string;
  confidence: ConfidenceLevel;
  collectedAt: ISODateTime;
}

/**
 * Phase 10.27 — Formal Learning Object Model
 */
export interface CreativeLearning {
  learningId: ID;
  tenantId?: ID; // Undefined for GLOBAL learnings
  scope: LearningScope;
  mechanismId: ID;
  secondaryMechanismIds?: ID[];
  learningType: LearningType;
  observation: string;
  hypothesis: string;
  insight: string;
  recommendation: string;
  supportingEvidence: EvidenceReference[];
  sampleSize: number;
  confidenceScore: Score;
  evidenceStrength: EvidenceStrength;
  statisticalSignal?: number;
  repeatabilityScore?: Score;
  contextMatchScore?: Score;
  recencyScore?: Score;
  noveltyScore?: Score;
  relativeLift?: number;
  status: LearningLifecycleStatus;
  context: {
    industry?: IndustryContext | string;
    location?: LocationContext;
    objective?: MarketingObjective;
    platform?: PlatformContext;
    format?: FormatContext;
    audienceId?: ID;
    offerType?: string;
  };
  firstObservedAt: ISODateTime;
  lastObservedAt: ISODateTime;
  lastValidatedAt?: ISODateTime;
  expiresAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/**
 * Negative Intelligence (Failure Pattern) Model
 */
export interface FailureLearning {
  failureId: ID;
  tenantId?: ID;
  scope: LearningScope;
  mechanismId: ID;
  avoidContext: {
    industry?: IndustryContext | string;
    objective?: MarketingObjective;
    audienceId?: ID;
    positioning?: string;
  };
  observedNegativeOutcome: string;
  reason: string;
  recommendedAlternatives: ID[];
  confidenceScore: Score;
  evidenceCount: number;
  createdAt: ISODateTime;
}

/**
 * Combination Mechanism Learning Model
 */
export interface MechanismCombinationLearning {
  combinationId: ID;
  tenantId?: ID;
  scope: LearningScope;
  primaryMechanismId: ID;
  secondaryMechanismId: ID;
  combinedLift: number;
  individualLifts: Record<string, number>;
  synergyMultiplier: number;
  context: {
    industry?: IndustryContext | string;
    objective?: MarketingObjective;
    platform?: PlatformContext;
  };
  sampleSize: number;
  confidenceScore: Score;
  status: LearningLifecycleStatus;
  createdAt: ISODateTime;
}

/**
 * Creative Bank Learning Update Contract
 */
export interface CreativeBankLearningUpdate {
  updateId: ID;
  mechanismId: ID;
  learningId: ID;
  updateType:
    | "INCREASE_CONFIDENCE"
    | "DECREASE_CONFIDENCE"
    | "ADD_CONTEXT"
    | "ADD_COMBINATION"
    | "MARK_EFFECTIVE"
    | "MARK_WEAK"
    | "MARK_DECAYING"
    | "ARCHIVE";
  evidenceIds: ID[];
  confidenceDelta?: number;
  reason: string;
  generatedAt: ISODateTime;
}

/**
 * Ranked mechanism structure for Creative Brain context
 */
export interface RankedMechanism {
  mechanismId: ID;
  score: Score;
  confidence: ConfidenceLevel;
  evidenceCount: number;
  relativeLift: number;
  reason: string;
}

/**
 * Active Learning Experiment Suggestion
 */
export interface CreativeExperimentSuggestion {
  experimentId: ID;
  tenantId?: ID;
  hypothesis: string;
  targetMechanismA: ID;
  targetMechanismB: ID;
  context: {
    industry?: IndustryContext | string;
    objective?: MarketingObjective;
    platform?: PlatformContext;
  };
  rationale: string;
  expectedInsight: string;
  createdAt: ISODateTime;
}

/**
 * Warning for Creative Intelligence context
 */
export interface LearningContextWarning {
  warningId: ID;
  mechanismId: ID;
  severity: "LOW" | "MEDIUM" | "HIGH";
  message: string;
  context: string;
}

/**
 * Ranked Creative Intelligence Context for Creative Brain consumption
 */
export interface CreativeIntelligenceContext {
  relevantLearnings: CreativeLearning[];
  strongMechanisms: RankedMechanism[];
  weakMechanisms: RankedMechanism[];
  emergingMechanisms: RankedMechanism[];
  recommendedExperiments?: CreativeExperimentSuggestion[];
  contextualWarnings?: LearningContextWarning[];
}

/**
 * Operation log for Periodic Learning Run
 */
export interface LearningRun {
  runId: ID;
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
  campaignsAnalyzed: number;
  performanceRecordsAnalyzed: number;
  candidatesGenerated: number;
  learningsValidated: number;
  learningsUpdated: number;
  learningsDecayed: number;
  errors: Array<{ campaignId?: ID; message: string; timestamp: ISODateTime }>;
  status: "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED";
}
