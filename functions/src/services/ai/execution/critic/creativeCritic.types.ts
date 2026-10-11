/**
 * PHASE 19 — Creative Critic Types & Contracts
 * Complete types for the independent Creative Critic service, 10 evaluation dimensions,
 * evidence tracking, decision engine, revision requests, and regression comparison.
 */

import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import type { CombinedValidationResults, FinalPostAsset, FinalReelAsset } from '../types/execution.types';

export type CriticDimensionName =
  | 'hook'
  | 'relevance'
  | 'originality'
  | 'businessFit'
  | 'conceptFidelity'
  | 'visualCommunication'
  | 'offerClarity'
  | 'brand'
  | 'platformFit'
  | 'conversion';

export interface CriticDimension {
  name: CriticDimensionName;
  score: number; // 0 to 100
  weight: number; // 0.0 to 1.0
  assessment: string;
  evidence: string[];
  confidence: number; // 0.0 to 1.0
}

export type CriticDecision = 'APPROVE' | 'REVISE' | 'REJECT';

export interface CriticIssue {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dimension: CriticDimensionName;
  issue: string;
  evidence: string;
  recommendedAction:
    | 'REGENERATE'
    | 'RECOMPOSE'
    | 'REWRITE'
    | 'REVISE_EXECUTION'
    | 'REVIEW_BLUEPRINT';
}

export interface CriticRecommendation {
  priority: number;
  target:
    | 'HOOK'
    | 'VISUAL'
    | 'COPY'
    | 'COMPOSITION'
    | 'OFFER'
    | 'CTA'
    | 'MOTION'
    | 'AUDIO'
    | 'PLATFORM';
  problem: string;
  recommendation: string;
  blueprintConstraint: string;
  preserve: string[];
}

export interface CriticBusinessContext {
  businessId: string;
  name: string;
  industry: string;
  subVertical: string;
  positioning: string;
  brandVoice?: {
    tone: string;
  };
}

export interface CriticPlatformContext {
  platform: string;
  format: string;
  aspectRatio: string;
}

export type CriticAsset = FinalPostAsset | FinalReelAsset;

export interface CreativeCriticInput {
  campaignId: string;
  blueprintId: string;
  blueprintVersion: number;
  strategyHash: string;
  blueprint: CreativeBlueprint;
  businessContext: CriticBusinessContext;
  platformContext: CriticPlatformContext;
  asset: CriticAsset;
  validationResults: CombinedValidationResults;
  executionMetadata?: Record<string, unknown>;
}

export interface CreativeCriticWeights {
  hook: number;               // Default 0.10
  relevance: number;          // Default 0.12
  originality: number;        // Default 0.10
  businessFit: number;        // Default 0.10
  conceptFidelity: number;    // Default 0.15
  visualCommunication: number; // Default 0.10
  offerClarity: number;       // Default 0.08
  brand: number;              // Default 0.08
  platformFit: number;        // Default 0.07
  conversion: number;         // Default 0.10
}

export interface CreativeCriticResult {
  campaignId: string;
  blueprintId: string;
  blueprintVersion: number;
  assetId: string;
  overallScore: number; // 0 to 100
  twoSecondUnderstanding?: string; // What customer understands in 2s
  fiveSecondUnderstanding?: string; // What customer understands in 5s (reels)
  dimensions: {
    hook: CriticDimension;
    relevance: CriticDimension;
    originality: CriticDimension;
    businessFit: CriticDimension;
    conceptFidelity: CriticDimension;
    visualCommunication: CriticDimension;
    offerClarity: CriticDimension;
    brand: CriticDimension;
    platformFit: CriticDimension;
    conversion: CriticDimension;
  };
  strengths: string[];
  weaknesses: string[];
  criticalIssues: CriticIssue[];
  recommendations: CriticRecommendation[];
  decision: CriticDecision;
  criticVersion: string;
  createdAt: string;
}

export interface RevisionTarget {
  target: CriticRecommendation['target'];
  action: string;
}

export interface ExecutionRevisionRequest {
  blueprintId: string;
  blueprintVersion: number;
  executionId: string;
  criticResultId: string;
  revisionTargets: RevisionTarget[];
  preserveConstraints: string[];
  revisionInstruction: string;
}

export interface CreativeCriticComparison {
  previousExecutionId: string;
  currentExecutionId: string;
  scoreDelta: Record<string, number>;
  regressions: string[];
  improvements: string[];
  recommendedVersion: 'PREVIOUS' | 'CURRENT';
}
