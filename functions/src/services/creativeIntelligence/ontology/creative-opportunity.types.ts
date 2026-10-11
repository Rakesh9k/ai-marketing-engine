// File: functions/src/services/creativeIntelligence/ontology/creative-opportunity.types.ts

import type { ConfidenceLevel } from './ontology-types';

/**
 * Represents a ranked Creative Opportunity recommendation.
 */
export interface CreativeOpportunityRecommendation {
  id: string;
  name: string;
  definition: string;
  score: number; // 0‑100 deterministic score
  confidence: ConfidenceLevel;
  opportunityType:
    | 'PSYCHOLOGICAL'
    | 'PROBLEM_SOLUTION'
    | 'VALUE'
    | 'TRUST'
    | 'DISCOVERY'
    | 'DEMONSTRATION'
    | 'IDENTITY'
    | 'COMMUNITY'
    | 'CONVENIENCE'
    | 'EXPERIENCE'
    | 'OFFER'
    | 'RETENTION'
    | 'REACTIVATION'
    | 'SEASONAL'
    | 'POSITIONING';
  primaryPsychology: string[];
  supportingPsychology: string[];
  insightIds: string[];
  mechanismIds: string[];
  hookPatternIds: string[];
  storyStructureIds: string[];
  visualStructureIds: string[];
  copyStructureIds: string[];
  offerStructureIds: string[];
  styleSystemIds: string[];
  ctaIntentIds: string[];
  platformIds: string[];
  recipeIds: string[];
  rationale: string;
  audienceFit: number;
  situationFit: number;
  objectiveFit: number;
  productFit: number;
  offerFit: number;
  businessFit: number;
  platformFit: number;
  formatFit: number;
  evidenceFit: number;
  combinationFit: number;
  riskScore: number;
  missingInformation: string[];
  assumptions: string[];
  risks: string[];
  compatibleRecipes: string[];
  conflicts: string[];
}
