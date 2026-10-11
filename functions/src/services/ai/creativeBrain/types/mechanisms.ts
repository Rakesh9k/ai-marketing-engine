import type { ID } from "./primitives";
import type { ConfidenceLevel, IntelligenceStatus, MarketingObjective } from "./enums";
import type { EvidenceReference } from "./evidence";

export interface CreativeMechanismReference {
  id: ID;
  name: string;
  definition: string;
  purpose: string;
  psychologyIds: ID[];
  bestFor: string[];
  industries: string[];
  objectives: MarketingObjective[];
  audienceSituationIds: ID[];
  strengths: string[];
  weaknesses: string[];
  worksWith: ID[];
  avoidWith: ID[];
  hookPatterns: ID[];
  storyStructures: ID[];
  visualStructures: ID[];
  copyStructures: ID[];
  assetRequirements: string[];
  antiPatterns: string[];
  ethicalBoundaries: string[];
  evidence: EvidenceReference[];
  confidence: ConfidenceLevel;
  status: IntelligenceStatus;
}

export interface MechanismDirection {
  primary: CreativeMechanismReference;
  supporting: CreativeMechanismReference[];
  role: string;
  rationale: string;
  constraints: string[];
}
