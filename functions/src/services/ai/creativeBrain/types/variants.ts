import type { ID, Version, ISODateTime, Score } from "./primitives";
import type { ConfidenceLevel, IntelligenceStatus, MarketingObjective } from "./enums";
import type { EvidenceReference } from "./evidence";
import type { Assumption } from "./assumptions";
import type { CreativeContext, CreativeConstraints } from "./context";
import type { CreativeDirection } from "./directions";
import type { CreativeWarning } from "./validation";
import type { RecoveryMetadata, ClarificationQuestion, MissingInformation, RejectedCandidate, BlockingReason } from "./recovery";
import type { PsychologyReference } from "./psychology";
import type { CreativeMechanismReference } from "./mechanisms";
import type { PerformanceSignal, ConfidenceChange, CreativeOutcome } from "./learning";

export type CreativeVariantStrategy =
  | "EMOTIONAL"
  | "RATIONAL"
  | "CURIOSITY"
  | "CONVENIENCE"
  | "VALUE"
  | "IDENTITY"
  | "TRUST"
  | "PROOF"
  | "TRANSFORMATION"
  | "DISCOVERY"
  | "SOCIAL"
  | "LOCAL"
  | "EDUCATIONAL"
  | "ASPIRATIONAL"
  | "RISK_REDUCTION"
  | "EXPERIENCE"
  | "URGENCY";

export type CreativeVariantStatus =
  | "DRAFT"
  | "PROPOSED"
  | "VALIDATED"
  | "SELECTED"
  | "REJECTED"
  | "EXECUTED"
  | "TESTED"
  | "SUPERSEDED";

export type VariantDimension =
  | "AUDIENCE_FRAME"
  | "MOTIVATION"
  | "TENSION"
  | "INSIGHT"
  | "PSYCHOLOGY"
  | "MECHANISM"
  | "HOOK"
  | "STORY"
  | "VISUAL"
  | "COPY"
  | "OFFER_FRAMING"
  | "VALUE_FRAMING"
  | "EMOTIONAL_TERRITORY"
  | "STYLE"
  | "CTA"
  | "PLATFORM_EXPRESSION";

export interface VariantDifferentiation {
  primaryDifference: string;
  changedDimensions: VariantDimension[];
  preservedDimensions: VariantDimension[];
  strategicHypothesis: string;
  audienceReasonForDifference: string;
  expectedBehavioralDifference: string;
  whyNotDuplicate: string;
}

export interface CreativeVariantScore {
  contextFit: Score;
  strategicFit: Score;
  audienceFit: Score;
  objectiveFit: Score;
  differentiation: Score;
  componentCoherence: Score;
  evidenceFit: Score;
  executionFeasibility: Score;
  ethicalSafety: Score;
  conflictPenalty: number;
  riskPenalty: number;
  finalScore: Score;
  scorePolicyVersion: Version;
  explanation: string;
}

export interface VariantDistinctiveness {
  similarityScore: Score;
  strategicDifferenceScore: Score;
  meaningfulDifference: boolean;
  duplicatedDimensions: VariantDimension[];
  differentiatedDimensions: VariantDimension[];
  explanation: string;
}

