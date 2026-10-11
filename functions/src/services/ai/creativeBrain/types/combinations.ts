import type { ID } from "./primitives";
import type { ConfidenceLevel, IntelligenceStatus, MarketingObjective, AwarenessStage, PurchaseIntentLevel } from "./enums";
import type { EvidenceReference } from "./evidence";

export type CombinationRelationship =
  | "COMPATIBLE"
  | "RECOMMENDED"
  | "NEUTRAL"
  | "AVOID"
  | "FORBIDDEN";

export type CombinationComponentType =
  | "PSYCHOLOGY"
  | "MECHANISM"
  | "HOOK"
  | "STORY"
  | "VISUAL"
  | "COPY"
  | "OFFER"
  | "STYLE"
  | "CTA"
  | "PLATFORM"
  | "RECIPE";

export interface CombinationComponent {
  type: CombinationComponentType;
  id: ID;
}

export interface CombinationContextConditions {
  industries?: string[];
  objectives?: MarketingObjective[];
  audienceSituations?: ID[];
  platforms?: ID[];
  formats?: ID[];
  awarenessStages?: AwarenessStage[];
  purchaseIntentLevels?: PurchaseIntentLevel[];
}

export interface CombinationRuleReference {
  id: ID;
  name: string;
  definition: string;
  sourceComponents: CombinationComponent[];
  targetComponents: CombinationComponent[];
  relationship: CombinationRelationship;
  contextConditions?: CombinationContextConditions;
  rationale: string;
  evidence: EvidenceReference[];
  confidence: ConfidenceLevel;
  ethicalBoundary?: string;
  status: IntelligenceStatus;
}

export interface CombinationValidation {
  valid: boolean;
  rulesEvaluated: ID[];
  compatibleRules: ID[];
  recommendedRules: ID[];
  neutralRules: ID[];
  avoidRules: ID[];
  forbiddenRules: ID[];
  warnings: string[];
  rationale: string;
}
