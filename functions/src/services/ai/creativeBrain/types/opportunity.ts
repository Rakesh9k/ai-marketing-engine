import type { ID } from "./primitives";
import type { ConfidenceLevel, IntelligenceStatus, MarketingObjective } from "./enums";
import type { EvidenceReference } from "./evidence";
import type { Assumption } from "./assumptions";
import type { CreativeScore, SourceIntelligenceMap } from "./scoring";

export interface InsightPatternReference {
  id: ID;
  surfaceObservation: string;
  underlyingTension: string;
  humanMotivation: string;
  barrier?: string;
  desiredOutcome: string;
  marketingOpportunity: string;
  audienceSituationIds: ID[];
  evidenceIds: ID[];
  assumptions: Assumption[];
  confidence: ConfidenceLevel;
  status: IntelligenceStatus;
}

export interface CreativeOpportunity {
  id: ID;
  name: string;
  definition: string;
  strategicPurpose: string;
  audienceSituationIds: ID[];
  insightIds: ID[];
  objectiveTypes: MarketingObjective[];
  psychologyIds: ID[];
  mechanismIds: ID[];
  compatiblePlatforms?: ID[];
  compatibleFormats?: ID[];
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  evidence: EvidenceReference[];
  assumptions: Assumption[];
  confidence: ConfidenceLevel;
  status: IntelligenceStatus;
}

export interface CreativeOpportunityRecommendation {
  opportunity: CreativeOpportunity;
  score: CreativeScore;
  rank: number;
  rationale: string;
  supportingIntelligence: SourceIntelligenceMap;
  risks: string[];
  confidence: ConfidenceLevel;
}
