/**
 * PHASE 24 — Confidence Engine Types & Contracts
 * Complete type definitions for Creative Confidence Dimensions, Evidence, Source Authority,
 * State, Readiness, Propagation, Contradictions, and Question Evaluation.
 */

export type CreativeConfidenceDimension =
  | 'AUDIENCE'
  | 'OBJECTIVE'
  | 'PRODUCT'
  | 'OFFER'
  | 'CUSTOMER_INSIGHT'
  | 'DIFFERENTIATOR'
  | 'EMOTIONAL_DIRECTION'
  | 'PROOF'
  | 'CTA'
  | 'PLATFORM'
  | 'FORMAT';

export type ConfidenceStatus =
  | 'UNKNOWN'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'VERY_HIGH';

export type ConfidenceSourceType =
  | 'BUSINESS_BRAIN'
  | 'USER_EXPLICIT'
  | 'USER_SELECTION'
  | 'USER_TEXT'
  | 'QUESTION_ANSWER'
  | 'INFERENCE'
  | 'CREATIVE_MEMORY'
  | 'PERFORMANCE_MEMORY'
  | 'SYSTEM_DERIVATION';

export interface ConfidenceEvidence {
  id: string;
  source: ConfidenceSourceType;
  strength: number; // 0.00 to 1.00
  explanation: string;
  referenceId?: string;
  eventId?: string;
  createdAt: string;
}

export interface CreativeConfidence {
  dimension: CreativeConfidenceDimension;
  score: number; // 0.00 to 1.00
  status: ConfidenceStatus;
  evidence: ConfidenceEvidence[];
  sourceTypes: ConfidenceSourceType[];
  lastUpdatedAt: string;
  blocking: boolean;
  requiredForCurrentStage: boolean;
  uncertaintyReason?: string;
}

export interface CreativeReadiness {
  overallScore: number; // 0.00 to 1.00
  blockingDimensions: CreativeConfidenceDimension[];
  weakDimensions: CreativeConfidenceDimension[];
  ready: boolean;
  reason: string;
}

export interface CreativeConfidenceContext {
  tenantId: string;
  businessId: string;
  campaignId: string;
  industry?: string;
  objective?: string;
  product?: string;
  offer?: string;
  platform?: string;
  format?: string;
  stage?: string;
}

export interface ConfidenceHistoryEntry {
  id: string;
  campaignId: string;
  dimension: CreativeConfidenceDimension;
  previousScore: number;
  newScore: number;
  reason: string;
  evidenceIds: string[];
  createdAt: string;
}

export interface CreativeConfidenceState {
  campaignId: string;
  tenantId: string;
  businessId: string;
  context: CreativeConfidenceContext;
  dimensions: Record<CreativeConfidenceDimension, CreativeConfidence>;
  overallReadiness: CreativeReadiness;
  lastQuestionId?: string;
  history: ConfidenceHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ConfidenceUpdateRequest {
  campaignId: string;
  tenantId: string;
  businessId: string;
  evidence: Array<{
    dimension: CreativeConfidenceDimension;
    source: ConfidenceSourceType;
    strength: number;
    explanation: string;
    referenceId?: string;
    eventId?: string;
    userContent?: string;
  }>;
  sourceEventId?: string;
}

export interface ConfidenceUpdateResult {
  previousState: CreativeConfidenceState;
  currentState: CreativeConfidenceState;
  changedDimensions: CreativeConfidenceDimension[];
  newlyReadyDimensions: CreativeConfidenceDimension[];
  newlyBlockingDimensions: CreativeConfidenceDimension[];
  readyForOpportunity: boolean;
}

export interface QuestionValue {
  questionId: string;
  text: string;
  targetDimensions: CreativeConfidenceDimension[];
  confidenceGap: number;
  expectedInformationGain: number; // 0.0 to 1.0
  strategicImportance: number; // 0.0 to 1.0
  answerability: number; // 0.0 to 1.0
  contextRelevance: number; // 0.0 to 1.0
  totalValue: number;
}

export type ConfidenceEventType =
  | 'INITIALIZED'
  | 'EVIDENCE_ADDED'
  | 'EVIDENCE_RETRACTED'
  | 'CONFIDENCE_INCREASED'
  | 'CONFIDENCE_DECREASED'
  | 'CONTRADICTION_DETECTED'
  | 'DIMENSION_BECAME_READY'
  | 'DIMENSION_BECAME_BLOCKING'
  | 'QUESTION_SELECTED'
  | 'READY_STATE_REACHED';

export interface DiagnosticConfidenceReport {
  campaignId: string;
  readinessStatus: string;
  overallScore: number;
  blockingDimensions: string[];
  dimensionSummary: Array<{
    dimension: CreativeConfidenceDimension;
    score: number;
    status: ConfidenceStatus;
    blocking: boolean;
    evidenceCount: number;
    topSource: string;
  }>;
  currentBlocker?: string;
  recommendedQuestion?: {
    questionId: string;
    text: string;
    expectedGain: number;
  };
}
