import type { ID, Score, Version } from "./primitives";

export interface CreativeScore {
  contextFit: Score;
  audienceFit: Score;
  objectiveFit: Score;
  productFit: Score;
  psychologyFit: Score;
  formatFit: Score;
  platformFit: Score;
  styleFit: Score;
  historicalPerformance: Score;
  conflictPenalty: number;
  riskPenalty: number;
  finalScore: Score;
  scorePolicyVersion: Version;
  explanation: string;
}

export type CandidateType =
  | "OPPORTUNITY"
  | "RECIPE"
  | "MECHANISM"
  | "COMPOSITION";

export interface ExclusionReason {
  code: string;
  reason: string;
  severity: "HARD" | "SOFT";
  source: string;
}

export interface CandidateEvaluation {
  candidateId: ID;
  candidateType: CandidateType;
  eligible: boolean;
  score?: CreativeScore;
  reasons: string[];
  exclusions: ExclusionReason[];
  warnings: string[];
}

export interface SourceIntelligenceMap {
  audienceSituationId?: ID;
  insightIds: ID[];
  psychologyIds: ID[];
  mechanismIds: ID[];
  hookPatternIds: ID[];
  storyStructureIds: ID[];
  visualStructureIds: ID[];
  copyStructureIds: ID[];
  offerStructureIds: ID[];
  styleSystemIds: ID[];
  ctaIntentIds: ID[];
  platformIds: ID[];
  combinationRuleIds: ID[];
  recipeIds: ID[];
}
