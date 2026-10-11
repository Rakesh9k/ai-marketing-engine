/**
 * PHASE 13 — Concept Synthesis Engine Types
 * Defines the contract, schemas, concept structures, scoring rubrics,
 * and synthesis metadata for Mitra's Creative Brain (Phase 13).
 */

import type { ISODateTime } from '../types/primitives';
import type { CreativeOpportunity } from '../types/opportunity';
import type { BusinessContextContract, CampaignIntentContract } from '../types/creativeArchitecture.types';
import type { CreativeKnowledgeItem } from '../types/creativeArchitecture.types';

export interface EmotionalResponseProfile {
  primary: string;
  secondary?: string;
}

export interface CreativeMechanismDetail {
  id?: string;
  name: string;
  explanation: string;
}

export interface FormatRecommendation {
  primary: string;
  alternatives?: string[];
}

export interface PlatformRecommendation {
  primary: string;
  secondary?: string[];
}

export interface AssetRequirementClassification {
  required: string[];
  recommended: string[];
  optional: string[];
}

export interface ConceptScoreBreakdown {
  total: number; // 0..100
  strategicRelevance: number; // Max 20
  audienceRelevance: number; // Max 15
  businessFit: number; // Max 15
  humanInsight: number; // Max 15
  creativeDistinctiveness: number; // Max 15
  emotionalStrength: number; // Max 10
  executionFeasibility: number; // Max 5
  offerIntegration: number; // Max 5
}

export interface ConceptEvidenceTraceability {
  businessBrain: string[];
  creativeBrain: string[];
  creativeOpportunity: string[];
  creativeBank: string[];
}

export interface CreativeConcept {
  id: string;
  name: string;
  oneLineIdea: string;
  humanInsight: string;
  whyThisBusiness: string;
  whyThisAudience: string;
  emotionalResponse: EmotionalResponseProfile;
  hook: string;
  creativeMechanism: CreativeMechanismDetail;
  visualDirection: string;
  storyDirection: string;
  offerIntegration: string;
  cta: string;
  recommendedFormat: FormatRecommendation;
  recommendedPlatform: PlatformRecommendation;
  requiredAssets: AssetRequirementClassification;
  whyMitraRecommendsIt: string;
  score: ConceptScoreBreakdown;
  evidence: ConceptEvidenceTraceability;
  creativeBankReferences: string[];
  risks?: string[];
  status: 'recommended' | 'alternative' | 'rejected';
}

export interface CreativeBrainAnswers {
  product?: string;
  audience?: string;
  occasion?: string;
  problem?: string;
  desire?: string;
  competitiveReason?: string;
  emotionalTerritory?: string;
  marketingObjective?: string;
  offer?: string;
  customAnswers?: Record<string, string>;
}

export interface ConceptSynthesisInput {
  campaignId: string;
  businessBrain: BusinessContextContract;
  campaignIntent: CampaignIntentContract;
  creativeBrainAnswers?: CreativeBrainAnswers;
  creativeOpportunity: CreativeOpportunity | any;
  relevantCreativeBankEntries?: CreativeKnowledgeItem[];
  availableAssets?: string[];
}

export interface ConceptSynthesisMetadata {
  generatedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  diversityChecked: boolean;
  creativeBankUsed: boolean;
  creativeBankEntryCount: number;
  generatedAt: ISODateTime;
}

export interface ConceptSynthesisResult {
  campaignId: string;
  opportunityId: string;
  concepts: CreativeConcept[];
  synthesisMetadata: ConceptSynthesisMetadata;
}
