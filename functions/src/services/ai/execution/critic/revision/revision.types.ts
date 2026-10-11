/**
 * PHASE 20 — Critic-Driven Regeneration & Revision Types
 * Types for Revision Planning, Preservation Constraints, Component-Level Mutability,
 * Regression Detection, and Iterative Loop State Machine.
 */

import type { CriticDimensionName } from '../creativeCritic.types';

export type RevisionDimension = CriticDimensionName;

export type ExecutionComponent =
  | 'creativeBlueprint'
  | 'coreConcept'
  | 'creativeMechanism'
  | 'emotionalDirection'
  | 'offer'
  | 'brandIdentity'
  | 'hook'
  | 'headline'
  | 'supportingCopy'
  | 'heroImage'
  | 'secondaryImage'
  | 'visualComposition'
  | 'typography'
  | 'layout'
  | 'offerTreatment'
  | 'cta'
  | 'brandTreatment'
  | 'openingHook'
  | 'scriptBeat'
  | 'shot'
  | 'visual'
  | 'voiceover'
  | 'motion'
  | 'caption'
  | 'transition'
  | 'music'
  | 'ending';

export type RevisionStrategy =
  | 'MICRO_ADJUSTMENT'
  | 'COMPONENT_REGENERATION'
  | 'PARTIAL_RECOMPOSITION'
  | 'TARGETED_REGENERATION'
  | 'FULL_EXECUTION_RETRY'
  | 'HUMAN_REVIEW';

export interface PreservationConstraint {
  component: ExecutionComponent;
  reason: string;
  source: 'BLUEPRINT' | 'CRITIC' | 'USER' | 'BUSINESS_BRAIN' | 'VALIDATION';
  strictness: 'HARD' | 'SOFT';
}

export interface ExpectedImprovement {
  dimension: RevisionDimension;
  baselineScore: number;
  expectedMinScore: number;
}

export interface RegressionConstraint {
  dimension: RevisionDimension;
  baselineScore: number;
  maximumAllowedDrop: number; // Max score drop allowed (e.g. 5 points)
}

export interface CreativeRevisionPlan {
  planId: string;
  campaignId: string;
  blueprintId: string;
  blueprintVersion: number;
  sourceExecutionId: string;
  sourceCriticResultId: string;
  revisionNumber: number;
  targetDimensions: RevisionDimension[];
  protectedDimensions: RevisionDimension[];
  mutableComponents: ExecutionComponent[];
  immutableComponents: ExecutionComponent[];
  preservationConstraints: PreservationConstraint[];
  revisionStrategy: RevisionStrategy;
  targetedInstruction: string;
  expectedImprovements: ExpectedImprovement[];
  regressionConstraints: RegressionConstraint[];
  maxAttempts: number; // Default 2
  status: 'PLANNED' | 'EXECUTING' | 'EVALUATING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface RevisionEligibility {
  eligible: boolean;
  reason: string;
  targetDimensions: RevisionDimension[];
  estimatedCost: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ExecutionCreditContext {
  rootGenerationId: string;
  reservedCredits: number;
  consumedCredits: number;
  internalRevisionBudget: number; // Max internal retries without extra billing
  internalRevisionsUsed: number;
}

export interface RevisionAcceptanceResult {
  accepted: boolean;
  reason: string;
  chosenExecutionId: string;
  improvementDelta: number;
  regressionsDetected: string[];
}
