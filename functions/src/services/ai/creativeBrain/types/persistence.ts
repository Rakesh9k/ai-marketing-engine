import type { ID, ISODateTime, Version } from "./primitives";
import type { OrchestratorStatus, CreativeBrainSession } from "./orchestration";
import type {
  StrategicConfirmationState,
  StrategyState,
  ConfirmationExecutionState,
  StrategicConfirmationSummary,
  StrategicOpportunitySummary,
  StrategicDirectionSummary,
  StrategicAlternativeSummary,
  StrategicConfirmationExplanation,
  StrategicConfirmationStatus,
  StrategicConfirmationDecision,
} from "./confirmation";
import type { CreativeOpportunity } from "./opportunity";
import type { CreativeMechanismReference } from "./mechanisms";
import type { PsychologyReference } from "./psychology";

export interface PolicyVersionSnapshot {
  entityName: string;
  version: Version;
}

export interface StrategicConfirmationSourceDocument {
  opportunityId?: ID;
  directionId: ID;
  variantId?: ID;
}

export interface StrategicConfirmationDocument {
  tenantId: ID;
  businessId: ID;
  sessionId: ID;
  revision: number;
  strategyRevision?: number;
  confirmationId: ID;
  state?: StrategicConfirmationState;
  status: StrategicConfirmationStatus;
  strategyState?: StrategyState;
  executionState?: ConfirmationExecutionState;
  confidence?: string;
  source: StrategicConfirmationSourceDocument;
  summary: StrategicConfirmationSummary;
  opportunity: StrategicOpportunitySummary;
  recommendedDirection: StrategicDirectionSummary;
  alternatives: StrategicAlternativeSummary[];
  explanation: StrategicConfirmationExplanation;
  policyVersions: PolicyVersionSnapshot[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CreativeBrainSessionDocument {
  tenantId: ID;
  businessId: ID;
  sessionId: ID;
  revision: number;
  currentState: OrchestratorStatus;
  sessionData: CreativeBrainSession;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CreativeBrainOperationDocument {
  tenantId: ID;
  operationId: ID;
  idempotencyKey: string;
  status: "IN_PROGRESS" | "SUCCEEDED" | "FAILED";
  resultReference?: string;
  errorPayload?: {
    code: string;
    message: string;
  };
  createdAt: ISODateTime;
  completedAt?: ISODateTime;
}

export interface CreativeBrainCheckpointDocument {
  tenantId: ID;
  sessionId: ID;
  revision: number;
  state: OrchestratorStatus;
  sessionSnapshot: CreativeBrainSession;
  policyVersions: PolicyVersionSnapshot[];
  createdAt: ISODateTime;
}

export interface StrategicDecisionDocument {
  tenantId: ID;
  decisionId: ID;
  sessionId: ID;
  confirmationId: ID;
  revision: number;
  decision: StrategicConfirmationDecision;
  selectedAlternativeId?: ID;
  userNotes?: string;
  createdAt: ISODateTime;
}

export interface CreativeExplorationDocument {
  explorationId: ID;
  tenantId: ID;
  sessionId: ID;
  revision: number;
  sourceConfirmationId: ID;
  sourceDirectionId: ID;
  exploredDirectionIds: ID[];
  exploredStrategyTypes: string[];
  explorationCount: number;
  status: "IN_PROGRESS" | "COMPLETED" | "NO_DIRECTION" | "FAILED";
  createdAt: ISODateTime;
  completedAt?: ISODateTime;
}

export interface ExecutionAuthorizationDocument {
  tenantId: ID;
  authorizationId: ID;
  sessionId: ID;
  confirmationId: ID;
  selectedVariantId: ID;
  selectedStrategyType: string;
  signature: string;
  authorizedAt: ISODateTime;
  expiresAt: ISODateTime;
  consumed: boolean;
  consumedAt?: ISODateTime;
}

// Repository Boundaries
export interface CreativeBrainSessionRepository {
  get(sessionId: ID): Promise<CreativeBrainSessionDocument | null>;
  create(document: CreativeBrainSessionDocument): Promise<void>;
  update(document: CreativeBrainSessionDocument): Promise<void>;
}

export interface CreativeBrainOperationRepository {
  findByIdempotencyKey(tenantId: ID, key: string): Promise<CreativeBrainOperationDocument | null>;
  create(operation: CreativeBrainOperationDocument): Promise<void>;
  markSucceeded(operationId: ID, resultReference: string): Promise<void>;
  markFailed(operationId: ID, code: string, message: string): Promise<void>;
}

export interface CreativeBrainCheckpointRepository {
  save(checkpoint: CreativeBrainCheckpointDocument): Promise<void>;
  getLatest(sessionId: ID, revision: number): Promise<CreativeBrainCheckpointDocument | null>;
}

export interface StrategicConfirmationRepository {
  get(sessionId: ID, revision: number): Promise<StrategicConfirmationDocument | null>;
  create(confirmation: StrategicConfirmationDocument): Promise<void>;
  markStale(confirmationId: ID, reason: string): Promise<void>;
}

export interface StrategicDecisionRepository {
  create(decision: StrategicDecisionDocument): Promise<void>;
  getLatest(confirmationId: ID): Promise<StrategicDecisionDocument | null>;
}

export interface CreativeExplorationRepository {
  create(exploration: CreativeExplorationDocument): Promise<void>;
  list(sessionId: ID, revision: number): Promise<CreativeExplorationDocument[]>;
}

export interface ExecutionAuthorizationRepository {
  create(authorization: ExecutionAuthorizationDocument): Promise<void>;
  get(authorizationId: ID): Promise<ExecutionAuthorizationDocument | null>;
  consume(authorizationId: ID): Promise<void>;
}

export interface CreativeAssetPlanDocument {
  tenantId: ID;
  businessId: ID;
  sessionId: ID;
  revision: number;
  assetPlanId: ID;
  planData: any;
  status: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CreativeAssetDocument {
  tenantId: ID;
  businessId: ID;
  sessionId: ID;
  revision: number;
  assetPlanId: ID;
  assetId: ID;
  type: string;
  role: string;
  source: string;
  storageReference: string;
  mimeType: string;
  width: number;
  height: number;
  status: string;
  createdAt: ISODateTime;
}

export interface CreativeAssetPlanRepository {
  get(assetPlanId: ID): Promise<CreativeAssetPlanDocument | null>;
  getBySession(sessionId: ID, revision: number): Promise<CreativeAssetPlanDocument | null>;
  create(plan: CreativeAssetPlanDocument): Promise<void>;
  updateStatus(assetPlanId: ID, status: string): Promise<void>;
}

export interface CreativeAssetRepository {
  create(asset: CreativeAssetDocument): Promise<void>;
  get(assetId: ID): Promise<CreativeAssetDocument | null>;
  listByPlan(assetPlanId: ID): Promise<CreativeAssetDocument[]>;
}

export interface CreativeIntelligenceReader {
  getOpportunity(id: ID): Promise<CreativeOpportunity | null>;
  getMechanism(id: ID): Promise<CreativeMechanismReference | null>;
  getPsychology(id: ID): Promise<PsychologyReference | null>;
}
