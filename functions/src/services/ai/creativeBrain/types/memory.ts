import type { ID, ISODateTime, Score } from "./primitives";
import type { ConfidenceLevel, MarketingObjective } from "./enums";
import type { PlatformContext, FormatContext } from "./platforms";
import type { BusinessContext } from "./business";
import type { LocationContext } from "./location";
import type { AudienceContext, AudienceProfileReference, AudienceSituationReference } from "./audience";
import type { CampaignStage, IndustryContext } from "./context";

export type PerformanceSource = "PLATFORM_API" | "MANUAL_ENTRY" | "IMPORT" | "SYNTHETIC";



/**
 * Phase 10.26 — Learning Relationship Classifications
 */
export type LearningRelationship =
  | "ASSOCIATED"
  | "CORRELATED"
  | "EXPERIMENTALLY_SUPPORTED"
  | "CAUSALLY_SUPPORTED";

/**
 * Phase 10.26 — Performance Learning Lifecycle States
 */
export enum PerformanceLearningState {
  NOT_STARTED = "NOT_STARTED",
  COLLECTING = "COLLECTING",
  NORMALIZING = "NORMALIZING",
  ATTRIBUTING = "ATTRIBUTING",
  ANALYZING = "ANALYZING",
  LEARNING = "LEARNING",
  MEMORY_UPDATED = "MEMORY_UPDATED",
  BANK_CANDIDATE_CREATED = "BANK_CANDIDATE_CREATED",
  COMPLETE = "COMPLETE",
  PARTIAL = "PARTIAL",
  FAILED = "FAILED",
}

/**
 * Measurement Window specification
 */
export interface MeasurementWindow {
  start: ISODateTime;
  end: ISODateTime;
  durationHours: number;
}

/**
 * Deterministically computed derived performance metric
 */
export interface DerivedPerformanceMetric {
  metric: string;
  value: number;
  formulaVersion: string;
}

/**
 * Raw and Derived Performance Metrics container.
 * Invariant: undefined !== 0. Missing metrics are kept undefined.
 */
export interface CreativePerformanceMetrics {
  impressions?: number;
  views?: number;
  threeSecondViews?: number;
  watchTimeSeconds?: number;
  completionCount?: number;
  saves?: number;
  shares?: number;
  clicks?: number;
  whatsappConversations?: number;
  leads?: number;
  bookings?: number;
  conversions?: number;
  revenue?: number;
  derived: DerivedPerformanceMetric[];
  measurementWindow: MeasurementWindow;
}

/**
 * Relative performance against contextual benchmark
 */
export interface RelativePerformance {
  metric: string;
  observedValue: number;
  benchmarkValue: number;
  percentile?: number;
  relativeLift: number;
  benchmarkGroup: string;
  confidence: ConfidenceLevel;
}

/**
 * Layer 1 — Canonical Immutable Creative Performance Evidence Record
 */
export interface CreativePerformance {
  performanceId: ID;
  tenantId: ID;
  businessId: ID;
  creativeId: ID;
  creativeVersionId: ID;
  campaignId?: ID;
  recipeId?: ID;
  mechanismIds: ID[];
  psychologyIds: ID[];
  hookId?: ID;
  storyId?: ID;
  visualId?: ID;
  styleId?: ID;
  offerMechanismId?: ID;
  ctaId?: ID;
  industry: IndustryContext | string;

  location?: LocationContext;
  audience?: AudienceContext | AudienceProfileReference;
  audienceSituation?: AudienceSituationReference;
  platform: PlatformContext;
  format: FormatContext;
  objective: MarketingObjective;
  metrics: CreativePerformanceMetrics;
  performanceScore?: Score;
  relativePerformance?: RelativePerformance[];
  evidenceQuality?: {
    completeness: Score;
    consistency: Score;
    freshness: Score;
    sourceReliability: Score;
    overall: Score;
    warnings: string[];
  };
  learningConfidence: ConfidenceLevel;
  measurementWindow: MeasurementWindow;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/**
 * Context container for memory interpretation
 */
export interface CreativeMemoryContext {
  industry?: IndustryContext | string;

