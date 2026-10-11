/**
 * PHASE 17 — Strategy Fidelity Layer Types
 * Types and interfaces for enforcing strategic fidelity between approved
 * Creative Blueprints and Mitra's Execution Engine.
 */

import type { CanonicalCreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';

export type CreativeBlueprint = CanonicalCreativeBlueprint;

export interface StrategicFields {
  campaignObjective: string;
  audience: string;
  creativeOpportunity: string;
  coreConcept: string;
  humanInsight: string;
  creativeMechanism: string;
  emotionalDirection: string;
  messageHierarchy: string[];
  offerStrategicRole: string;
}

export type LockStatus = 'LOCKED' | 'UNLOCKED' | 'REVOKED';

export interface StrategyLock {
  id: string;
  blueprintId: string;
  strategicHash: string;
  lockedAt: string;
  version: number;
  immutableFields: StrategicFields;
  status: LockStatus;
}

export type ReinterpretationType =
  | 'OFFER_DOMINANCE'
  | 'TONE_SHIFT'
  | 'CONCEPT_REPLACEMENT'
  | 'MESSAGE_HIERARCHY_REVERSAL'
  | 'EMOTIONAL_DRIFT';

export interface ForbiddenReinterpretation {
  type: ReinterpretationType;
  description: string;
  rule: string;
}

export interface StrategyManifest {
  lockId: string;
  strategicHash: string;
  promptDirectives: string[];
  forbiddenReinterpretations: ForbiddenReinterpretation[];
  offerRoleConstraint: string;
  messagePriorityList: string[];
  brandTruthGuards: string[];
}

export interface StrategyLineage {
  lockId: string;
  blueprintId: string;
  parentConceptIds: string[];
  businessBrainVersion: string;
}

export interface OfferDominancePolicy {
  maxOfferProminenceScore: number; // 0 to 100
  priceShockAllowed: boolean;
  rules: string[];
}

export interface StrategyFidelityScoreBreakdown {
  coreConcept: number; // Max 20
  creativeMechanism: number; // Max 15
  audienceTension: number; // Max 15
  messageHierarchy: number; // Max 15
  emotionalDirection: number; // Max 10
  visualDirection: number; // Max 10
  offerRole: number; // Max 5
  tone: number; // Max 5
  ctaIntent: number; // Max 5
}

export interface StrategyFidelityScore {
  overallScore: number; // 0 to 100
  breakdown: StrategyFidelityScoreBreakdown;
  passesThreshold: boolean; // >= 80
}

export interface StrategyDriftResult {
  hasDrift: boolean;
  driftScore: number;
  driftFactors: string[];
  violations: string[];
  offerDominanceDetected: boolean;
}

export interface StrategyFidelityResult {
  isFitted: boolean;
  score: StrategyFidelityScore;
  drift: StrategyDriftResult;
  manifest: StrategyManifest;
  approved: boolean;
  reason?: string;
}

export interface ExecutionRequest {
  requestId: string;
  blueprint: CreativeBlueprint;
  lock: StrategyLock;
  manifest: StrategyManifest;
  promptOverrides?: Record<string, unknown>;
}

export interface ExecutionCandidateOutput {
  headline?: string;
  copy?: string;
  visualConcept?: string;
  offerProminence?: number; // 0 to 100
  tone?: string;
  cta?: string;
  primaryFocus?: string;
}
