import type { ID, ISODateTime } from "./primitives";

export enum StrategicConfirmationState {
  NOT_CREATED = "NOT_CREATED",
  BUILDING = "BUILDING",
  REQUIRED = "REQUIRED",
  CONFIRMING = "CONFIRMING",
  CONFIRMED = "CONFIRMED",
  REVISION_REQUIRED = "REVISION_REQUIRED",
  EXPLORING = "EXPLORING",
  ALTERNATIVE_READY = "ALTERNATIVE_READY",
  STALE = "STALE",
  EXPIRED = "EXPIRED",
  REJECTED = "REJECTED",
}

export type StrategicConfirmationStatus = StrategicConfirmationState | string;

export type StrategyState =
  | "NOT_READY"
  | "READY"
  | "STALE"
  | "INVALID";

export type ConfirmationExecutionState =
  | "NOT_AUTHORIZED"
  | "AUTHORIZATION_PENDING"
  | "AUTHORIZED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED"
  | "UNKNOWN";

export type StrategicConfirmationDecision =
  | "CONFIRM"
  | "CHANGE"
  | "EXPLORE";

export type StrategicConfirmationDecisionType = StrategicConfirmationDecision;


export type StrategicRevisionType =
  | "AUDIENCE"
  | "SITUATION"
  | "OBJECTIVE"
  | "PRODUCT"
  | "OFFER"
  | "DIRECTION"
  | "ADDITIONAL_INFORMATION";

export interface StrategicConfirmationSummary {
  businessName: string;
  industry: string;
  productOrService: string;
  targetAudience: string;
  situation: string;
  marketingObjective: string;
}

export interface StrategicOpportunitySummary {
  opportunityTitle: string;
  whyNow: string;
  coreInsight: string;
}

export interface StrategicDirectionSummary {
  directionId: ID;
  variantId: ID;
  strategyType: string;
  strategyName: string;
  strategicPremise: string;
  targetDesireOrFear: string;
  creativeHookConcept: string;
  coreMechanismConcept: string;
  callToActionConcept: string;
  whyThisWorks: string[];
  whatWeAreDoing: string[];
  whatWeAreNotDoing: string[];
}

export interface StrategicAlternativeSummary {
  alternativeId: ID;
  strategyType: string;
  strategyName: string;
  strategicAngle: string;
  whyExploreThis: string;
  keyDifferenceFromRecommended: string;
}

export interface StrategicConfirmationExplanation {
  whyThisAudience: string;
  whyThisSituation: string;
  whyThisOpportunity: string;
  whyThisStrategy: string;
  tradeoffs: string[];
}

export interface StrategicConfirmationSource {
  opportunityId?: ID;
  recipeId?: ID;
  directionId: ID;
  variantId?: ID;
}

export interface StrategicConfirmation {
  confirmationId: ID;
  sessionId: ID;
  revision: number;
  strategyRevision: number;
  state: StrategicConfirmationState;
  status: StrategicConfirmationStatus;
  strategyState: StrategyState;
  executionState: ConfirmationExecutionState;
  summary: StrategicConfirmationSummary;
  opportunity: StrategicOpportunitySummary;
  recommendedDirection: StrategicDirectionSummary;
  alternatives: StrategicAlternativeSummary[];
  explanation: StrategicConfirmationExplanation;
  source?: StrategicConfirmationSource;
  confidence: string;
  policyVersions?: Array<{ entityName: string; version: number }>;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CreativeExplorationContext {
  sessionId: ID;
  exploredDirectionIds: ID[];
  exploredStrategyTypes: string[];
  explorationCount: number;
  lastExploredAt?: ISODateTime;
}

export interface StrategicConfirmationLearning {
  confirmationId: ID;
  decision: StrategicConfirmationDecisionType;
  selectedStrategyType: string;
  rejectedStrategyTypes: string[];
  revisionTypesUsed?: StrategicRevisionType[];
  explorationCount: number;
  timestamp: ISODateTime;
}

export interface ExecutionAuthorization {
  authorizationId: ID;
  sessionId: ID;
  confirmationId: ID;
  selectedVariantId: ID;
  selectedStrategyType: string;
  approvedDirectionSummary: StrategicDirectionSummary;
  authorizedAt: ISODateTime;
  expiresAt: ISODateTime;
  signature: string;
}

// Canonical Event Definitions
export type ConfirmationEvent =
  | { type: "BUILD" }
  | { type: "BUILD_SUCCEEDED" }
  | { type: "BUILD_FAILED"; failure: { code: string; message: string } }
  | { type: "CONFIRM" }
  | { type: "CONFIRM_SUCCEEDED" }
  | { type: "CONFIRM_FAILED"; failure: { code: string; message: string } }
  | { type: "REQUEST_CHANGE"; revisionType: StrategicRevisionType; changes?: unknown }
  | { type: "START_EXPLORATION" }
  | { type: "ALTERNATIVE_FOUND"; directionId: ID; strategyType: string }
  | { type: "NO_ALTERNATIVE_FOUND" }
  | { type: "EXPLORATION_FAILED"; failure: { code: string; message: string } }
  | { type: "USE_ALTERNATIVE"; directionId: ID }
  | { type: "GO_BACK" }
  | { type: "UPSTREAM_CHANGED"; newRevision: number }
  | { type: "EXPIRE" };

export interface ConfirmationTransitionContext {
  sessionId: ID;
  confirmationId?: ID;
  revision: number;
  actor: "SYSTEM" | "USER" | "WORKER";
  event: ConfirmationEvent;
  expectedState: StrategicConfirmationState;
  idempotencyKey?: string;
}

export interface InvalidConfirmationTransition {
  code: "INVALID_CONFIRMATION_TRANSITION";
  currentState: StrategicConfirmationState;
  requestedEvent: ConfirmationEvent["type"];
  reason: string;
  recoverable: boolean;
  recoveryAction: string;
}

export interface ConfirmationStateTransition {
  transitionId: ID;
  confirmationId: ID;
  sessionId: ID;
  revision: number;
  from: StrategicConfirmationState;
  event: string;
  to: StrategicConfirmationState;
  actor: "USER" | "SYSTEM" | "WORKER";
  operationId?: ID;
  createdAt: ISODateTime;
}
