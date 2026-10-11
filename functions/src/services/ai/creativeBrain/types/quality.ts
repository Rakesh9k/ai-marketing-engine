import type { ID, ISODateTime, Score } from "./primitives";
import type { ConfidenceLevel } from "./enums";
import type { CreativeDirection } from "./directions";
import type { BusinessContext } from "./business";
import type { PlatformContext, FormatContext } from "./platforms";
import type { OfferContext } from "./offers";
import type { CreativeConstraints } from "./context";
import type { CreativeAssetPlan, CreativeCopyPlan, CreativeAsset } from "./assetPlan";
import type { FinalCreativeGovernanceResult } from "./governance";

/**
 * Phase 10.24 — 12 Canonical Quality Dimensions
 */
export enum CreativeQualityDimension {
  STRATEGIC_FIT = "STRATEGIC_FIT",
  AUDIENCE_RELEVANCE = "AUDIENCE_RELEVANCE",
  CLARITY = "CLARITY",
  ATTENTION = "ATTENTION",
  EMOTIONAL_RESONANCE = "EMOTIONAL_RESONANCE",
  DIFFERENTIATION = "DIFFERENTIATION",
  BRAND_FIT = "BRAND_FIT",
  OFFER_CLARITY = "OFFER_CLARITY",
  CTA_STRENGTH = "CTA_STRENGTH",
  VISUAL_HIERARCHY = "VISUAL_HIERARCHY",
  PLATFORM_FIT = "PLATFORM_FIT",
  TRUTHFULNESS = "TRUTHFULNESS",
}

/**
 * Phase 10.24 — Quality Status
 */
export enum CreativeQualityStatus {
  NOT_EVALUATED = "NOT_EVALUATED",
  EVALUATING = "EVALUATING",
  PASS = "PASS",
  NEEDS_IMPROVEMENT = "NEEDS_IMPROVEMENT",
  REGENERATION_RECOMMENDED = "REGENERATION_RECOMMENDED",
  BLOCKED = "BLOCKED",
  STALE = "STALE",
  FAILED = "FAILED",
}

/**
 * Phase 10.24 — Quality State Machine States
 */
export enum CreativeQualityState {
  NOT_EVALUATED = "NOT_EVALUATED",
  EVALUATING = "EVALUATING",
  EVALUATED = "EVALUATED",
  NEEDS_IMPROVEMENT = "NEEDS_IMPROVEMENT",
  REPAIR_PLANNED = "REPAIR_PLANNED",
  REPAIRING = "REPAIRING",
  REVALIDATING = "REVALIDATING",
  PASSED = "PASSED",
  REGRESSED = "REGRESSED",
  MAX_ITERATIONS_REACHED = "MAX_ITERATIONS_REACHED",
  BLOCKED_BY_GOVERNANCE = "BLOCKED_BY_GOVERNANCE",
  STALE = "STALE",
  FAILED = "FAILED",
}

/**
 * Phase 10.24 — Creative Components for Selective Repair
 */
export enum CreativeComponent {
  STRATEGY = "STRATEGY",
  CORE_IDEA = "CORE_IDEA",
  HEADLINE = "HEADLINE",
  SUPPORTING_COPY = "SUPPORTING_COPY",
  OFFER_COPY = "OFFER_COPY",
  CTA = "CTA",
  HOOK = "HOOK",
  STORY_STRUCTURE = "STORY_STRUCTURE",
  VISUAL_DIRECTION = "VISUAL_DIRECTION",
  HERO_ASSET = "HERO_ASSET",
  CONTEXT_ASSET = "CONTEXT_ASSET",
  PRODUCT_ASSET = "PRODUCT_ASSET",
  COMPOSITION = "COMPOSITION",
  TYPOGRAPHY = "TYPOGRAPHY",
  STYLE = "STYLE",
  COLOR = "COLOR",
  MOTION = "MOTION",
  PLATFORM_EXPRESSION = "PLATFORM_EXPRESSION",
}

/**
 * Evidence supporting a quality evaluation observation
 */