export interface CreativeVariant {
  id: ID;
  version: Version;
  name: string;
  label: string;
  strategy: CreativeVariantStrategy;
  strategicRole: string;
  direction: CreativeDirection;
  differentiation: VariantDifferentiation;
  score: CreativeVariantScore;
  confidence: ConfidenceLevel;
  evidence: EvidenceReference[];
  assumptions: Assumption[];
  risks: string[];
  status: CreativeVariantStatus;
  sourceDirectionId: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface VariantSelectionPolicy {
  requestedCount: number;
  minimumCount: number;
  maximumCount: number;
  requireStrategicDifference: boolean;
  minimumDistinctivenessScore: Score;
  allowSamePsychology: boolean;
  allowSameMechanism: boolean;
  allowSameStory: boolean;
  allowSameStyle: boolean;
  policyVersion: Version;
  preferredStrategies?: CreativeVariantStrategy[];
}

export interface VariantSetDiversity {
  pairwiseSimilarity: Record<string, Score>;
  averageStrategicDifference: Score;
  strategyCoverage: CreativeVariantStrategy[];
  dimensionCoverage: VariantDimension[];
  redundantPairs: Array<{
    variantA: ID;
    variantB: ID;
    reason: string;
  }>;
  diversityScore: Score;
  explanation: string;
}

export interface CreativeVariantSet {
  id: ID;
  version: Version;
  sourceDirectionId: ID;
  objective: MarketingObjective;
  variants: CreativeVariant[];
  diversity: VariantSetDiversity;
  selectionPolicy: VariantSelectionPolicy;
  confidence: ConfidenceLevel;
  status: "DRAFT" | "VALIDATED" | "READY" | "PARTIALLY_VALID" | "FAILED";
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CreativeVariantGenerationInput {
  direction: CreativeDirection;
  context: CreativeContext;
  requestedCount?: number;
  preferredStrategies?: CreativeVariantStrategy[];
  excludedStrategies?: CreativeVariantStrategy[];
  constraints?: CreativeConstraints;
  policy?: VariantSelectionPolicy;
}

export interface CreativeVariantGenerationSuccess {
  status: "SUCCESS";
  variantSet: CreativeVariantSet;
  warnings: CreativeWarning[];
  recovery?: RecoveryMetadata;
  nextAction: "EXECUTE" | "USER_SELECT" | "USER_APPROVAL";
}

export interface CreativeVariantGenerationClarification {
  status: "CLARIFICATION_REQUIRED";
  questions: ClarificationQuestion[];
  reason: string;
  affectedStrategies: CreativeVariantStrategy[];
  recovery: RecoveryMetadata;
  nextAction: "ASK_USER";
}

export interface CreativeVariantGenerationIncomplete {
  status: "INCOMPLETE";
  missingInformation: MissingInformation[];
  affectedVariants: CreativeVariantStrategy[];
  partialVariants?: CreativeVariant[];
  reason: string;
  recovery: RecoveryMetadata;
  nextAction: "ASK_USER" | "COMPLETE_CONTEXT" | "RETURN_TO_COMPOSITION";
}

export interface CreativeVariantGenerationNoDiversity {
  status: "NO_DIVERSITY";
  validVariants: CreativeVariant[];
  rejectedCandidates: RejectedCandidate[];
  reason: string;
  missingStrategicDimensions: VariantDimension[];
  recovery: RecoveryMetadata;
  nextAction: "USE_AVAILABLE_VARIANTS" | "ASK_USER" | "CHANGE_CONTEXT";
}

export interface CreativeVariantGenerationBlocked {
  status: "BLOCKED";
  blockingReasons: BlockingReason[];
  validVariants?: CreativeVariant[];
  recovery: RecoveryMetadata;
  nextAction: "FIX_DEPENDENCY" | "ASK_USER" | "USE_AVAILABLE_VARIANTS";
}

export type CreativeVariantGenerationErrorCode =
  | "VARIANT_INVALID_INPUT"
  | "VARIANT_STRATEGY_GENERATION_FAILED"
  | "VARIANT_SCORING_FAILED"
  | "VARIANT_DISTINCTIVENESS_FAILED"
  | "VARIANT_VALIDATION_FAILED"
  | "VARIANT_POLICY_ERROR"
  | "VARIANT_DEPENDENCY_UNAVAILABLE"
  | "VARIANT_UNEXPECTED_ERROR";

export interface CreativeVariantGenerationFailure {
  status: "FAILED";
  code: CreativeVariantGenerationErrorCode;
  message: string;
  recoverable: boolean;
  retryable: boolean;
  details?: Record<string, unknown>;
  correlationId?: ID;
  recovery: RecoveryMetadata;
  nextAction: "RETRY" | "ESCALATE" | "RETURN_ERROR";
}

export type CreativeVariantGenerationResult =
  | CreativeVariantGenerationSuccess
  | CreativeVariantGenerationClarification
  | CreativeVariantGenerationIncomplete
  | CreativeVariantGenerationNoDiversity
  | CreativeVariantGenerationBlocked
  | CreativeVariantGenerationFailure;

export interface CreativeVariantStrategyReference {
  id: ID;
  strategy: CreativeVariantStrategy;
  name: string;
  definition: string;
  strategicPurpose: string;
  bestFor: MarketingObjective[];
  compatibleSituations: ID[];
  preferredPsychologyIds: ID[];
  preferredMechanismIds: ID[];
  preferredHookPatternIds: ID[];
  preferredStoryStructureIds: ID[];
  preferredVisualStructureIds: ID[];
  preferredCopyStructureIds: ID[];
  preferredStyleIds: ID[];
  compatibleOfferTypes?: ID[];
  risks: string[];
  antiPatterns: string[];
  ethicalBoundaries: string[];
  evidence: EvidenceReference[];
  confidence: ConfidenceLevel;
  status: IntelligenceStatus;
}

export interface VariantStrategicFrame {
  strategy: CreativeVariantStrategy;
  centralMotivation: string;
  audienceTension: string;
  desiredAudienceShift: string;
  marketingPromise: string;
  psychologicalEntry: PsychologyReference[];
  mechanism: CreativeMechanismReference;
  strategicHypothesis: string;
  expectedBehavior: string;
  evidence: EvidenceReference[];
  confidence: ConfidenceLevel;
}

export interface VariantSelection {
  variantId: ID;
  selectedAt: ISODateTime;
  selectedBy: "USER" | "SYSTEM";
  reason?: string;
}

export interface CreativeVariantLearning {
  variantId: ID;
  variantStrategy: CreativeVariantStrategy;
  context: CreativeContext;
  selected: boolean;
  executed: boolean;
  outcome: CreativeOutcome;
  performanceSignals: PerformanceSignal[];
  qualitativeFeedback: string[];
  comparisonGroup?: string;
  explanationHypothesis?: string;
  alternativeExplanations: string[];
  confidenceChange?: ConfidenceChange;
}

export interface CreativeVariantExplanation {
  variantId: ID;
  strategy: CreativeVariantStrategy;
  whyThisVariant: string;
  whatChanged: string[];
  whatStayedConstant: string[];
  audienceReason: string;
  psychologicalReason: string;
  marketingReason: string;
  expectedBehavior: string;
  tradeoffs: string[];
  confidence: ConfidenceLevel;
  evidence: EvidenceReference[];
}

export interface CreativeVariantComparison {
  variants: ID[];
  comparisonDimensions: VariantDimension[];
  differences: Array<{
    dimension: VariantDimension;
    values: Record<ID, string>;
  }>;
  sharedElements: string[];
  strategicTradeoffs: Array<{
    variantId: ID;
    strengths: string[];
    weaknesses: string[];
  }>;
  recommendation?: ID;
  recommendationReason?: string;
  confidence: ConfidenceLevel;
}

export interface RecipeVariantStrategySupport {
  preferredStrategies: CreativeVariantStrategy[];
  compatibleStrategies: CreativeVariantStrategy[];
  avoidStrategies: CreativeVariantStrategy[];
  forbiddenStrategies: CreativeVariantStrategy[];
}
