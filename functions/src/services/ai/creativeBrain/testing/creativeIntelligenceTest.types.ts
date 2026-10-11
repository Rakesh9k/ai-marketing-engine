/**
 * PHASE 10.39 — Creative Intelligence Test Types
 * Type definitions for synthetic campaign cases, strategy comparison, diversity scoring,
 * bank coverage evaluation, and generic collapse detection.
 */

export type StrategicCategory =
  | "PSYCHOLOGY"
  | "MECHANISM"
  | "AUDIENCE"
  | "SITUATION"
  | "EMOTION"
  | "STORY"
  | "OFFER_FRAMING"
  | "CTA"
  | "LOCAL_CONTEXT"
  | "STRATEGIC_DIRECTION";

export interface ExpectedStrategyCharacteristic {
  category: StrategicCategory;
  expected: string[];
  reason: string;
}

export interface SyntheticCampaignCase {
  id: string;
  name: string;
  industry: "restaurant" | "salon" | "real_estate" | "generic_local_business";
  businessContext: {
    businessName: string;
    location: string;
    subVertical: string;
    positioning?: string;
    brandTone?: string;
  };
  campaignIntent: {
    objective: "ACQUISITION" | "BOOKINGS" | "ENQUIRIES" | "AWARENESS" | "RETENTION" | "PROMOTION";
    product: string;
    offer?: string;
    audience?: string;
    situation?: string;
    timing?: string;
  };
  expectedStrategicCharacteristics: ExpectedStrategyCharacteristic[];
  forbiddenPatterns?: string[];
  expectedMechanisms?: string[];
  expectedRecipes?: string[];
  expectedPsychologies?: string[];
}

export interface SyntheticStrategyResult {
  caseId: string;
  caseName: string;
  strategicDirection: string;
  psychologyIds: string[];
  mechanismIds: string[];
  recipeIds: string[];
  audienceSituation: string;
  customerTension?: string;
  emotionalTerritory?: string[];
  storyStructureIds?: string[];
  hookPatternIds?: string[];
  visualStructureIds?: string[];
  offerFramingIds?: string[];
  ctaMechanismIds?: string[];
  localContextInfluence?: string[];
  strategicRecommendation: string;
  whyThisStrategy: string;
  thingsToAvoid?: string[];
  diversityContribution?: number;
  confidence: number;
}

export interface StrategyDifference {
  dimension: string;
  similarity: number; // 0.0 (completely different) to 1.0 (identical)
  differences: string[];
  meaningful: boolean;
}

export interface StrategyDiversityScore {
  overallSimilarity: number;
  overallDifferentiation: number;
  psychologyDifference: number;
  mechanismDifference: number;
  recipeDifference: number;
  audienceDifference: number;
  storyDifference: number;
  visualDifference: number;
  offerDifference: number;
  ctaDifference: number;
  meaningfulDifference: boolean;
  explanation: string;
}

export interface GenericStrategySignal {
  detected: boolean;
  genericElements: string[];
  severity: "INFO" | "WARNING" | "CRITICAL";
  explanation: string;
}

export interface CreativeBankCoverageReport {
  psychologyCoverage: { used: number; total: number; percentage: number };
  mechanismCoverage: { used: number; total: number; percentage: number };
  recipeCoverage: { used: number; total: number; percentage: number };
  hookCoverage: { used: number; total: number; percentage: number };
  storyCoverage: { used: number; total: number; percentage: number };
  visualCoverage: { used: number; total: number; percentage: number };
  bankGaps: Array<{ caseId: string; missingCategory: string; reason: string }>;
  bankBias: Array<{ componentId: string; usagePercentage: number; warning: string }>;
}

export type CreativeIntelligenceFailureType =
  | "STRATEGY_COLLISION"
  | "GENERIC_PROMOTION"
  | "BANK_GAP"
  | "BANK_BIAS"
  | "RECIPE_MISMATCH"
  | "MECHANISM_MISMATCH"
  | "PSYCHOLOGY_MISMATCH"
  | "AUDIENCE_MISMATCH"
  | "OBJECTIVE_MISMATCH"
  | "CULTURAL_MISMATCH"
  | "BUSINESS_BRAIN_CONFLICT"
  | "TRUTH_RISK"
  | "DIVERSITY_FAILURE"
  | "FATIGUE_FAILURE"
  | "EXPLAINABILITY_FAILURE"
  | "INVALID_REFERENCE"
  | "ORPHAN_REFERENCE";

export interface CreativeIntelligenceFailure {
  type: CreativeIntelligenceFailureType;
  caseId: string;
  severity: "BLOCKER" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  details: string;
  actual?: any;
  expected?: any;
}

export interface CreativeIntelligenceTestReport {
  testRunId: string;
  totalCasesTested: number;
  passedCount: number;
  failedCount: number;
  warningCount: number;
  strategyCollisionRate: number;
  genericStrategyRate: number;
  coverageReport: CreativeBankCoverageReport;
  failures: CreativeIntelligenceFailure[];
  generatedAt: string;
}