export interface QualityEvidence {
  source:
    | "STRATEGY"
    | "AUDIENCE"
    | "CREATIVE_DIRECTION"
    | "COPY"
    | "ASSET"
    | "COMPOSITION"
    | "PLATFORM"
    | "BRAND"
    | "TRUTH_CHECK"
    | "SAFETY_CHECK"
    | "PERFORMANCE_DATA";
  referenceId?: ID;
  observation: string;
  impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
}

/**
 * Quality Repair Strategy recommendation
 */
export interface QualityRepairStrategy {
  strategyId: ID;
  recommendedAction: string;
  targetComponents: CreativeComponent[];
  expectedImpact: CreativeQualityDimension[];
  estimatedEffort: "LOW" | "MEDIUM" | "HIGH";
}

/**
 * Score artifact for an individual Quality Dimension
 */
export interface CreativeQualityScore {
  dimension: CreativeQualityDimension;
  score: Score; // 0–100
  confidence: ConfidenceLevel;
  evidence: QualityEvidence[];
  strengths: string[];
  weaknesses: string[];
  repairability: "EASY" | "MODERATE" | "HARD" | "NOT_REPAIRABLE";
  repairStrategy?: QualityRepairStrategy;
  policyVersion: string;
}

/**
 * Quality Weakness artifact for diagnosis
 */
export interface QualityWeakness {
  id: ID;
  dimension: CreativeQualityDimension;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  observation: string;
  cause?: string;
  evidence: QualityEvidence[];
  repairable: boolean;
  affectedComponents: CreativeComponent[];
}

/**
 * Strength artifact for diagnosis
 */
export interface QualityStrength {
  id: ID;
  dimension: CreativeQualityDimension;
  observation: string;
  evidence: QualityEvidence[];
}

/**
 * Single repair action item in a Repair Plan
 */
export interface CreativeRepairAction {
  actionId: ID;
  targetComponent: CreativeComponent;
  issueDescription: string;
  repairInstruction: string;
  preserveSurroundingContext: boolean;
}

/**
 * Selective Creative Repair Plan
 */
export interface CreativeRepairPlan {
  repairPlanId: ID;
  issues: CreativeRepairAction[];
  preservedComponents: CreativeComponent[];
  regenerationScope:
    | "COMPONENT"
    | "MULTIPLE_COMPONENTS"
    | "FULL_CREATIVE"
    | "RETURN_TO_STRATEGY";
  reason: string;
  expectedImpact: CreativeQualityDimension[];
  policyVersion: string;
}

/**
 * Regression analysis artifact comparing prior vs new evaluations
 */
export interface QualityRegression {
  dimension: CreativeQualityDimension;
  previousScore: Score;
  newScore: Score;
  delta: number;
  acceptable: boolean;
  reason: string;
}

/**
 * Quality comparison report between two iterations
 */
export interface QualityComparison {
  previousEvaluationId: ID;
  newEvaluationId: ID;
  overallDelta: number;
  regressions: QualityRegression[];
  improvements: { dimension: CreativeQualityDimension; delta: number }[];
  acceptable: boolean;
  decision: "ACCEPT_REPAIR" | "REJECT_REPAIR" | "REQUIRES_FURTHER_ITERATION";
  reason: string;
}

/**
 * Quality Weight Rule for Contextual Policy
 */
export interface QualityWeightRule {
  ruleId: ID;
  name: string;
  condition: {
    industry?: string;
    objective?: string;
    platform?: string;
  };
  weights: Partial<Record<CreativeQualityDimension, number>>;
}

/**
 * Versioned Quality Scoring & Policy Artifact
 */
export interface CreativeQualityPolicy {
  policyVersion: string;
  defaultWeights: Record<CreativeQualityDimension, number>;
  contextualWeightRules: QualityWeightRule[];
  minimumScores: Partial<Record<CreativeQualityDimension, Score>>;
  hardGates: CreativeQualityDimension[];
  overallThreshold: Score;
}

/**
 * Quality Acceptance Criteria Policy
 */