  location?: LocationContext;
  audience?: AudienceContext | AudienceProfileReference;
  audienceSituation?: AudienceSituationReference;
  objective?: MarketingObjective;
  platform?: PlatformContext;
  format?: FormatContext;
  mechanismIds?: ID[];
  psychologyIds?: ID[];
  recipeIds?: ID[];
  offerMechanismIds?: ID[];
  campaignStage?: CampaignStage;
  seasonality?: string;
  conditions?: string[];
}

/**
 * Performance Evidence item attached to a memory
 */
export interface PerformanceEvidence {
  evidenceId: ID;
  creativeId: ID;
  performanceId: ID;
  source: PerformanceSource;
  metric: string;
  observedResult: number;
  benchmark?: number;
  relativeLift?: number;
  relationship: LearningRelationship;
  confidence: ConfidenceLevel;
  context: CreativeMemoryContext;
  createdAt: ISODateTime;
}

/**
 * Generalization scores across dimensions
 */
export interface LearningGeneralization {
  businessDiversity: number;
  audienceDiversity: number;
  locationDiversity: number;
  platformDiversity: number;
  campaignDiversity: number;
  overall: Score;
}

/**
 * Layer 2 — Creative Memory Interpretation Record
 */
export interface CreativeMemory {
  memoryId: ID;
  tenantId?: ID;
  subjectType:
    | "RECIPE"
    | "MECHANISM"
    | "PSYCHOLOGY"
    | "HOOK"
    | "STORY"
    | "VISUAL"
    | "STYLE"
    | "OFFER_MECHANISM"
    | "CTA"
    | "COMBINATION";
  subjectIds: ID[];
  context: CreativeMemoryContext;
  observation: string;
  performanceEvidence: PerformanceEvidence[];
  relationship: LearningRelationship;
  confidence: ConfidenceLevel;
  generalization: LearningGeneralization;
  status: "HYPOTHESIS" | "ACTIVE" | "DEPRECATED" | "INVALIDATED";
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/**
 * Candidate for potential promotion to Creative Bank
 */
export interface CreativeLearningCandidate {
  learningId: ID;
  statement: string;
  subjectType: string;
  subjectIds: ID[];
  context: CreativeMemoryContext;
  evidence: PerformanceEvidence[];
  confidence: ConfidenceLevel;
  relationship: LearningRelationship;
  status: "CANDIDATE" | "REVIEW" | "ACCEPTED" | "REJECTED" | "SUPERSEDED";
  createdAt: ISODateTime;
}

/**
 * Signal extracted from historical memory for retrieval & ranking
 */
export interface HistoricalPerformanceSignal {
  componentId: ID;
  metric: string;
  contextualLift: number;
  evidenceCount: number;
  confidence: ConfidenceLevel;
  generalization: LearningGeneralization;
  recency: Score;
}

/**
 * Contextual score output for ranking integration
 */
export interface ContextualPerformanceScore {
  componentId: ID;
  contextMatch: Score;
  historicalLift: Score;
  evidenceStrength: Score;
  generalization: Score;
  recency: Score;
  finalSignal: Score;
}

/**
 * Novelty and creative fatigue signal
 */
export interface CreativeNoveltySignal {
  componentId: ID;
  repetitionCount: number;
  recentUseCount: number;
  performanceDecay?: Score;
  noveltyScore: Score;
}

/**
 * Query for retrieving relevant historical memories
 */
export interface CreativeMemoryQuery {
  industry?: IndustryContext | string;

  audience?: AudienceProfileReference;
  audienceSituation?: AudienceSituationReference;
  location?: LocationContext;
  objective?: MarketingObjective;
  platform?: PlatformContext;
  format?: FormatContext;
  mechanismIds?: ID[];
  psychologyIds?: ID[];
  recipeIds?: ID[];
  minimumConfidence?: ConfidenceLevel;
  includeNegativeEvidence?: boolean;
}

/**
 * Individual memory score during retrieval
 */
export interface CreativeMemoryScore {
  relevance: Score;
  evidenceStrength: Score;
  contextualSimilarity: Score;
  generalization: Score;
  recency: Score;
  reliability: Score;
  finalScore: Score;
}

/**
 * Natural language / structured explanation for memory retrieval
 */
export interface CreativeMemoryExplanation {
  memoryId: ID;
  conclusion: string;
  supportingEvidence: PerformanceEvidence[];
  context: CreativeMemoryContext;
  confidence: ConfidenceLevel;
  limitations: string[];
  recommendation?: string;
}

/**
 * Memory query result item
 */
export interface CreativeMemoryResult {
  memory: CreativeMemory;
  score: CreativeMemoryScore;
  explanation: CreativeMemoryExplanation;
}

/**
 * Objective-specific performance policy
 */
export interface PerformanceObjectivePolicy {
  objective: MarketingObjective;
  primaryMetrics: { metric: string; weight: number }[];
  secondaryMetrics: { metric: string; weight: number }[];
  diagnosticMetrics: { metric: string; weight: number }[];
}

/**
 * Ingestion input structure
 */
export interface PerformanceIngestionInput {
  tenantId: ID;
  businessId: ID;
  creativeId: ID;
  creativeVersionId: ID;
  campaignId?: ID;
  platform: PlatformContext;
  format: FormatContext;
  objective: MarketingObjective;
  business: BusinessContext;
  attribution: {
    recipeId?: ID;
    mechanismIds: ID[];
    psychologyIds: ID[];
    hookId?: ID;
    storyId?: ID;
    visualId?: ID;
    styleId?: ID;
    offerMechanismId?: ID;
    ctaId?: ID;
  };
  metrics: {
    impressions?: number;
    views?: number;
    threeSecondViews?: number;
    watchTimeSeconds?: number;
    completionCount?: number;
    saves?: number;
    shares?: number;
    clicks?: number;
    whatsappConversations?: number;
    leads?: number;
    bookings?: number;
    conversions?: number;
    revenue?: number;
  };
  measurementWindow: MeasurementWindow;
  source: PerformanceSource;
}
