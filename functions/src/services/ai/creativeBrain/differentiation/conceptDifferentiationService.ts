/**
 * PHASE 14 — Concept Differentiation Service
 * Master orchestrator for Phase 14 of Mitra's Creative Brain.
 * Evaluates candidate concepts to ensure they represent genuinely different strategic territories.
 * Prevents fake execution variety (headline/format/platform variations) and enforces strategic distance.
 */

import type { CreativeConcept } from '../synthesis/synthesis.types';
import type { ConceptSynthesisInput } from '../synthesis/synthesis.types';
import type {
  DifferentiatedConcept,
  ConceptDifferentiationResult,
  ConceptDifferentiationMetadata,
  CollisionStatus,
} from './differentiation.types';

import { StrategicFingerprintService } from './strategicFingerprintService';
import { ConceptSimilarityService, CONCEPT_SIMILARITY_THRESHOLD } from './conceptSimilarityService';
import { TerritoryDiscoveryService } from './territoryDiscoveryService';

export class ConceptDifferentiationService {
  /**
   * Evaluates and differentiates candidate concepts to guarantee strategic variety.
   */
  public differentiateConcepts(
    candidateConcepts: CreativeConcept[],
    input: ConceptSynthesisInput
  ): ConceptDifferentiationResult {
    const originalCount = candidateConcepts.length;
    const rejectedDuplicates: ConceptDifferentiationResult['rejectedDuplicates'] = [];

    // Sort candidate concepts by quality score descending first
    const sortedCandidates = [...candidateConcepts].sort((a, b) => b.score.total - a.score.total);
    const retainedConcepts: CreativeConcept[] = [];

    for (const candidate of sortedCandidates) {
      let duplicateFound = false;

      for (const existing of retainedConcepts) {
        const similarity = ConceptSimilarityService.calculateStrategicSimilarity(candidate, existing);
        if (similarity >= CONCEPT_SIMILARITY_THRESHOLD) {
          duplicateFound = true;
          rejectedDuplicates.push({
            concept: candidate,
            duplicateOfConceptId: existing.id,
            similarityScore: similarity,
            reason: `Strategic collision with "${existing.name}" (Similarity: ${similarity}% >= threshold ${CONCEPT_SIMILARITY_THRESHOLD}%). Same strategic reason to care.`,
          });
          break;
        }
      }

      if (!duplicateFound) {
        retainedConcepts.push(candidate);
      }
    }

    // If collision filtering reduced unique concepts below 3, attempt to discover unrepresented territories
    let finalConceptPool = [...retainedConcepts];
    if (finalConceptPool.length < 3) {
      const altConcepts = TerritoryDiscoveryService.discoverAlternativeTerritories(finalConceptPool, input);
      for (const alt of altConcepts) {
        if (finalConceptPool.length >= 3) break;
        const isDuplicate = finalConceptPool.some(
          (existing) => ConceptSimilarityService.calculateStrategicSimilarity(alt, existing) >= CONCEPT_SIMILARITY_THRESHOLD
        );
        if (!isDuplicate) {
          finalConceptPool.push(alt);
        }
      }
    }

    // Build final DifferentiatedConcept array with strategic fingerprints & metadata
    const differentiatedConcepts: DifferentiatedConcept[] = finalConceptPool.map((concept) => {
      const fingerprint = StrategicFingerprintService.extractFingerprint(concept);
      const territory = StrategicFingerprintService.deriveTerritory(concept);

      const similarityScores: Record<string, number> = {};
      finalConceptPool.forEach((other) => {
        if (other.id !== concept.id) {
          similarityScores[other.id] = ConceptSimilarityService.calculateStrategicSimilarity(concept, other);
        }
      });

      const maxSim = Math.max(0, ...Object.values(similarityScores));
      let collisionStatus: CollisionStatus = 'unique';
      if (maxSim >= 65) collisionStatus = 'overlapping';
      if (maxSim >= CONCEPT_SIMILARITY_THRESHOLD) collisionStatus = 'duplicate';

      const diffScore = ConceptSimilarityService.calculateDifferentiationScore(
        concept,
        finalConceptPool.filter((c) => c.id !== concept.id)
      );

      const metadata: ConceptDifferentiationMetadata = {
        territoryId: territory.id,
        strategicFingerprint: fingerprint,
        similarityScores,
        collisionStatus,
        differentiationScore: diffScore,
        retainedBecause: `Retained as distinct strategic territory: "${territory.name}" (Differentiation Score: ${diffScore}/100)`,
      };

      return {
        ...concept,
        territory,
        differentiationMetadata: metadata,
      };
    });

    const territoriesRepresented = Array.from(
      new Set(differentiatedConcepts.map((dc) => dc.territory.name))
    );

    const avgDiffScore =
      differentiatedConcepts.length > 0
        ? Math.round(
            differentiatedConcepts.reduce(
              (sum, dc) => sum + dc.differentiationMetadata.differentiationScore,
              0
            ) / differentiatedConcepts.length
          )
        : 0;

    return {
      campaignId: input.campaignId,
      originalCount,
      differentiatedConcepts,
      rejectedDuplicates,
      territoriesRepresented,
      differentiationScoreAverage: avgDiffScore,
    };
  }
}
