import type { ID } from "./primitives";
import type { OrchestratorStatus, CreativeBrainSession } from "./orchestration";
import type {
  StrategicConfirmation,
  StrategicAlternativeSummary,
  StrategicRevisionType,
} from "./confirmation";
import type { RecoveryMetadata } from "./recovery";

export interface CreativeBrainSessionResponse {
  session: CreativeBrainSession;
  currentState: OrchestratorStatus;
  revision: number;
  currentConfirmation?: StrategicConfirmation;
  recovery?: RecoveryMetadata;
}

export interface CreateCreativeBrainSessionRequest {
  businessId: ID;
  campaignId?: ID;
  objective: string;
  platform: string;
  format: string;
  campaignStage: string;
}

export interface CreateCreativeBrainSessionResponse {
  sessionId: ID;
  revision: number;
  state: OrchestratorStatus;
}

export interface GetConfirmationResponse {
  confirmation: StrategicConfirmation;
}

export interface GenerateConfirmationRequest {
  revision: number;
  idempotencyKey: string;
}

export interface GenerateConfirmationResponse {
  operationId: ID;
  status: "IN_PROGRESS" | "READY" | "FAILED";
  confirmation?: StrategicConfirmation;
  recovery?: RecoveryMetadata;
  failure?: {
    code: string;
    message: string;
  };
}

export interface StrategicRevisionChange {
  field: string;
  previousValue?: unknown;
  requestedValue: unknown;
}

export interface StrategicRevisionRequest {
  revision: number;
  idempotencyKey: string;
  type: StrategicRevisionType;
  changes: StrategicRevisionChange[];
}

export interface StrategicConfirmationDecisionRequest {
  confirmationId: ID;
  revision: number;
  decision: "CONFIRM" | "CHANGE" | "EXPLORE";
  idempotencyKey: string;
  selectedAlternativeId?: ID;
  revisionRequest?: StrategicRevisionRequest;
  userNotes?: string;
}

export interface ExploreDirectionRequest {
  confirmationId: ID;
  revision: number;
  idempotencyKey: string;
  explorationContext?: {
    excludeDirectionIds?: ID[];
    excludeStrategyTypes?: string[];
  };
}

export interface ExploreDirectionResponse {
  operationId: ID;
  status: "IN_PROGRESS" | "READY" | "NO_DIRECTION" | "FAILED";
  alternative?: StrategicAlternativeSummary;
  confirmation?: StrategicConfirmation;
  recovery?: RecoveryMetadata;
  failure?: {
    code: string;
    message: string;
  };
}

export interface CreativeBrainOperationResponse {
  operationId: ID;
  status: "IN_PROGRESS" | "SUCCEEDED" | "FAILED";
  resultReference?: string;
  recovery?: RecoveryMetadata;
  failure?: {
    code: string;
    message: string;
  };
}

export interface CreativeBrainApiError {
  code: string;
  message: string;
  operationId?: ID;
  correlationId?: ID;
  retryable: boolean;
  recovery?: RecoveryMetadata;
  details?: Record<string, unknown>;
}
