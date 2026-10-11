import type { CampaignObjective, CTAType, LocalizationProfile } from '../../../../types';
import type {
  CreativeBrainState,
  AuthorityLevel,
  CreativeAnswer,
} from '../questions/creativeQuestion.types';
import type {
  CreativeOpportunity,
  CreativeConcept,
  CreativeBlueprint,
} from '../../creativeBrain.types';

import type { StrategicConfirmationState } from './strategicConfirmation.types';

// ============================================================================
// CREATIVE BRAIN SESSION LIFECYCLE STATUS
// ============================================================================

export type CreativeBrainSessionStatus =
  | 'ACTIVE'
  | 'WAITING_FOR_USER'
  | 'CONCEPT_SELECTION'
  | 'REFINEMENT'
  | 'BLUEPRINT_LOCKED'
  | 'EXECUTION_READY'
  | 'COMPLETED'
  | 'ABANDONED'
  | 'FAILED';

// ============================================================================
// DERIVED INSIGHT & MISSING DIMENSION TYPES
// ============================================================================

export type InsightSource = 'USER_ANSWER' | 'BUSINESS_BRAIN' | 'INDUSTRY_KNOWLEDGE' | 'AI_INFERENCE';

export type DerivedInsightStatus = 'ACTIVE' | 'SUPERSEDED' | 'REJECTED';

export interface CreativeBrainDerivedInsight {
  readonly id: string;
  readonly dimension: string;
  readonly insight: string;
  readonly sourceAnswerIds: readonly string[];
  readonly source: InsightSource;
  readonly authority: AuthorityLevel;
  readonly confidence: number; // 0..100
  readonly affectsDecisions: readonly string[];
  readonly status: DerivedInsightStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MissingCreativeDimension {
  readonly dimension: string;
  readonly state: 'UNKNOWN' | 'PARTIALLY_KNOWN' | 'INFERRED' | 'CONFLICTING';
  readonly uncertainty: number; // 0..100
  readonly decisionImpact: number; // 0..100
  readonly creativeRelevance: number; // 0..100
  readonly informationGain?: number; // 0..100
  readonly affectedDecisions: readonly string[];
  readonly recommendedAction: 'ASK' | 'INFER' | 'SKIP' | 'WAIT';
  readonly lastEvaluatedAt: string;
}

// ============================================================================
// STATE TRANSITIONS & CONFIDENCE
// ============================================================================

export interface CreativeBrainStateTransition {
  readonly from: CreativeBrainState;
  readonly to: CreativeBrainState;
  readonly reason: string;
  readonly triggeredBy: 'USER_ANSWER' | 'INFERENCE' | 'INFORMATION_GAIN' | 'SYSTEM' | 'USER_SELECTION';
  readonly timestamp: string;
}

export interface CreativeBrainConfidence {
  readonly overall: number; // 0..100
  readonly audience?: number;
  readonly objective?: number;
  readonly offer?: number;
  readonly motivation?: number;
  readonly creativeTerritory?: number;
  readonly lastUpdatedAt: string;
}

// ============================================================================
// CONCEPT SELECTION & MERGED/MIXED CONCEPTS
// ============================================================================

export interface SelectedConceptReference {
  readonly conceptId: string;
  readonly selectedAt: string;
  readonly selectionSource: 'USER' | 'SYSTEM';
}

export interface MixedConcept {
  readonly sourceConceptIds: readonly string[];
  readonly selectedDimensions: {
    readonly positioning?: string;
    readonly audience?: string;
    readonly motivation?: string;
    readonly offerFraming?: string;
    readonly copyDirection?: string;
    readonly visualDirection?: string;
    readonly ctaDirection?: string;
  };
  readonly rationale?: string;
  readonly createdAt: string;
}

// ============================================================================
// BUSINESS BRAIN REFERENCE (NO DUPLICATION OF BUSINESS BRAIN DATA)
// ============================================================================

export interface BusinessContextReference {
  readonly businessId: string;
  readonly businessBrainVersion?: number;
  readonly businessBrainUpdatedAt?: string;
}

// ============================================================================
// MAIN CREATIVE BRAIN SESSION MODEL
// ============================================================================

export interface CreativeBrainSession {
  readonly sessionId: string;
  /** Owner of the session; when set, every Phase 9 action is authorised against it. */
  readonly ownerUserId?: string;
  readonly businessId: string;
  readonly campaignId?: string;
  readonly industry?: string;
  readonly subIndustry?: string;

  readonly businessRef: BusinessContextReference;

  readonly initialIntent: {
    readonly objective: CampaignObjective;
    readonly offerHeadline: string;
    readonly price?: number;
    readonly cta: CTAType;
    readonly localization: LocalizationProfile;
    readonly requestedFormat?: string;
    readonly userInstruction?: string;
  };

  readonly answers: readonly CreativeAnswer[];
  readonly derivedInsights: readonly CreativeBrainDerivedInsight[];
  readonly missingDimensions: readonly MissingCreativeDimension[];
  readonly confidence: CreativeBrainConfidence;

  readonly currentState: CreativeBrainState;
  readonly creativeOpportunity?: CreativeOpportunity;
  /** Phase 9: human confirmation of the locked opportunity. Concept generation is gated on it. */
  readonly strategicConfirmation?: StrategicConfirmationState;
  readonly concepts: readonly CreativeConcept[];
  readonly selectedConcept?: SelectedConceptReference;
  readonly mixedConcept?: MixedConcept;
  readonly finalBlueprint?: CreativeBlueprint;

  readonly status: CreativeBrainSessionStatus;
  readonly askedQuestionIds: readonly string[];
  readonly skippedQuestionIds: readonly string[];
  readonly rejectedQuestionIds: readonly string[];

  readonly stateHistory: readonly CreativeBrainStateTransition[];

  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
