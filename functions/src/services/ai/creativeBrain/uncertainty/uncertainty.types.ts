/**
 * PHASE 25 — Uncertainty Engine Types & Contracts
 * Structured schemas for User Uncertainty Signals, Grounded Candidates, Resolution Strategies,
 * Cognitive Question Budgets, and Provisional Decision tracking.
 */

import type { CreativeConfidenceDimension } from '../confidence/confidence.types';

export type CreativeUncertaintyType =
  | 'USER_UNCERTAIN'
  | 'USER_DELEGATED'
  | 'SYSTEM_UNCERTAIN'
  | 'INSUFFICIENT_EVIDENCE'
  | 'CONFLICTING_EVIDENCE';

export type UncertaintyResolutionStrategy =
  | 'RETRIEVE_AND_CONFIRM'
  | 'OFFER_GROUNDED_CHOICES'
  | 'ASK_CONCRETE_EXAMPLE'
  | 'ASK_COMPARATIVE_QUESTION'
  | 'ASK_CUSTOMER_STORY'
  | 'ASK_PROOF_QUESTION'
  | 'DEFER'
  | 'MITRA_RECOMMENDS';

export type ConfidenceResolutionStatus =
  | 'UNRESOLVED'
  | 'PARTIALLY_RESOLVED'
  | 'RESOLVED'
  | 'PROVISIONAL'
  | 'DEFERRED'
  | 'USER_DELEGATED';

export interface CreativeUncertaintySignal {
  id: string;
  tenantId: string;
  businessId: string;
  campaignId: string;
  sessionId: string;
  questionId: string;
  dimension: CreativeConfidenceDimension;
  type: CreativeUncertaintyType;
  createdAt: string;
  resolved: boolean;
  resolutionMethod?:
    | 'USER_SELECTION'
    | 'SYSTEM_INFERENCE'
    | 'BUSINESS_BRAIN'
    | 'FOLLOW_UP_QUESTION'
    | 'USER_DELEGATION';
}

export interface CreativeCandidate {
  id: string;
  dimension: CreativeConfidenceDimension;
  value: string;
  label: string;
  description?: string;
  source:
    | 'BUSINESS_BRAIN'
    | 'USER_HISTORY'
    | 'CAMPAIGN_CONTEXT'
    | 'INDUSTRY_KNOWLEDGE'
    | 'CREATIVE_MEMORY'
    | 'PERFORMANCE_MEMORY'
    | 'INFERENCE';
  confidence: number; // 0.00 to 1.00
  evidenceIds: string[];
  requiresConfirmation: boolean;
}

export interface CreativeQuestionBudget {
  questionsAsked: number;
  uncertaintyAttempts: number;
  userUncertaintyCount: number;
  consecutiveUncertaintyCount: number;
  estimatedCognitiveLoad: number;
}

export interface UncertaintyResolutionOption {
  id: string;
  label: string;
  description?: string;
  isNoneOfThese?: boolean;
  isDelegated?: boolean;
  candidatePayload?: CreativeCandidate;
}

export interface UncertaintyResolutionResult {
  sessionId: string;
  campaignId: string;
  dimension: CreativeConfidenceDimension;
  strategy: UncertaintyResolutionStrategy;
  acknowledgementMessage: string;
  promptText: string;
  options: UncertaintyResolutionOption[];
  candidates: CreativeCandidate[];
  attemptsRemaining: number;
  status: ConfidenceResolutionStatus;
  provisionalRecommendation?: CreativeCandidate;
}
