// File: functions/src/services/creativeIntelligence/ontology/creative-scoring.types.ts

import type { ConfidenceLevel } from './ontology-types';

/**
 * Full scoring result for a candidate creative direction.
 */
export interface CreativeScore {
  total: number; // 0‑100 final score
  components: CreativeScoreComponents;
  penalties: CreativeScorePenalties;
  scoreVersion: string; // e.g., "CreativeScoringPolicy_v1"
  confidence: ConfidenceLevel;
  explanation: CreativeScoreExplanation;
}

/**
 * Individual component scores used in the deterministic weighting.
 */
export interface CreativeScoreComponents {
  contextFit: ScoreComponent;
  audienceFit: ScoreComponent;
  objectiveFit: ScoreComponent;
  productFit: ScoreComponent;
  psychologyFit: ScoreComponent;
  formatFit: ScoreComponent;
  platformFit: ScoreComponent;
  styleFit: ScoreComponent;
  historicalPerformance: ScoreComponent;
}

/**
 * Generic component definition used for both positive dimensions and penalties.
 */
export interface ScoreComponent {
  score: number; // raw 0‑100 score for this dimension
  weight: number; // weight from the policy (e.g., 15)
  weightedScore: number; // score * weight / 100 (or similar)
  rationale: string; // human readable explanation of why the score is what it is
  evidence: EvidenceReference[]; // links to supporting intelligence / historical evidence
  confidence: ConfidenceLevel;
  missingInformation: string[]; // fields that were unknown and thus reduced confidence
}

/**
 * Penalty definitions that are sub‑tracted from the base score.
 */
export interface CreativeScorePenalties {
  conflictPenalty: PenaltyComponent;
  riskPenalty: PenaltyComponent;
  evidencePenalty?: PenaltyComponent;
  operationalPenalty?: PenaltyComponent;
}

export interface PenaltyComponent {
  amount: number; // points to subtract (positive number)
  reasons: string[]; // explanatory list
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  hardExclusionTriggered: boolean; // true when this penalty is actually a hard block
}

/**
 * Explanation object that can be turned into natural‑language output.
 */
export interface CreativeScoreExplanation {
  summary: string; // concise high‑level summary
  strongestReasons: string[]; // top‑scoring dimensions
  weakestAreas: string[]; // low‑scoring dimensions
  penalties: string[]; // human‑readable penalty descriptions
  historicalEvidence: string[]; // textual descriptions of performance data
  uncertainty: string[]; // missing or inferred fields
  assumptions: string[]; // explicit assumptions made during scoring
  whySelected: string; // final justification for primary recommendation
  whyNotAlternatives?: string[]; // optional why others were not chosen
}

/**
 * Supporting types used by the scoring engine.
 */
export interface EvidenceReference {
  type: 'HISTORICAL' | 'INTELLIGENCE' | 'RULE' | 'ASSET';
  id: string;
  description: string;
}

/**
 * Historical performance data shape used by the scorer.
 */
export interface HistoricalPerformanceScore {
  score: number; // 0‑100 normalized performance contribution
  sampleSize: number;
  evidenceStrength: ConfidenceLevel;
  similarity: number; // 0‑1 similarity to current context
  outcomes: any[]; // placeholder for performance signals
  contexts: any[]; // placeholder for historical contexts
  explanation: string;
  alternativeExplanations: string[];
  recency?: number; // days since last observation
  confidence: ConfidenceLevel;
}

/**
 * Minimal candidate shape – the retrieval engine already returns a CreativeOpportunityRecommendation.
 * We keep a separate alias for readability.
 */
export type CreativeCandidate = import('../ontology/creative-opportunity.types').CreativeOpportunityRecommendation;

/**
 * Policy version identifier – will be exported from the policy file.
 */
export const SCORING_POLICY_VERSION = 'CreativeScoringPolicy_v1';
