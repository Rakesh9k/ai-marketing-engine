import type { ID } from "./primitives";
import type { ConfidenceLevel, MarketingObjective } from "./enums";
import type { EvidenceReference } from "./evidence";

export interface CopyStructureReference {
  id: ID;
  name: string;
  definition: string;
  sequence: string[];
  tone: string[];
  sentenceLength: "SHORT" | "MIXED" | "LONG";
  specificity: "LOW" | "MEDIUM" | "HIGH";
  emotionalIntensity: "LOW" | "MEDIUM" | "HIGH";
  proofRequirement: "NONE" | "OPTIONAL" | "REQUIRED";
  ctaStyle?: string;
  compatibleMechanisms: ID[];
  compatibleObjectives: MarketingObjective[];
  ethicalConstraints: string[];
  evidence: EvidenceReference[];
  confidence: ConfidenceLevel;
}

export interface CopyDirection {
  structure: CopyStructureReference;
  communicationPurpose: string;
  tone: string[];
  sentenceLength: "SHORT" | "MIXED" | "LONG";
  specificity: "LOW" | "MEDIUM" | "HIGH";
  emotionalIntensity: "LOW" | "MEDIUM" | "HIGH";
  proofRequirement: "NONE" | "OPTIONAL" | "REQUIRED";
  ctaStyle?: string;
  claimsAllowed: string[];
  claimsRequiringEvidence: string[];
  constraints: string[];
}
