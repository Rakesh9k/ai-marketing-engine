import type { ID, ISODateTime, Version } from "./primitives";
import type { CreativeCompositionStatus } from "./enums";
import type { CreativeDirection } from "./directions";
import type { ClarificationQuestion, CreativeConflict, BlockingReason } from "./recovery";
import type { CreativeCompositionFailure } from "./composition";

export type StateTransitionTrigger =
  | "SYSTEM"
  | "USER"
  | "DEPENDENCY"
  | "LEARNING";

export interface StateTransition {
  from: CreativeCompositionStatus;
  to: CreativeCompositionStatus;
  reason: string;
  triggeredBy: StateTransitionTrigger;
  timestamp: ISODateTime;
  affectedFields: string[];
  metadata?: Record<string, unknown>;
}

export interface CreativeCompositionState {
  compositionId: ID;
  state: CreativeCompositionStatus;
  stateHistory: StateTransition[];
  currentDirection?: CreativeDirection;
  pendingQuestions: ClarificationQuestion[];
  conflicts: CreativeConflict[];
  blockers: BlockingReason[];
  failure?: CreativeCompositionFailure;
  lastUpdatedAt: ISODateTime;
  policyVersion: Version;
}
