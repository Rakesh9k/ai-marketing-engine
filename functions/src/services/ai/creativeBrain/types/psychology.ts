import type { ID } from "./primitives";
import type { ConfidenceLevel, IntelligenceStatus } from "./enums";
import type { EvidenceReference } from "./evidence";

export type PsychologyCategory =
  | "ATTENTION"
  | "DESIRE"
  | "TRUST"
  | "DECISION"
  | "EMOTION";

export interface PsychologyReference {
  id: ID;
  name: string;
  category: PsychologyCategory;
  definition: string;
  purpose: string;
  whyItMayWork: string;
  whenToUse: string[];
  whenNotToUse: string[];
  risks: string[];
  ethicalBoundary: string;
  compatibleMechanismIds: ID[];
  incompatibleMechanismIds: ID[];
  evidence: EvidenceReference[];
  confidence: ConfidenceLevel;
  status: IntelligenceStatus;
}

export interface PsychologyDirection {
  primary: PsychologyReference;
  secondary: PsychologyReference[];
  rationale: string;
  contextualRelevance: string;
  ethicalConsiderations: string[];
  confidence: ConfidenceLevel;
}
