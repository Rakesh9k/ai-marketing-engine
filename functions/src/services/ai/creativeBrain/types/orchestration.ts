import type { ID, ISODateTime, Version } from "./primitives";
import type { ConfidenceLevel, MarketingObjective } from "./enums";
import type { BusinessContext } from "./business";
import type { AudienceContext, AudienceSituationReference } from "./audience";
import type { OfferContext } from "./offers";
import type { ProductContext, CreativeContext, CreativeConstraints, CampaignStage } from "./context";
import type { PlatformContext, FormatContext } from "./platforms";
import type { CreativeOpportunityRecommendation } from "./opportunity";
import type { CreativeDirection } from "./directions";
import type { CreativeVariantSet, CreativeVariant, CreativeVariantStrategy } from "./variants";
import type { RecoveryMetadata, ClarificationQuestion, MissingInformation, BlockingReason } from "./recovery";

export type OrchestratorStatus =
  | "INIT"
  | "LOADING_BUSINESS"
  | "UNDERSTANDING_BUSINESS"
  | "UNDERSTANDING_AUDIENCE"
  | "UNDERSTANDING_SITUATION"
  | "UNDERSTANDING_OBJECTIVE"
  | "IDENTIFYING_OPPORTUNITY"
  | "RETRIEVING_INTELLIGENCE"
  | "RANKING_INTELLIGENCE"
  | "COMPOSING_STRATEGY"
  | "GENERATING_VARIANTS"
  | "VALIDATING_STRATEGY"
  | "EXPLAINING_STRATEGY"
  | "CONFIRMATION_REQUIRED"
  | "CONFIRMED"
  | "REVISION_REQUIRED"
  | "ALTERNATIVE_DIRECTION_READY"
  | "EXECUTION_READY"
  | "EXECUTING"
  | "COMPLETED"

  | "CLARIFICATION_REQUIRED"
  | "INCOMPLETE"
  | "NO_OPPORTUNITY"
  | "NO_VALID_INTELLIGENCE"
  | "NO_VALID_STRATEGY"
  | "NO_DIVERSITY"
  | "CONFLICT"
  | "BLOCKED"
  | "FAILED";

export interface CreativeBrainInput {
  business: BusinessContext;
  audience?: AudienceContext;
  situation?: AudienceSituationReference;
  objective: MarketingObjective;
  product?: ProductContext;
  offer?: OfferContext;
  platform: PlatformContext;
  format: FormatContext;
  campaignStage: CampaignStage;
  constraints?: CreativeConstraints;
  sessionId?: ID;
}

export interface CreativeUnderstandingSummary {
  businessName: string;
  industry: string;
  productOrService: string;
  targetAudience: string;
  situation: string;
  coreOpportunity: string;
  primaryStrategy: CreativeVariantStrategy;
  recommendedDirectionStatement: string;
  alternativeStrategies: CreativeVariantStrategy[];
  whatWeAreDoing: string[];
  whatWeAreNotDoing: string[];
  confidence: ConfidenceLevel;
}

export interface CreativeConfirmation {
  confirmed: boolean;
  selectedVariantId?: ID;
  userNotes?: string;
  confirmedAt: ISODateTime;
}

export type CreativeBrainRevisionType =
  | "CHANGE_AUDIENCE"
  | "CHANGE_SITUATION"
  | "CHANGE_OBJECTIVE"
  | "CHANGE_OFFER"
  | "CHANGE_DIRECTION"
  | "ADD_INFORMATION"
  | "SELECT_VARIANT";

export interface CreativeBrainRevision {
  type: CreativeBrainRevisionType;
  updatedAudience?: AudienceContext;
  updatedSituation?: AudienceSituationReference;
  updatedObjective?: MarketingObjective;
  updatedOffer?: OfferContext;
  selectedVariantId?: ID;
  additionalInformation?: string;
  timestamp: ISODateTime;
}

export interface CreativeBrainSession {
  sessionId: ID;
  businessContext: BusinessContext;
  audienceContext?: AudienceContext;
  situationContext?: AudienceSituationReference;
  objective: MarketingObjective;
  productContext?: ProductContext;
  offerContext?: OfferContext;
  platformContext: PlatformContext;
  formatContext: FormatContext;
  campaignStage: CampaignStage;
  currentState: OrchestratorStatus;
  opportunityRecommendations?: CreativeOpportunityRecommendation[];
  selectedOpportunity?: CreativeOpportunityRecommendation;
  creativeContext?: CreativeContext;
  creativeDirection?: CreativeDirection;
  variantSet?: CreativeVariantSet;
  selectedVariant?: CreativeVariant;
  understandingSummary?: CreativeUnderstandingSummary;
  userConfirmation?: CreativeConfirmation;
  revisions: CreativeBrainRevision[];
  stateHistory: Array<{
    from: OrchestratorStatus;
    to: OrchestratorStatus;
    reason: string;
    timestamp: ISODateTime;
  }>;
  policyVersion: Version;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CreativeBrainOrchestratorSuccess {
  status: "SUCCESS";
  session: CreativeBrainSession;
  summary: CreativeUnderstandingSummary;
  direction?: CreativeDirection;
  variantSet?: CreativeVariantSet;
  nextAction: "USER_CONFIRMATION" | "EXECUTE" | "COMPLETED";
}

export interface CreativeBrainOrchestratorClarification {
  status: "CLARIFICATION_REQUIRED";
  session: CreativeBrainSession;
  questions: ClarificationQuestion[];
  missingInformation: MissingInformation[];
  reason: string;
  nextAction: "ASK_USER";
}

export interface CreativeBrainOrchestratorConfirmationRequired {
  status: "CONFIRMATION_REQUIRED";
  session: CreativeBrainSession;
  summary: CreativeUnderstandingSummary;
  variantSet: CreativeVariantSet;
  nextAction: "USER_CONFIRMATION";
}

export interface CreativeBrainOrchestratorBlocked {
  status: "BLOCKED";
  session: CreativeBrainSession;
  blockingReasons: BlockingReason[];
  recovery: RecoveryMetadata;
  nextAction: "FIX_DEPENDENCY" | "ASK_USER";
}

export interface CreativeBrainOrchestratorFailure {
  status: "FAILED";
  session: CreativeBrainSession;
  code: string;
  message: string;
  recoverable: boolean;
  recovery: RecoveryMetadata;
  nextAction: "RETRY" | "RETURN_ERROR";
}

export type CreativeBrainResult =
  | CreativeBrainOrchestratorSuccess
  | CreativeBrainOrchestratorClarification
  | CreativeBrainOrchestratorConfirmationRequired
  | CreativeBrainOrchestratorBlocked
  | CreativeBrainOrchestratorFailure;
