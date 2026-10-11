/**
 * Phase 28 — Creative Bank Types & Schema Definitions
 * Mitra by BrainWise
 */

export type CreativeMechanismCategory =
  | 'ATTENTION'
  | 'PSYCHOLOGY'
  | 'AUDIENCE_TENSION'
  | 'VALUE'
  | 'EMOTION'
  | 'STORY'
  | 'SOCIAL'
  | 'IDENTITY'
  | 'PROOF'
  | 'OCCASION'
  | 'LOCAL'
  | 'BEHAVIOR';

export interface MechanismCompatibilityRules {
  compatibleMechanismIds?: string[];
  incompatibleMechanismIds?: string[];
  maxCompositionCount?: number;
}

export interface CreativeMechanism {
  id: string;
  name: string;
  version: string;
  category: CreativeMechanismCategory[];
  strategicDescription: string;
  psychologicalBasis: string;
  /** 5 Core Questions Answered */
  humanTensionResolved: string;
  whyAudienceCares: string;
  creativeChanges: string;
  whenAppropriate: string;
  whenToAvoid: string;

  trigger: string;
  desiredEmotionalResponse: string[];
  applicableIndustries: string[]; // e.g. ['restaurant', 'salon', 'real_estate', 'all']
  compatibleSubIndustries?: string[];
  compatibleAudienceSituations: string[];
  compatibleOfferRoles: string[];
  hookDirections: string[];
  visualDirections: string[];
  storyDirections: string[];
  copyDirections: string[];
  proofTypes: string[];
  ctaPatterns: string[];
  strengths: string[];
  risks: string[];
  antiPatterns: string[];
  status: 'active' | 'deprecated' | 'experimental';
  compatibilityRules?: MechanismCompatibilityRules;
}

export interface CreativeMechanismFingerprint {
  mechanismId: string;
  primaryCategory: CreativeMechanismCategory;
  semanticTags: string[];
  coreEmotionalDriver: string;
}

export interface CreativeMechanismUsage {
  businessId: string;
  mechanismId: string;
  usedAt: string; // ISO date
  campaignId: string;
  performanceScore?: number;
  userApproval?: boolean;
}

export interface CreativeBankQuery {
  businessId?: string;
  industry: string;
  subIndustry?: string;
  objective?: string;
  audienceSituation?: string;
  offerRole?: string;
  excludeMechanismIds?: string[];
  exploreRatio?: number; // Default 0.3 (30% explore, 70% exploit)
  limit?: number;
}

export interface MechanismScoreDetail {
  mechanismId: string;
  totalScore: number;
  industryFit: number;
  situationFit: number;
  objectiveFit: number;
  fatiguePenalty: number;
  noveltyBonus: number;
  isExploreChoice: boolean;
}

export interface MechanismComposition {
  primaryMechanism: CreativeMechanism;
  secondaryMechanisms: CreativeMechanism[];
  compositionRationale: string;
}

export interface CreativeBankRetrievalResult {
  mechanisms: CreativeMechanism[];
  composition: MechanismComposition;
  scores: MechanismScoreDetail[];
  explored: boolean;
}
