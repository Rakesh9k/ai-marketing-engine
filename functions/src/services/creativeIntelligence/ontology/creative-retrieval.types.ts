// File: functions/src/services/creativeIntelligence/ontology/creative-retrieval.types.ts

import type { ConfidenceLevel } from './ontology-types';

/**
 * Supporting intelligence component used in the retrieval explanation.
 */
export interface SupportingIntelligence {
  type:
    | 'PSYCHOLOGY'
    | 'INSIGHT'
    | 'MECHANISM'
    | 'HOOK'
    | 'STORY'
    | 'VISUAL'
    | 'COPY'
    | 'OFFER'
    | 'STYLE'
    | 'CTA'
    | 'PLATFORM';
  id: string;
  name: string;
  role: string;
}

/**
 * Candidate excluded during retrieval.
 */
export interface ExcludedCandidate {
  candidateId: string;
  candidateType: string;
  reasonCode: string;
  reason: string;
  recoverable: boolean;
}

/**
 * Explanation of the retrieval process.
 */
export interface RetrievalExplanation {
  contextSummary: string;
  strongestSignal: string;
  primaryReason: string;
  supportingSignals: string[];
  excludedStrategies: string[];
  uncertainty: string[];
  assumptions: string[];
  confidence: ConfidenceLevel;
}

export interface CreativeOpportunityRecommendation {
  opportunityId: string;
  name: string;
  description: string;
  score: number;
}

export interface RecipeRecommendation {
  recipeId: string;
  name: string;
  score: number;
}

/**
 * Full result returned by the Creative Retrieval Engine.
 */
export interface CreativeRetrievalResult {
  contextId: string;
  opportunities: CreativeOpportunityRecommendation[];
  primaryOpportunity?: CreativeOpportunityRecommendation;
  alternativeOpportunities: CreativeOpportunityRecommendation[];
  matchedRecipes: RecipeRecommendation[];
  supportingIntelligence: SupportingIntelligence[];
  excludedCandidates: ExcludedCandidate[];
  noStrongMatch: boolean;
  retrievalExplanation: RetrievalExplanation;
  confidence: ConfidenceLevel;
  policyVersion: string;
}
