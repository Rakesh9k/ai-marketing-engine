import type { CreativeBrainState, InformationSource } from './creativeQuestion.types';

export type CreativeDecision =
  | 'AUDIENCE'
  | 'OBJECTIVE'
  | 'POSITIONING'
  | 'OFFER_FRAMING'
  | 'CUSTOMER_MOTIVATION'
  | 'CREATIVE_TERRITORY'
  | 'EMOTIONAL_DIRECTION'
  | 'CONCEPT'
  | 'COPY_DIRECTION'
  | 'TONE'
  | 'CTA'
  | 'VISUAL_DIRECTION'
  | 'IMAGE_STYLE'
  | 'FORMAT'
  | 'TEMPLATE'
  | 'CAMPAIGN_ANGLE';

export interface DecisionUncertainty {
  readonly decision: CreativeDecision;
  readonly uncertainty: number; // 0..100
  readonly confidence: number; // 0..1
  readonly currentValue?: unknown;
  readonly candidateValues?: readonly unknown[];
  readonly source: InformationSource;
}

export interface CreativeDecisionChange {
  readonly decision: CreativeDecision;
  readonly before?: unknown;
  readonly afterByAnswer: Record<string, unknown>;
  readonly materiallyChanges: boolean;
  readonly impact: number; // 0..100
}

export interface AnswerCounterfactualPath {
  readonly answerKey: string;
  readonly label: string;
  readonly probability: number; // 0..1
  readonly predictedChanges: readonly CreativeDecisionChange[];
  readonly resultingUncertainty: number; // 0..100
}

export interface InformationGainTrace {
  readonly questionId: string;
  readonly state: CreativeBrainState;
  readonly affectedDecisions: readonly CreativeDecision[];
  readonly currentUncertainty: number;
  readonly answerPaths: readonly AnswerCounterfactualPath[];
  readonly informationGain: number; // 0..100
  readonly materialChangeCount: number;
  readonly informationValue: number;
  readonly userEffort: number;
  readonly recommendation: 'ASK' | 'SKIP' | 'DEFER';
  readonly reason: string;
  readonly timestamp: string;
}

export interface InformationGainResult {
  readonly questionId: string;
  readonly currentDecisionUncertainty: number;
  readonly expectedDecisionUncertainty: number;
  readonly informationGain: number; // 0..100
  readonly creativeImpact: number; // 0..100
  readonly affectedDecisions: readonly CreativeDecision[];
  readonly possibleDecisionChanges: readonly CreativeDecisionChange[];
  readonly recommendation: 'ASK' | 'SKIP' | 'DEFER';
  readonly confidence: number;
  readonly reasoningTrace: InformationGainTrace;
}
