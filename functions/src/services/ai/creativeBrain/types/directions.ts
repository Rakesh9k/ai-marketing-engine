import type { ID, Version, ISODateTime, Score, DurationRange } from "./primitives";
import type { ConfidenceLevel, AwarenessStage, PurchaseIntentLevel, MarketingObjective, CreativeDirectionStatus } from "./enums";
import type { EvidenceReference, EvidenceRequirement } from "./evidence";
import type { Assumption } from "./assumptions";
import type { CulturalContext } from "./business";
import type { AudienceSituationReference } from "./audience";
import type { PsychologyDirection } from "./psychology";
import type { MechanismDirection } from "./mechanisms";
import type { HookDirection } from "./hooks";
import type { StoryDirection } from "./stories";
import type { VisualDirection } from "./visuals";
import type { CopyDirection } from "./copy";
import type { StyleDirection } from "./styles";
import type { OfferDirection } from "./offers";
import type { CTADirection } from "./cta";
import type { PlatformContext, FormatContext, PlatformExpressionConstraints, SafeArea } from "./platforms";
import type { CombinationValidation } from "./combinations";
import type { CreativeScore, SourceIntelligenceMap } from "./scoring";

export { CreativeDirectionStatus };

export interface CoreIdea {
  statement: string;
  shortVersion: string;
  strategicMeaning: string;
  audienceProblem: string;
  desiredShift: string;
  businessRole: string;
}

export interface StrategicWhy {
  problem: string;
  tension: string;
  motivation: string;
  opportunity: string;
  objectiveConnection: string;
  businessConnection: string;
  whyNow?: string;
  whyThisDirection: string;
}

export interface AudienceDirection {
  audienceDescription: string;
  situation: AudienceSituationReference;
  motivation: string[];
  barriers: string[];
  desiredOutcome: string;
  awarenessStage?: AwarenessStage;
  purchaseIntent?: PurchaseIntentLevel;
  decisionState?: string;
}

export interface SituationDirection {
  situationId?: ID;
  description: string;
  trigger?: string;
  context: string;
  tension: string;
  timing?: string;
  culturalContext?: CulturalContext;
  strategicImplication: string;
}

export interface ObjectiveDirection {
  objective: MarketingObjective;
  desiredAudienceBehavior: string;
  successMeaning: string;
  strategicRole: string;
}

export interface InsightDirection {
  insightId: ID;
  surfaceObservation?: string;
  underlyingTension: string;
  humanMotivation: string;
  barrier?: string;
  desiredOutcome: string;
  marketingOpportunity: string;
  confidence: ConfidenceLevel;
  rationale: string;
}

export interface PlatformDirection {
  platform: PlatformContext;
  format: FormatContext;
  expressionConstraints: PlatformExpressionConstraints;
  aspectRatio?: string;
  duration?: DurationRange;
  textDensity?: "LOW" | "MEDIUM" | "HIGH";
  safeAreas?: SafeArea[];
  pacing?: "SLOW" | "MODERATE" | "FAST" | "VARIABLE";
  contentDensity?: "LOW" | "MEDIUM" | "HIGH";
  ctaBehavior?: string;
}

export interface CreativeDirectionConstraints {
  requiredFacts: string[];
  prohibitedClaims: string[];
  requiredEvidence: EvidenceRequirement[];
  requiredAssets: string[];
  prohibitedTreatments: string[];
  businessConstraints: string[];
  brandConstraints: string[];
  platformConstraints: string[];
  culturalConstraints: string[];
  operationalConstraints: string[];
}

export interface CompositionCoherence {
  score: Score;
  strategicCoherence: Score;
  psychologicalCoherence: Score;
  narrativeCoherence: Score;
  offerCoherence: Score;
  visualCoherence: Score;
  behavioralCoherence: Score;
  platformCoherence: Score;
  brandCoherence: Score;
  conflicts: string[];
  rationale: string;
  policyVersion: Version;
}

export interface AlternativeDirectionExplanation {
  directionId?: ID;
  name: string;
  score: CreativeScore;
  whyConsidered: string;
  whyNotSelected: string;
  tradeoffs: string[];
  confidence: ConfidenceLevel;
}

export interface CreativeDirectionRationale {
  coreReason: string;
  audienceReason: string;
  situationReason: string;
  objectiveReason: string;
  mechanismReason: string;
  psychologyReason: string;
  offerReason?: string;
  storyReason: string;
  visualReason: string;
  styleReason: string;
  ctaReason: string;
  platformReason: string;
  alternativeDirections?: AlternativeDirectionExplanation[];
  risks: string[];
  assumptions: Assumption[];
  evidence: EvidenceReference[];
  confidence: ConfidenceLevel;
}

