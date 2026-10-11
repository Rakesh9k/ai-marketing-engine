import type { ID } from "./primitives";
import type { ConfidenceLevel } from "./enums";

export type AssumptionCategory =
  | "AUDIENCE"
  | "BEHAVIOR"
  | "BUSINESS"
  | "OFFER"
  | "PLATFORM"
  | "CULTURE"
  | "PSYCHOLOGY"
  | "PERFORMANCE"
  | "OPERATIONAL"
  | "OTHER";

export type AssumptionStatus =
  | "ACTIVE"
  | "TESTED"
  | "CONFIRMED"
  | "REJECTED";

export interface Assumption {
  id: ID;
  statement: string;
  category: AssumptionCategory;
  confidence: ConfidenceLevel;
  testable: boolean;
  testMethod?: string;
  status: AssumptionStatus;
}
