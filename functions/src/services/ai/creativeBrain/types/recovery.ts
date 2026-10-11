import type { ID } from "./primitives";
import type { ConfidenceLevel, RecoveryActionType } from "./enums";
import type { CandidateType } from "./scoring";
import type { CoreIdea, AudienceDirection, SituationDirection, ObjectiveDirection, InsightDirection } from "./directions";
import type { PsychologyDirection } from "./psychology";
import type { MechanismDirection } from "./mechanisms";

export type InformationImportance = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface MissingInformation {
  field: string;
  description: string;
  importance: InformationImportance;
  affectsComponents: string[];
  canBeAsked: boolean;
  clarificationQuestion?: string;
}

export type BlockingSource =
  | "BUSINESS"
  | "OFFER"
  | "CTA"
  | "PLATFORM"
  | "ASSET"
  | "TRUTH"
  | "ETHICS"
  | "SYSTEM";

export interface BlockingReason {
  code: string;
  description: string;
  source: BlockingSource;
  severity: "HIGH" | "CRITICAL";
  resolvable: boolean;
  resolution?: string;
}

export interface RecoveryAction {
  id: ID;
  label: string;
  type: RecoveryActionType;
  description: string;
  safe: boolean;
}

export interface RecoveryMetadata {
  recoverable: boolean;
  retryable: boolean;
  userActionRequired: boolean;
  upstreamActionRequired: boolean;
  suggestedNextActions: RecoveryAction[];
  blockedComponents: string[];
  blockingFields: string[];
}

export interface ClarificationQuestion {
  id: ID;
  question: string;
  field: string;
  reason: string;
  importance: InformationImportance;
  options?: string[];
  recommendedAnswer?: string;
}

export interface KnownContextSummary {
  businessKnown: boolean;
  audienceKnown: boolean;
  situationKnown: boolean;
  objectiveKnown: boolean;
  productKnown: boolean;
  offerKnown: boolean;
  platformKnown: boolean;
  formatKnown: boolean;
  criticalUnknowns: MissingInformation[];
}

export interface PossibleDirectionPreview {
  opportunityId: ID;
  name: string;
  reasonItCouldFit: string;
  informationNeeded: MissingInformation[];
  confidence: ConfidenceLevel;
}

export interface PartialCreativeDirection {
  coreIdea?: CoreIdea;
  audience?: AudienceDirection;
  situation?: SituationDirection;
  objective?: ObjectiveDirection;
  insight?: InsightDirection;
  psychology?: PsychologyDirection;
  mechanism?: MechanismDirection;
  blockedComponents: string[];
  incompleteComponents: string[];
}

export interface RejectedCandidate {
  candidateId: ID;
  candidateType: CandidateType;
  reasons: Array<{ code: string; reason: string; severity: "HARD" | "SOFT"; source: string }>;
  potentiallyRecoverable: boolean;
  recoveryAction?: RecoveryAction;
}

export type AlternativePathType =
  | "DIFFERENT_OPPORTUNITY"
  | "DIFFERENT_OBJECTIVE"
  | "DIFFERENT_OFFER"
  | "ADDITIONAL_PROOF"
  | "DIFFERENT_CTA"
  | "ADDITIONAL_INFORMATION";

export interface AlternativePath {
  id: ID;
  type: AlternativePathType;
  description: string;
  requirements: string[];
  expectedImpact: string;
}

export type CreativeConflictType =
  | "BRAND"
  | "OBJECTIVE"
  | "AUDIENCE"
  | "OFFER"
  | "PSYCHOLOGY"
  | "MECHANISM"
  | "STYLE"
  | "PLATFORM"
  | "CTA"
  | "ETHICS"
  | "TRUTH"
  | "CAPABILITY";

export interface CreativeConflict {
  id: ID;
  source: string;
  conflictingWith: string;
  type: CreativeConflictType;
  explanation: string;
  resolutionRequired: boolean;
}

export interface ConflictResolutionOption {
  id: ID;
  label: string;
  description: string;
  affectedComponents: string[];
  consequence: string;
  requiresUserDecision: boolean;
}
