/**
 * PHASE 14 — Strategic Concept Differentiation Engine Types
 * Defines the strategic fingerprinting, territory definitions, similarity matrix,
 * differentiation metadata, and selection contracts for Mitra's Creative Brain.
 */

import type { CreativeConcept } from '../synthesis/synthesis.types';

export interface ConceptStrategicFingerprint {
  coreInsight: string;
  audienceTension: string;
  emotionalTerritory: string;
  valueProposition: string;
  creativeMechanism: string;
  narrativeTerritory: string;
  culturalTerritory?: string;
  offerRole: string;
  identityTerritory?: string;
  primaryHookType: string;
}

export interface ConceptTerritory {
  id: string;
  name: string;
  primaryEmotion: string;
  secondaryEmotion?: string;
  humanInsight: string;
  audienceTension: string;
  valueInterpretation: string;
  creativeMechanism: string;
  offerRole: string;
  identityAngle?: string;
  culturalAngle?: string;
}

export type CollisionStatus = 'unique' | 'overlapping' | 'duplicate';

export interface ConceptDifferentiationMetadata {
  territoryId: string;
  strategicFingerprint: ConceptStrategicFingerprint;
  similarityScores: Record<string, number>; // conceptId -> similarity score (0..100)
  collisionStatus: CollisionStatus;
  differentiationScore: number; // 0..100
  retainedBecause?: string;
  rejectedBecause?: string;
}

export interface DifferentiatedConcept extends CreativeConcept {
  territory: ConceptTerritory;
  differentiationMetadata: ConceptDifferentiationMetadata;
}

export interface ConceptDifferentiationResult {
  campaignId: string;
  originalCount: number;
  differentiatedConcepts: DifferentiatedConcept[];
  rejectedDuplicates: {
    concept: CreativeConcept;
    duplicateOfConceptId: string;
    similarityScore: number;
    reason: string;
  }[];
  territoriesRepresented: string[];
  differentiationScoreAverage: number;
}

export interface ConceptSelectionContract {
  campaignId: string;
  selectedConceptId: string;
  selectedTerritory: string;
  rejectedConceptIds: string[];
  selectionMode: 'single' | 'mixed' | 'refined';
  selectedReason?: string;
  timestamp: string;
}
