/**
 * PHASE 23 — Progressive Disclosure UX Types & Contracts
 * Presentation and experience orchestration interfaces for Creative Brain.
 * Translates internal strategic engines into simple, human, adaptive, conversational UX.
 */

export type CreativeUXStage =
  | 'START'
  | 'INTENT'
  | 'SUBJECT'
  | 'AUDIENCE'
  | 'MOTIVATION'
  | 'DIFFERENTIATION'
  | 'OPPORTUNITY'
  | 'CONFIRMATION'
  | 'CONCEPTS'
  | 'MIXING'
  | 'BLUEPRINT'
  | 'EXECUTION';

export interface CreativeQuestionOption {
  id: string;
  label: string;
  description?: string;
  isRecommended?: boolean;
  isUnsure?: boolean;
  payload?: Record<string, any>;
}

export interface CreativeQuestionPresentation {
  questionId: string;
  stage: CreativeUXStage;
  text: string;
  helperText?: string;
  responseType: 'single_select' | 'multi_select' | 'text' | 'confirmation';
  options: CreativeQuestionOption[];
  allowUnsure: boolean;
  allowSkip: boolean;
  inferredValue?: string;
}

export interface CreativeSessionSummary {
  businessName?: string;
  campaignGoal?: string;
  productOrOffer?: string;
  targetAudience?: string;
  keyMotivation?: string;
  uniqueAngle?: string;
  opportunityTitle?: string;
  selectedConceptNames?: string[];
  hasBlueprint?: boolean;
}

export interface CreativeThinkingState {
  isProcessing: boolean;
  message: string;
  progressPercentage?: number;
}

export interface CreativeUXAnswer {
  questionId: string;
  stage: CreativeUXStage;
  selectedOptionIds?: string[];
  freeTextResponse?: string;
  isUnsure?: boolean;
  isSkipped?: boolean;
}

export interface CreativeConceptCard {
  id: string;
  name: string;
  territory: string;
  tagline: string;
  emotionalAngle: string;
  keyIdea: string;
  visualStyle: string;
  hookHeadline: string;
  tone: string;
  whyItWorks: string;
  isDifferentiated: boolean;
}

export interface ConceptMixComponentSelection {
  conceptId: string;
  component: 'idea' | 'visual' | 'hook' | 'tone';
}

export interface CreativeUXState {
  sessionId: string;
  tenantId: string;
  businessId: string;
  stage: CreativeUXStage;
  currentQuestion?: CreativeQuestionPresentation;
  summary: CreativeSessionSummary;
  thinking: CreativeThinkingState;
  opportunity?: {
    id: string;
    title: string;
    rationale: string;
    coreTension: string;
    targetAngle: string;
  };
  concepts?: CreativeConceptCard[];
  selectedConceptId?: string;
  mixedBlueprint?: any;
  history: CreativeUXAnswer[];
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
}
