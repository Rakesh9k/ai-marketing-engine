import type { ID } from "./primitives";
import type { ConfidenceLevel, MarketingObjective } from "./enums";
import type { EvidenceReference } from "./evidence";

export interface StyleAdaptability {
  supportsBrandColors: boolean;
  supportsBrandTypography: boolean;
  supportsCulturalAdaptation: boolean;
  supportsPlatformAdaptation: boolean;
  supportsIndustryAdaptation: boolean;
  rigidElements: string[];
  flexibleElements: string[];
}

export interface StyleSystemReference {
  id: ID;
  name: string;
  definition: string;
  emotionalCharacter: string;
  brandPerception: string[];
  compatibleIndustries: string[];
  compatibleObjectives: MarketingObjective[];
  compatibleSituations: ID[];
  compatibleVisualStructures: ID[];
  compatibleStoryStructures: ID[];
  compatibleMechanisms: ID[];
  incompatibleStyles: ID[];
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  antiPatterns: string[];
  ethicalBoundaries: string[];
  adaptability: StyleAdaptability;
  evidence: EvidenceReference[];
  confidence: ConfidenceLevel;
}

export interface StyleDirection {
  primaryStyle: StyleSystemReference;
  secondaryStyle?: StyleSystemReference;
  intensity: "LOW" | "MEDIUM" | "HIGH";
  visualCharacter: string;
  typographyDirection: string;
  colorDirection: string;
  imageDirection: string;
  compositionDirection: string;
  motionDirection: string;
  culturalAdaptation?: string;
  brandAdaptation?: string;
  prohibitedTreatments: string[];
}
