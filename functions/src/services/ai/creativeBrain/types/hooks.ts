import type { ID } from "./primitives";
import type { ConfidenceLevel, MarketingObjective } from "./enums";
import type { EvidenceReference } from "./evidence";

export type HookVariableType =
  | "AUDIENCE"
  | "SITUATION"
  | "PROBLEM"
  | "OUTCOME"
  | "PRODUCT"
  | "LOCATION"
  | "OFFER"
  | "CLAIM"
  | "CUSTOM";

export interface HookVariableSlot {
  name: string;
  type: HookVariableType;
  required: boolean;
  constraints?: string[];
}

export interface HookPatternReference {
  id: ID;
  name: string;
  formula: string;
  purpose: string;
  variableSlots: HookVariableSlot[];
  psychologyIds: ID[];
  mechanismIds: ID[];
  bestSituations: ID[];
  bestObjectives: MarketingObjective[];
  platformIds?: ID[];
  formatIds?: ID[];
  risks: string[];
  antiPatterns: string[];
  ethicalConstraints: string[];
  evidence: EvidenceReference[];
  confidence: ConfidenceLevel;
}

export interface HookDirection {
  pattern: HookPatternReference;
  purpose: string;
  openingFunction: string;
  informationGap?: string;
  emotionalEntry?: string;
  illustrativeExample?: string;
  constraints: string[];
}
