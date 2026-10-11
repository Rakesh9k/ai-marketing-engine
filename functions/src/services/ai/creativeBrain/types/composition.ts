import type { ID } from "./primitives";
import type { ConfidenceLevel, MarketingObjective } from "./enums";
import type { BusinessContext } from "./business";
import type { AudienceSituationReference } from "./audience";
import type { OfferContext } from "./offers";
import type { ProductContext, CreativeContext, CreativeConstraints, CampaignStage } from "./context";
import type { PlatformContext, FormatContext } from "./platforms";
import type { CreativeDirection, CompositionCoherence, CreativeDirectionRationale } from "./directions";
import type { CreativeScore, CandidateEvaluation, SourceIntelligenceMap } from "./scoring";

import type {
  RecoveryMetadata,
  ClarificationQuestion,
  KnownContextSummary,
  MissingInformation,
  PossibleDirectionPreview,
  PartialCreativeDirection,
  RejectedCandidate,
  AlternativePath,
  CreativeConflict,
  ConflictResolutionOption,
  BlockingReason
} from "./recovery";

export interface CreativeCompositionInput {
  business: BusinessContext;
  marketingObjective: MarketingObjective;
  audienceSituation: AudienceSituationReference;
  offer?: OfferContext;
  product?: ProductContext;
  platform: PlatformContext;
  format: FormatContext;
  campaignStage: CampaignStage;
  context?: CreativeContext;
  constraints?: CreativeConstraints;
}

export interface CreativeWarning {
  code: string;
  message: string;
  severity: "INFO" | "WARNING";
  affectedComponent?: string;
  requiresUserAttention: boolean;
}

export interface CreativeCompositionSuccess {
  status: "SUCCESS";
  direction: CreativeDirection;
  score: CreativeScore;
  coherence: CompositionCoherence;
  confidence: ConfidenceLevel;
  rationale: CreativeDirectionRationale;
  sourceIntelligence: SourceIntelligenceMap;
  warnings: CreativeWarning[];
  recovery?: RecoveryMetadata;
  nextAction: "EXECUTE" | "USER_APPROVAL";
}

export interface CreativeCompositionClarification {
  status: "CLARIFICATION_REQUIRED";
  questions: ClarificationQuestion[];
  blockedDecisions: string[];
  knownContext: KnownContextSummary;
  missingInformation: MissingInformation[];
  possibleDirections?: PossibleDirectionPreview[];
  reason: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  recovery: RecoveryMetadata;
  nextAction: "ASK_USER";
}

export interface CreativeCompositionIncomplete {
  status: "INCOMPLETE";
  missingInformation: MissingInformation[];
  affectedComponents: string[];
  canProceedPartially: boolean;
  partialDirection?: PartialCreativeDirection;
  reason: string;
  recovery: RecoveryMetadata;
  nextAction: "ASK_USER" | "COMPLETE_CONTEXT" | "RETURN_TO_RETRIEVAL";
}

export interface CreativeCompositionNoDirection {
  status: "NO_VALID_DIRECTION";
  evaluatedCandidates: CandidateEvaluation[];
  rejectedCandidates: RejectedCandidate[];
  dominantReasons: string[];
  missingCapabilities?: string[];
  alternatives?: AlternativePath[];
  recovery: RecoveryMetadata;
  nextAction: "ASK_USER" | "CHANGE_OBJECTIVE" | "CHANGE_CONTEXT" | "RETURN_TO_RETRIEVAL";
}

export interface CreativeCompositionConflict {
  status: "CONFLICT";
  conflicts: CreativeConflict[];
  affectedComponents: string[];
  severity: "MEDIUM" | "HIGH" | "CRITICAL";
  resolutionOptions: ConflictResolutionOption[];
  recovery: RecoveryMetadata;
  nextAction: "ASK_USER" | "RESOLVE_UPSTREAM";
}

export interface CreativeCompositionBlocked {
  status: "BLOCKED";
  blockingReasons: BlockingReason[];
  direction?: CreativeDirection;
  blockedStage:
    | "RETRIEVAL"
    | "COMPOSITION"
    | "EXECUTION"
    | "PLATFORM"
    | "OFFER"
    | "CTA"
    | "ASSET"
    | "BUSINESS_CAPABILITY";
  recoverable: boolean;
  recovery: RecoveryMetadata;
  nextAction: "WAIT" | "FIX_DEPENDENCY" | "ASK_USER" | "USE_ALTERNATIVE";
}

export type CreativeCompositionErrorCode =
  | "COMPOSER_INVALID_INPUT"
  | "COMPOSER_CONTEXT_PARSE_FAILED"
  | "COMPOSER_RETRIEVAL_FAILED"
  | "COMPOSER_SCORING_FAILED"
  | "COMPOSER_COMBINATION_VALIDATION_FAILED"
  | "COMPOSER_COHERENCE_EVALUATION_FAILED"
  | "COMPOSER_ADAPTATION_FAILED"
  | "COMPOSER_POLICY_ERROR"
  | "COMPOSER_DEPENDENCY_UNAVAILABLE"
  | "COMPOSER_UNEXPECTED_ERROR";

export interface CreativeCompositionFailure {
  status: "FAILED";
  code: CreativeCompositionErrorCode;
  stage: string;
  message: string;
  recoverable: boolean;
  retryable: boolean;
  details?: Record<string, unknown>;
  correlationId?: ID;
  recovery: RecoveryMetadata;
  nextAction: "RETRY" | "ESCALATE" | "RETURN_ERROR";
}

export type CreativeCompositionResult =
  | CreativeCompositionSuccess
  | CreativeCompositionClarification
  | CreativeCompositionIncomplete
  | CreativeCompositionNoDirection
  | CreativeCompositionConflict
  | CreativeCompositionBlocked
  | CreativeCompositionFailure;
