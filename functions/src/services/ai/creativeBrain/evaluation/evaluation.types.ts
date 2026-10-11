/**
 * Phase 29 — Creative Brain Evaluation Suite Types & Schemas
 * Mitra by BrainWise
 */

import type {
  BusinessContextContract,
  CampaignIntentContract
} from '../types/creativeArchitecture.types';

export type BusinessBrainSnapshot = Partial<BusinessContextContract> & {
  businessId?: string;
  businessType?: string;
  subIndustry?: string;
  positioning?: string;
  location?: string;
  targetAudience?: string[];
  products?: string[];
  strengths?: string[];
  brandTone?: string[];
  constraints?: string[];
};

export type CampaignIntent = Partial<CampaignIntentContract> & {
  objective?: string;
  targetAudience?: string;
  timeframe?: string;
  coreProduct?: string;
  offer?: string;
  unsupportedClaim?: string;
};

export type EvaluationCategory =
  | 'QUESTIONING'
  | 'PROGRESSIVE_DISCLOSURE'
  | 'CONFIDENCE'
  | 'UNCERTAINTY'
  | 'STRATEGIC_TENSION'
  | 'INDUSTRY_FIT'
  | 'CREATIVE_BANK'
  | 'OPPORTUNITY_QUALITY'
  | 'CONCEPT_DIFFERENTIATION'
  | 'TRUTH_DISCIPLINE'
  | 'ADVERSARIAL';

export interface ExpectedQuestionDimension {
  dimension: string; // e.g. 'OCCASION', 'AUDIENCE', 'SERVICE'
  isRequired: boolean;
  acceptableQuestions?: string[];
  forbiddenQuestions?: string[];
}

export interface ExpectedOpportunity {
  expectedTension?: string;
  expectedAudienceSegment?: string;
  expectedStrategicFocus?: string;
  minSpecificityScore?: number; // 0-100
}

export interface ExpectedConceptEvaluation {
  minConceptsCount: number;
  expectedMechanisms?: string[];
  minDifferentiationScore: number; // 0-100
  forbiddenPatterns?: string[];
}

export interface StrategicTensionExpectation {
  conflictType: string;
  expectedState: 'STRATEGIC_TENSION' | 'STRATEGY_LOCK';
  expectedOptions?: string[];
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  category: EvaluationCategory;
  weight: number; // 0 to 1
  minPassingScore: number; // 0 to 100
}

export interface QuestionPathFingerprint {
  businessId: string;
  dimensions: string[];
  orderedDimensions: string[];
  questionTypes: string[];
  informationGainProfile: number[];
  uncertaintyResolutions: string[];
  deferredDimensions: string[];
}

export interface CreativeDecisionTrace {
  decisionType: string;
  inputDimensions: string[];
  selectedFactors: string[];
  evidenceIds: string[];
  confidence: number;
  alternativesConsidered?: string[];
  reasonCode: string;
}

export interface EvaluationFailure {
  caseId: string;
  category: EvaluationCategory;
  reason: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  expected: string;
  observed: string;
}

export interface CreativeBrainEvaluationScore {
  caseId: string;
  businessId: string;
  scenarioName: string;

  questioningScore: number; // 0-100
  progressiveDisclosureScore: number;
  confidenceScore: number;
  uncertaintyScore: number;
  opportunityScore: number;
  conceptQualityScore: number;
  conceptDifferentiationScore: number;
  businessFitScore: number;
  audienceFitScore: number;
  truthDisciplineScore: number;
  strategicTensionScore: number;
  creativeBankRelevanceScore: number;

  overallScore: number; // Composite
  passed: boolean;
  failures: EvaluationFailure[];
  decisionTrace?: CreativeDecisionTrace[];
  evaluatorVersion: string;
}

export interface CreativeEvaluationCase {
  id: string;
  businessId: string;
  name: string;
  description: string;
  category: EvaluationCategory;
  
  campaignIntent: Partial<CampaignIntent>;
  initialBusinessBrain: Partial<BusinessBrainSnapshot>;

  expectedQuestionDimensions?: ExpectedQuestionDimension[];
  forbiddenQuestionPatterns?: string[];

  expectedOpportunity?: ExpectedOpportunity;
  expectedConcept?: ExpectedConceptEvaluation;
  expectedMechanisms?: string[];
  expectedStrategicTensions?: StrategicTensionExpectation[];

  adversarial?: boolean;
  humanEvaluationCriteria?: EvaluationCriterion[];
  version: string;
}

export interface CreativeEvaluationRunReport {
  runId: string;
  startedAt: string;
  completedAt: string;
  suiteVersion: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  criticalFailures: number;
  overallAverageScore: number;

  categoryScores: Record<EvaluationCategory, number>;
  businessScores: Record<string, number>;

  caseScores: CreativeBrainEvaluationScore[];
  failures: EvaluationFailure[];
}