export interface QualityAcceptancePolicy {
  publishThreshold: Score;
  minimumDimensionScores: Partial<Record<CreativeQualityDimension, Score>>;
  requiredGovernanceStatus: "PASS";
  maxRepairIterations: number;
}

/**
 * Iteration Control Policy
 */
export interface QualityIterationPolicy {
  maxIterations: number;
  maxComponentRepairs: number;
  minimumImprovement: number;
  maxRegression: number;
  stopAfterNoImprovement: number;
}

/**
 * Standardized Final Creative input structure for Quality Evaluator
 */
export interface FinalCreative {
  creativeVersionId: ID;
  sessionId: ID;
  revision: number;
  strategyId: ID;
  confirmationId: ID;
  assetPlanId?: ID;
  copy: CreativeCopyPlan;
  assets: CreativeAsset[];
  assetPlan?: CreativeAssetPlan;
  visualStyleName?: string;
  createdAt: ISODateTime;
}

/**
 * Full Quality Evaluation Result
 */
export interface CreativeQualityEvaluation {
  evaluationId: ID;
  tenantId?: ID;
  businessId: ID;
  sessionId: ID;
  revision: number;
  strategyId: ID;
  creativeVersionId: ID;
  dimensions: CreativeQualityScore[];
  overallScore: Score;
  status: CreativeQualityStatus;
  strengths: QualityStrength[];
  weaknesses: QualityWeakness[];
  repairPlan?: CreativeRepairPlan;
  policyVersion: string;
  evaluatedAt: ISODateTime;
}

/**
 * Input to Quality Evaluator
 */
export interface CreativeQualityEvaluationInput {
  tenantId?: ID;
  businessId: ID;
  sessionId: ID;
  revision: number;
  strategyId: ID;
  confirmationId: ID;
  creativeVersionId: ID;
  strategy: CreativeDirection;
  creative: FinalCreative;
  assetPlan?: CreativeAssetPlan;
  governance: FinalCreativeGovernanceResult;
  platform: PlatformContext;
  format: FormatContext;
  business: BusinessContext;
  audience?: any;
  offer?: OfferContext;
  constraints?: CreativeConstraints;
}

/**
 * Diagnostic Analysis Output
 */
export interface CreativeQualityDiagnosis {
  evaluationId: ID;
  overallStatus: CreativeQualityStatus;
  primaryWeaknesses: QualityWeakness[];
  repairable: boolean;
  recommendedScope: "COMPONENT" | "MULTIPLE_COMPONENTS" | "FULL_CREATIVE" | "RETURN_TO_STRATEGY";
  diagnosisSummary: string;
}

/**
 * Selective Quality Repair Input
 */
export interface CreativeQualityRepairInput {
  tenantId?: ID;
  businessId: ID;
  sessionId: ID;
  revision: number;
  currentEvaluation: CreativeQualityEvaluation;
  repairPlan: CreativeRepairPlan;
  currentCreative: FinalCreative;
  strategy: CreativeDirection;
  governance: FinalCreativeGovernanceResult;
  platform: PlatformContext;
  format: FormatContext;
  business: BusinessContext;
  offer?: OfferContext;
  iterationCount: number;
}

/**
 * Selective Quality Repair Result
 */
export interface CreativeQualityRepairResult {
  status: "SUCCESS" | "REJECTED_REGRESSION" | "MAX_ITERATIONS_REACHED" | "FAILED";
  repairedCreative?: FinalCreative;
  newEvaluation?: CreativeQualityEvaluation;
  comparison?: QualityComparison;
  iterationCount: number;
  explanation: string;
}

/**
 * Performance Traceability Container
 */
export interface CreativeQualityLearning {
  evaluationId: ID;
  creativeVersionId: ID;
  predictedScore: CreativeQualityEvaluation;
  performanceSignals?: any[];
  observedOutcome?: {
    engagement: number;
    conversion?: number;
    retention?: number;
    clickThroughRate?: number;
    otherMetrics?: Record<string, number>;
  };
  dimensionCorrelations?: Record<CreativeQualityDimension, number>;
}
