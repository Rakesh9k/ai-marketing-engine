import type { ID } from "./primitives";
import type { ConfidenceLevel } from "./enums";
import type { EvidenceReference } from "./evidence";

export interface VisualStructureReference {
  id: ID;
  name: string;
  definition: string;
  composition: string;
  cameraBehavior?: string;
  subjectHierarchy: string[];
  motion?: string;
  transitions?: string[];
  textPlacement?: string;
  imageRequirements: string[];
  videoRequirements: string[];
  compatibleStyles: ID[];
  compatibleStoryStructures: ID[];
  evidence: EvidenceReference[];
  confidence: ConfidenceLevel;
}

export interface VisualDirection {
  structure: VisualStructureReference;
  visualPurpose: string;
  subjectHierarchy: string[];
  compositionDirection: string;
  cameraDirection?: string;
  imageRequirements: string[];
  videoRequirements: string[];
  textPlacement?: string;
  motionDirection?: string;
  proofVisualization?: string;
  constraints: string[];
}
