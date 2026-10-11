import type { BusinessBrain, BusinessCategory } from '../../../types';
import type {
  CreativeOpportunity,
  CreativeConcept as CandidateConcept,
  CreativeBlueprint,
} from '../creativeBrain.types';

export type CanonicalCreativeBrainState =
  | 'INIT'
  | 'CAMPAIGN_INTENT'
  | 'CAMPAIGN_CONTEXT'
  | 'AUDIENCE_DISCOVERY'
  | 'OBJECTIVE_DISCOVERY'
  | 'OFFER_DISCOVERY'
  | 'CUSTOMER_INSIGHT'
  | 'CREATIVE_TERRITORY'
  | 'OPPORTUNITY'
  | 'CONCEPT_GENERATION'
  | 'USER_SELECTION'
  | 'CONCEPT_REFINEMENT'
  | 'BLUEPRINT_LOCKED'
  | 'EXECUTION';

export type EvidenceFactuality = 'AUTHORITATIVE' | 'INFERRED' | 'HYPOTHESIS';

export type EvidenceSource =
  | 'BUSINESS_BRAIN'
  | 'CURRENT_CAMPAIGN'
  | 'PRODUCT_CONTEXT'
  | 'USER_INPUT'
  | 'CREATIVE_MEMORY'
  | 'CAMPAIGN_PERFORMANCE'
  | 'AI_INFERENCE'
  | 'CREATIVE_HYPOTHESIS';

export interface CreativeBrainEvidence {
  readonly key: string;
  readonly value: unknown;
  readonly source: EvidenceSource;
  readonly authority: number; // 0..100
  readonly confidence: number; // 0..100
  readonly factuality: EvidenceFactuality;
  readonly timestamp?: string;
}

export interface CreativeBrainRequirement {
  readonly key: string;
  readonly label: string;
  readonly category: 'business' | 'audience' | 'objective' | 'offer' | 'motivation' | 'territory';
  readonly isCritical: boolean;
  readonly decisionImpact: number; // 0..100
  readonly uncertainty: number; // 0..100
  readonly creativeRelevance: number; // 0..100
  readonly userEffort: number; // 0..100
  readonly informationValue: number; // Calculated: Impact * Uncertainty * Relevance - Effort
}

export interface CreativeBrainStateDefinition {
  readonly id: CanonicalCreativeBrainState;
  readonly purpose: string;
  readonly requiredEvidence: readonly string[];
  readonly optionalEvidence: readonly string[];
  readonly completionCriteria: readonly string[];
  readonly skipCriteria: readonly string[];
  readonly blockingConditions: readonly string[];
  readonly allowedTransitions: readonly CanonicalCreativeBrainState[];
  readonly requiresUserInput: boolean;
  readonly allowsAIReasoning: boolean;
  readonly confidenceRequirement: number;
  readonly maxAttempts: number;
}

export interface CreativeBrainUserResponse {
  readonly promptId: string;
  readonly question: string;
  readonly selectedOption?: string;
  readonly textResponse?: string;
  readonly timestamp: string;
}

export interface CreativeBrainRefinement {
  readonly cycleNumber: number;
  readonly instruction: string;
  readonly targetAspect: 'hook' | 'tone' | 'localization' | 'offer_framing' | 'visual_premise' | 'cta' | 'direction_change';
  readonly resultConceptId: string;
  readonly isMajorDirectionChange: boolean;
  readonly timestamp: string;
}

export interface AdaptiveStateTransitionTrace {
  readonly fromState: CanonicalCreativeBrainState;
  readonly toState: CanonicalCreativeBrainState;
  readonly reasonCode: string;
  readonly reason: string;
  readonly confidence: number;
  readonly skippedStates: readonly CanonicalCreativeBrainState[];
  readonly timestamp: string;
}

export interface CreativeBrainStateContext {
  readonly sessionId: string;
  readonly businessId: string;
  readonly campaignId?: string;
  currentState: CanonicalCreativeBrainState;
  readonly businessBrain: BusinessBrain;
  readonly vertical: BusinessCategory;
  industryCreativeContext?: import('./industry/industryKnowledge.types').IndustryCreativeContext;
  campaignIntent: any;
  productContext?: any;
  businessUnderstanding?: any;
  productUnderstanding?: any;
  evidence: Map<string, CreativeBrainEvidence>;
  missingRequirements: CreativeBrainRequirement[];
  completedStates: Set<CanonicalCreativeBrainState>;
  audience?: any;
  objective?: any;
  offer?: any;
  customerInsight?: any;
  selectedTerritory?: string;
  opportunity?: CreativeOpportunity;
  concepts?: readonly CandidateConcept[];
  selectedConcept?: CandidateConcept;
  blueprint?: CreativeBlueprint;
  userResponses: CreativeBrainUserResponse[];
  refinementHistory: CreativeBrainRefinement[];
  refinementCycleCount: number;
  regenerationCycleCount: number;
  stateAttemptCounts: Map<CanonicalCreativeBrainState, number>;
  transitionTraces: AdaptiveStateTransitionTrace[];
  confidence: number;
  version: string;
}
