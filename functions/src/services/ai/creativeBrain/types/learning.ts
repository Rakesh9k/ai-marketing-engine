import type { ID, ISODateTime } from "./primitives";
import type { ConfidenceLevel } from "./enums";
import type { CreativeContext } from "./context";

export type CreativeOutcome =
  | "WORKED"
  | "FAILED"
  | "NEUTRAL"
  | "UNEXPECTED";

export type PerformanceDirection =
  | "POSITIVE"
  | "NEGATIVE"
  | "NEUTRAL"
  | "UNKNOWN";

export interface PerformanceSignal {
  metric: string;
  value?: number;
  unit?: string;
  direction: PerformanceDirection;
  baseline?: number;
  context?: string;
  observedAt: ISODateTime;
}

export interface ConfidenceChange {
  previous: ConfidenceLevel;
  next: ConfidenceLevel;
  reason: string;
  evidenceIds: ID[];
}

export interface CreativeDirectionLearning {
  directionId: ID;
  context: CreativeContext;
  outcome: CreativeOutcome;
  performanceSignals: PerformanceSignal[];
  qualitativeFeedback: string[];
  selectedByUser: boolean;
  explanationHypothesis?: string;
  alternativeExplanations: string[];
  confidenceChange?: ConfidenceChange;
}
