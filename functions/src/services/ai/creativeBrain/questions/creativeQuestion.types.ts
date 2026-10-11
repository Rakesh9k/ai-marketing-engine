import type { CanonicalCreativeBrainState } from '../stateMachineTypes';
export type CreativeBrainState =
  | CanonicalCreativeBrainState
  | 'AUDIENCE_REASONING'
  | 'OFFER_REASONING'
  | 'OPPORTUNITY_DISCOVERY'
  | 'CONCEPT_EVALUATION'
  | 'CREATIVE_BLUEPRINT_FORMATION';

export type CreativeQuestionInputType =
  | 'single_select'
  | 'multi_select'
  | 'ranking'
  | 'slider'
  | 'short_text'
  | 'long_text'
  | 'yes_no'
  | 'product_selector'
  | 'service_selector'
  | 'offer_selector'
  | 'image_upload'
  | 'asset_selector'
  | 'confirmation';

export type InformationSource =
  | 'BUSINESS_BRAIN'
  | 'CURRENT_CAMPAIGN'
  | 'PREVIOUS_ANSWER'
  | 'CREATIVE_PREFERENCE'
  | 'AI_INFERENCE'
  | 'CREATIVE_HYPOTHESIS'
  | 'INDUSTRY_KNOWLEDGE';

export type AuthorityLevel =
  | 'AUTHORITATIVE'
  | 'SUPPORTING'
  | 'INFERRED'
  | 'HYPOTHESIS'
  | 'DOMAIN_GUIDANCE';

export interface QuestionCondition {
  readonly dimension: string;
  readonly operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'in'
    | 'not_in'
    | 'exists'
    | 'missing'
    | 'confidence_above'
    | 'confidence_below';
  readonly value?: unknown;
}

export interface QuestionDependency {
  readonly dimension: string;
  readonly operator: 'equals' | 'contains' | 'exists';
  readonly value?: unknown;
}

export interface AnswerImpact {
  readonly decisionImpact: number; // 0..100
  readonly creativeRelevance: number; // 0..100
  readonly affectedDimensions: readonly string[];
  readonly affectedStates: readonly CreativeBrainState[];
  readonly potentialStrategyChanges?: readonly string[];
}

export interface CreativeQuestionOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly value: string;
  readonly source: 'INDUSTRY_KNOWLEDGE' | 'BUSINESS_BRAIN' | 'CAMPAIGN_CONTEXT' | 'SYSTEM';
  readonly confidence?: number;
}

export interface CreativeQuestion {
  readonly id: string;
  readonly dimension: string;
  readonly question: string;
  readonly purpose: string;
  readonly inputType: CreativeQuestionInputType;
  readonly options?: readonly CreativeQuestionOption[];
  readonly required: boolean;
  readonly priority: number; // 0..100
  readonly dependsOn?: readonly QuestionDependency[];
  readonly showWhen?: readonly QuestionCondition[];
  readonly skipWhen?: readonly QuestionCondition[];
  readonly answerImpact: AnswerImpact;
  readonly confidenceThreshold?: number;
  readonly userEffort: number; // 0..100
  readonly decisionImpact: number; // 0..100
  readonly creativeRelevance: number; // 0..100
  readonly affectsStates: readonly CreativeBrainState[];
  readonly affectsDecisions: readonly string[];
  readonly allowedSources?: readonly InformationSource[];
  readonly metadata?: {
    readonly industryKnowledgeVersion?: string;
    readonly source?: string;
  };
}

export interface KnownCreativeFact {
  readonly dimension: string;
  readonly value: unknown;
  readonly source: InformationSource;
  readonly authority: AuthorityLevel;
  readonly confidence: number; // 0..1
  readonly scope: 'BUSINESS' | 'CAMPAIGN' | 'PRODUCT' | 'CREATIVE';
}

export interface KnownContextMap {
  readonly [dimension: string]: KnownCreativeFact;
}

export interface MissingCreativeInformation {
  readonly dimension: string;
  readonly state: 'UNKNOWN' | 'PARTIAL' | 'CONFLICTING';
  readonly uncertainty: number; // 0..100
  readonly decisionImpact: number; // 0..100
  readonly creativeRelevance: number; // 0..100
  readonly estimatedAnswerValue: number; // 0..100 (Information Value)
  readonly affectedDecisions: readonly string[];
  readonly recommendedAction: 'SKIP' | 'INFER' | 'ASK';
}

export interface CreativeInformationSufficiency {
  readonly sufficient: boolean;
  readonly confidence: number;
  readonly missingHighImpactDimensions: readonly string[];
  readonly blockingDecisions: readonly string[];
  readonly recommendation: 'PROCEED' | 'ASK' | 'INFER' | 'FALLBACK';
}

export interface CreativeAnswer {
  readonly questionId: string;
  readonly dimension: string;
  readonly rawAnswer: unknown;
  readonly normalizedValue: unknown;
  readonly quality: {
    readonly specificity: 'high' | 'medium' | 'low';
    readonly completeness: 'high' | 'medium' | 'low';
    readonly decisionUsefulness: number; // 0..100
  };
  readonly timestamp: string;
}

export interface CreativeQuestionSession {
  readonly sessionId: string;
  readonly askedQuestionIds: readonly string[];
  readonly answers: readonly CreativeAnswer[];
  readonly skippedQuestionIds: readonly string[];
  readonly inferredDimensions: readonly string[];
  readonly userFatigueCount: number;
  readonly timestamp: string;
}

export interface DynamicQuestionTrace {
  readonly state: CreativeBrainState;
  readonly knownDimensions: readonly string[];
  readonly missingDimensions: readonly string[];
  readonly candidateQuestionIds: readonly string[];
  readonly rejectedQuestionIds: readonly string[];
  readonly informationValueScores: readonly {
    readonly questionId: string;
    readonly score: number;
  }[];
  readonly selectedQuestionId?: string;
  readonly action: 'ASK' | 'INFER' | 'SKIP' | 'PROCEED' | 'FALLBACK';
  readonly industryKnowledgeVersion?: string;
  readonly decisionChangingRateEstimate?: number;
  readonly timestamp: string;
}

export interface InferredCreativeValue {
  readonly dimension: string;
  readonly value: unknown;
  readonly confidence: number;
  readonly source: string;
}

export interface DynamicQuestionEngineResult {
  readonly action: 'ASK' | 'INFER' | 'SKIP' | 'PROCEED' | 'FALLBACK';
  readonly question?: CreativeQuestion;
  readonly inferredValues?: readonly InferredCreativeValue[];
  readonly missingInformation: readonly MissingCreativeInformation[];
  readonly sufficiency: CreativeInformationSufficiency;
  readonly reasoning: {
    readonly summary: string;
    readonly selectedReason?: string;
    readonly informationValue?: number;
  };
  readonly trace: DynamicQuestionTrace;
}
