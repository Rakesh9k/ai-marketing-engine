/**
 * PHASE 15 — Concept Mixing & Creative Blueprint Synthesis Engine Types
 * Defines component selection contracts, compatibility rubrics, conflict resolution
 * structures, and production-ready Creative Blueprint schemas.
 */



export type MixComponentType =
  | 'coreIdea'
  | 'humanInsight'
  | 'hook'
  | 'creativeMechanism'
  | 'visualDirection'
  | 'storyDirection'
  | 'tone'
  | 'emotionalTerritory'
  | 'offerIntegration'
  | 'cta'
  | 'format'
  | 'platform';

export interface ComponentSelection {
  component: MixComponentType;
  conceptId: string;
  exactMode?: boolean;
}

export type MixingMode = 'SMART_MIX' | 'EXACT_MIX';

export interface ConceptMixSelection {
  campaignId: string;
  tenantId: string;
  primaryConceptId?: string;
  selections: ComponentSelection[];
  userInstruction?: string;
  mixingMode?: MixingMode;
}

export type ConflictCategory =
  | 'STRATEGIC'
  | 'EMOTIONAL'
  | 'BRAND'
  | 'OFFER'
  | 'PLATFORM'
  | 'ASSET';

export interface ConflictDetection {
  conflictType: ConflictCategory;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  resolutionStrategy: string;
}

export interface ComponentAdaptationRecord {
  component: string;
  original: string;
  adapted: string;
  reason: string;
}

export interface BlueprintProvenance {
  sourceConcepts: string[];
  componentSources: {
    component: string;
    sourceConceptId: string;
  }[];
  adaptations: ComponentAdaptationRecord[];
  conflictsResolved: {
    conflictType: ConflictCategory;
    resolution: string;
  }[];
}

export interface MixedConcept {
  id: string;
  name: string;
  sourceConcepts: string[];
  selectedComponents: ComponentSelection[];
  synthesizedIdea: string;
  synthesizedInsight: string;
  synthesizedEmotion: { primary: string; secondary?: string };
  synthesizedHook: string;
  synthesizedMechanism: { name: string; explanation: string };
  synthesizedVisualDirection: string;
  synthesizedStoryDirection: string;
  synthesizedOfferIntegration: string;
  synthesizedCTA: string;
  recommendedFormat: { primary: string; alternatives?: string[] };
  recommendedPlatform: { primary: string; secondary?: string[] };
  requiredAssets: { required: string[]; recommended: string[]; optional: string[] };
  compatibilityScore: number; // 0..100
  strategicCoherenceScore: number; // 0..100
  adaptations: ComponentAdaptationRecord[];
  conflictsResolved: ConflictDetection[];
}

export interface CreativeBlueprintScore {
  total: number; // 0..100
  strategicCoherence: number; // Max 20
  opportunityAlignment: number; // Max 20
  businessFit: number; // Max 15
  audienceFit: number; // Max 15
  creativeStrength: number; // Max 10
  componentIntegration: number; // Max 10
  executionFeasibility: number; // Max 5
  brandAlignment: number; // Max 5
}

export interface CreativeBlueprint {
  blueprintId: string;
  campaignId: string;
  tenantId: string;
  title: string;
  conceptId: string;
  primaryTerritory: string;
  campaignObjective: string;
  targetAudience: string;
  coreInsight: string;
  creativeOpportunity: string;
  emotionalTerritory: { primary: string; secondary?: string };
  creativeMechanism: { name: string; explanation: string };
  hook: string;
  keyMessage: string;
  visualDirection: string;
  storyDirection: string;
  copyDirection: {
    headline: string;
    subheadline?: string;
    bodyText: string;
    tone: string;
  };
  offer: string;
  cta: string;
  recommendedFormat: { primary: string; alternatives?: string[] };
  recommendedPlatform: { primary: string; secondary?: string[] };
  requiredAssets: { required: string[]; recommended: string[]; optional: string[] };
  brandConstraints: { forbiddenWords: string[]; tone: string };
  truthConstraints: { verifiedClaims: string[] };
  blueprintScore: CreativeBlueprintScore;
  provenance: BlueprintProvenance;
  createdAt: string;
}

export interface ConceptMixingResult {
  campaignId: string;
  blueprint: CreativeBlueprint;
  mixedConcept: MixedConcept;
  explanation: {
    summary: string;
    componentSummary: string[];
    adaptationsExplained: string[];
  };
}