export interface CreativeDirection {
  id: ID;
  version: Version;
  status: CreativeDirectionStatus;
  coreIdea: CoreIdea;
  strategicWhy: StrategicWhy;
  audience: AudienceDirection;
  situation: SituationDirection;
  objective: ObjectiveDirection;
  insight?: InsightDirection;
  offer?: OfferDirection;
  psychology: PsychologyDirection;
  creativeMechanism: MechanismDirection;
  hook: HookDirection;
  story: StoryDirection;
  visual: VisualDirection;
  copy: CopyDirection;
  style: StyleDirection;
  cta: CTADirection;
  platform: PlatformDirection;
  combinationValidation: CombinationValidation;
  compositionCoherence: CompositionCoherence;
  constraints: CreativeDirectionConstraints;
  evidence: EvidenceReference[];
  assumptions: Assumption[];
  risks: string[];
  confidence: ConfidenceLevel;
  score: CreativeScore;
  rationale: CreativeDirectionRationale;
  sourceIntelligence: SourceIntelligenceMap;
  composerPolicyVersion: Version;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/**
 * Phase 10.31 — Canonical Strategic Direction Candidate
 */
export interface StrategicDirectionCandidate {
  id: ID;
  sessionId: ID;
  campaignId?: ID;
  tenantId?: ID;
  name: string;
  shortLabel: string;
  strategicThesis: string;
  audience: string;
  customerTension: string;
  desiredEmotion: string;
  marketingObjective: string;
  psychology: Array<{ id: ID; name: string; category?: string }>;
  mechanisms: Array<{ id: ID; name: string; category?: string }>;
  concept: string;
  hookTerritory: string;
  visualTerritory: string;
  copyTerritory: string;
  offerTreatment: string;
  ctaTreatment: string;
  formatRecommendations?: string[];
  strategicRationale: string;
  whyItFits: string;
  whyDifferentFromCurrent?: string;
  strengths: string[];
  tradeoffs: string[];
  risks: string[];
  thingsToAvoid: string[];
  bestWhen: string[];
  avoidWhen: string[];
  evidence: Array<{ scope: string; claim: string }>;
  compatibilityScore: number;
  strategicFitScore: number;
  distinctivenessScore: number;
  viabilityScore: number;
  confidence: number;
  source: "RECOMMENDED" | "EXPLORED" | "USER_SELECTED";
  status: "CANDIDATE" | "ACTIVE" | "REJECTED" | "ARCHIVED";
  version?: number;
  createdAt: ISODateTime;
}

export interface DirectionDiversityProfile {
  strategicAxis: string;
  psychologyFamily: string;
  mechanismFamily: string;
  emotionalTerritory: string;
  customerTension: string;
  communicationFrame: string;
}

export interface StrategicDistance {
  directionA: string;
  directionB: string;
  psychologyDistance: number;
  mechanismDistance: number;
  emotionalDistance: number;
  messagingDistance: number;
  totalDistance: number;
}

export interface StrategicExploreDirectionRequest {
  sessionId: string;
  campaignId?: string;
  tenantId: string;
  currentDirectionId: string;
  count?: number;
  requestedMode?: "STRATEGIC" | "EMOTIONAL" | "PRACTICAL" | "BOLD" | "SAFE" | "UNEXPECTED";
  excludeDirectionIds?: string[];
  userPreferences?: string[];
}

export interface ExploreDirectionsResult {
  currentDirection: StrategicDirectionCandidate;
  alternatives: StrategicDirectionCandidate[];
  comparison?: DirectionComparison[];
  explorationSummary: string;
  confidence: number;
}

export interface DirectionDifference {
  currentDirection: string;
  alternativeDirection: string;
  keyShift: string;
  changedPsychology: string;
  changedMechanism: string;
  changedEmotionalTerritory: string;
}

export interface DirectionComparison {
  directionId: string;
  directionName: string;
  audienceFit: number;
  objectiveFit: number;
  businessFit: number;
  offerFit: number;
  evidenceStrength: number;
  distinctiveness: number;
  creativePotential: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

export interface DirectionSwitchImpact {
  preserved: string[];
  regenerated: string[];
  invalidated: string[];
  newlyIntroduced: string[];
}

export interface DirectionSelectionResult {
  selectedDirection: StrategicDirectionCandidate;
  impact: DirectionSwitchImpact;
  reasoningTraceId: string;
  version: number;
}

export interface DirectionHypothesis {
  directionId: string;
  hypothesis: string;
  successMetric: "CTR" | "ENGAGEMENT" | "CONVERSION" | "LEADS" | "MESSAGES" | "REVENUE";
  baseline?: number;
  expectedImprovement?: number;
  confidence: number;
}

export interface DirectionPerformance {
  directionId: string;
  campaignCount: number;
  impressions?: number;
  engagementRate?: number;
  ctr?: number;
  conversionRate?: number;
  leadRate?: number;
  revenue?: number;
  confidence: number;
  comparisonBaseline?: string;
}

