import type { ID, Version, Score } from "./primitives";
import type { ConfidenceLevel } from "./enums";
import type { BusinessContext } from "./business";
import type { AudienceContext } from "./audience";
import type { CreativeContext, CreativeConstraints } from "./context";
import type { CreativeCompositionInput, CreativeCompositionResult } from "./composition";
import type { CreativeDirection, CreativeDirectionRationale, CreativeDirectionConstraints } from "./directions";
import type { CompositionValidation } from "./validation";
import type { CreativeScore, SourceIntelligenceMap } from "./scoring";
import type { RejectedCandidate, MissingInformation } from "./recovery";
import type { CombinationComponent, CombinationValidation } from "./combinations";
import type { PlatformContext, FormatContext } from "./platforms";

export interface CreativeComposerService {
  compose(
    input: CreativeCompositionInput
  ): Promise<CreativeCompositionResult>;

  composeAlternatives(
    input: CreativeCompositionInput
  ): Promise<CreativeCompositionResult[]>;

  validate(
    direction: CreativeDirection
  ): Promise<CompositionValidation>;

  explain(
    direction: CreativeDirection
  ): CreativeDirectionRationale;
}

export interface CreativeRetrievalRequest {
  context: CreativeContext;
  constraints?: CreativeConstraints;
  limit?: number;
}

export interface CreativeRetrievalCandidate {
  candidateId: ID;
  candidateType: "OPPORTUNITY" | "RECIPE" | "MECHANISM";
  sourceVersion: Version;
  candidateName: string;
  preliminaryFit: Score;
  reasons: string[];
  risks: string[];
  confidence: ConfidenceLevel;
  sourceIntelligence: SourceIntelligenceMap;
}

export interface CreativeRetrievalResult {
  candidates: CreativeRetrievalCandidate[];
  excludedCandidates: RejectedCandidate[];
  noMatch: boolean;
  clarificationRequired: boolean;
  missingInformation: MissingInformation[];
}

export interface CreativeScoringRequest {
  context: CreativeContext;
  candidate: CreativeRetrievalCandidate;
  constraints?: CreativeConstraints;
}

export interface CreativeScoringResult {
  candidateId: ID;
  score: CreativeScore;
  eligible: boolean;
  exclusions: Array<{ code: string; reason: string; severity: "HARD" | "SOFT"; source: string }>;
  rationale: string;
  confidence: ConfidenceLevel;
}

export interface CombinationValidationRequest {
  components: CombinationComponent[];
  context: CreativeContext;
}

export interface CombinationValidationService {
  validate(
    request: CombinationValidationRequest
  ): CombinationValidation;
}

export interface CreativeContextAdapter {
  buildBusinessContext(
    source: unknown
  ): Promise<BusinessContext>;

  buildAudienceContext(
    source: unknown
  ): Promise<AudienceContext>;

  buildCreativeContext(
    input: unknown
  ): Promise<CreativeContext>;
}

export interface CreativeExecutionInput {
  direction: CreativeDirection;
  business: BusinessContext;
  platform: PlatformContext;
  format: FormatContext;
  constraints: CreativeDirectionConstraints;
}
