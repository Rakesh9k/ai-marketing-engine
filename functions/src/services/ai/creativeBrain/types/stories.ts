import type { ID, DurationRange } from "./primitives";
import type { ConfidenceLevel, MarketingObjective } from "./enums";
import type { EvidenceReference } from "./evidence";

export interface StoryBeat {
  id: ID;
  name: string;
  narrativeFunction: string;
  required: boolean;
  order: number;
  optional?: boolean;
  dependencies?: ID[];
  constraints?: string[];
}

export interface StoryStructureReference {
  id: ID;
  name: string;
  definition: string;
  beats: StoryBeat[];
  timing?: DurationRange;
  informationDensity: "LOW" | "MEDIUM" | "HIGH";
  emotionalArc?: string;
  bestFormats: ID[];
  bestObjectives: MarketingObjective[];
  bestIndustries: string[];
  evidence: EvidenceReference[];
  confidence: ConfidenceLevel;
}

export interface StoryBeatDirection {
  structureBeatId: ID;
  sequence: number;
  purpose: string;
  contentRole: string;
  required: boolean;
  adaptation?: string;
}

export interface StoryDirection {
  structure: StoryStructureReference;
  narrativePurpose: string;
  beats: StoryBeatDirection[];
  emotionalArc?: string;
  pacingProfile?: string;
  informationDensity?: "LOW" | "MEDIUM" | "HIGH";
  requiredProof?: string[];
  optionalBeats?: ID[];
  constraints: string[];
}
