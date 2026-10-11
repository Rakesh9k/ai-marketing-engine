/**
 * PHASE 14 — Concept Similarity Service
 * Evaluates pairwise similarity scores, collision detection, and differentiation metrics.
 * Rule: Different words != Different concept; Different format != Different concept.
 * A concept is genuinely different ONLY when it gives the audience a different strategic reason to care.
 */

import type { CreativeConcept } from '../synthesis/synthesis.types';
import { StrategicFingerprintService } from './strategicFingerprintService';

export const CONCEPT_SIMILARITY_THRESHOLD = 70;

export class ConceptSimilarityService {
  /**
   * Calculates normalized strategic similarity score (0 to 100) between two concepts.
   * 0-30 = Highly distinct, 31-50 = Distinct, 51-65 = Some overlap, 66-80 = Too similar (collision), 81-100 = Duplicate.
   */
  public static calculateStrategicSimilarity(conceptA: CreativeConcept, conceptB: CreativeConcept): number {
    const fpA = StrategicFingerprintService.extractFingerprint(conceptA);
    const fpB = StrategicFingerprintService.extractFingerprint(conceptB);

    let similarityPoints = 0;
    let totalWeight = 0;

    // 1. Human Insight Similarity (Weight: 25)
    const insightSim = this.textSimilarity(fpA.coreInsight, fpB.coreInsight);
    similarityPoints += insightSim * 25;
    totalWeight += 25;

    // 2. Emotional Territory Similarity (Weight: 20)
    const emotionSim = fpA.emotionalTerritory.toLowerCase() === fpB.emotionalTerritory.toLowerCase() ? 1.0 : 0.2;
    similarityPoints += emotionSim * 20;
    totalWeight += 20;

    // 3. Creative Mechanism Similarity (Weight: 20)
    const mechSim = this.textSimilarity(fpA.creativeMechanism, fpB.creativeMechanism);
    similarityPoints += mechSim * 20;
    totalWeight += 20;

    // 4. Value Proposition / Reason to Care (Weight: 15)
    const valSim = this.textSimilarity(fpA.valueProposition, fpB.valueProposition);
    similarityPoints += valSim * 15;
    totalWeight += 15;

    // 5. Offer Role Similarity (Weight: 10)
    const offerSim = fpA.offerRole === fpB.offerRole ? 1.0 : 0.3;
    similarityPoints += offerSim * 10;
    totalWeight += 10;

    // 6. Hook Type Similarity (Weight: 10)
    const hookSim = fpA.primaryHookType === fpB.primaryHookType ? 0.8 : 0.2;
    similarityPoints += hookSim * 10;
    totalWeight += 10;

    const normalizedSimilarity = Math.round((similarityPoints / totalWeight) * 100);
    return Math.min(100, Math.max(0, normalizedSimilarity));
  }

  /**
   * Computes individual differentiation score (0 to 100) for a concept against a set of concepts.
   */
  public static calculateDifferentiationScore(
    targetConcept: CreativeConcept,
    otherConcepts: CreativeConcept[]
  ): number {
    if (otherConcepts.length === 0) return 95; // Benchmark score for single concept

    const similarities = otherConcepts.map((c) => this.calculateStrategicSimilarity(targetConcept, c));
    const targetFp = StrategicFingerprintService.extractFingerprint(targetConcept);
    const avgSimilarity = similarities.reduce((sum, s) => sum + s, 0) / similarities.length;
    const strategicDistanceScore = (100 - avgSimilarity) * 0.30;

    // Distinct Human Insight (20%)
    const avgInsightSim = otherConcepts.reduce((sum, c) => sum + this.textSimilarity(targetFp.coreInsight, c.humanInsight), 0) / otherConcepts.length;
    const insightScore = (1.0 - avgInsightSim) * 100 * 0.20;

    // Distinct Emotional Territory (15%)
    const avgEmotionSim = otherConcepts.reduce((sum, c) => sum + (targetFp.emotionalTerritory.toLowerCase() === c.emotionalResponse.primary.toLowerCase() ? 1.0 : 0.0), 0) / otherConcepts.length;
    const emotionScore = (1.0 - avgEmotionSim) * 100 * 0.15;

    // Distinct Creative Mechanism (15%)
    const avgMechSim = otherConcepts.reduce((sum, c) => sum + (targetFp.creativeMechanism.toLowerCase() === c.creativeMechanism.name.toLowerCase() ? 1.0 : 0.0), 0) / otherConcepts.length;
    const mechScore = (1.0 - avgMechSim) * 100 * 0.15;

    // Distinct Value Framing (10%)
    const avgValSim = otherConcepts.reduce((sum, c) => sum + this.textSimilarity(targetFp.valueProposition, c.oneLineIdea), 0) / otherConcepts.length;
    const valueScore = (1.0 - avgValSim) * 100 * 0.10;

    // Distinct Offer Role (5%)
    const offerScore = 5.0;

    // Distinct Cultural / Identity (5%)
    const identityScore = 5.0;

    const totalDiffScore = Math.round(strategicDistanceScore + insightScore + emotionScore + mechScore + valueScore + offerScore + identityScore);
    return Math.min(100, Math.max(10, totalDiffScore));
  }

  /**
   * Checks if two concepts collide (similarity > CONCEPT_SIMILARITY_THRESHOLD).
   */
  public static isCollision(conceptA: CreativeConcept, conceptB: CreativeConcept): boolean {
    return this.calculateStrategicSimilarity(conceptA, conceptB) >= CONCEPT_SIMILARITY_THRESHOLD;
  }

  /**
   * Jaccard / Levenshtein word-level semantic similarity helper.
   */
  private static textSimilarity(textA: string, textB: string): number {
    const normalize = (t: string) => t.toLowerCase().replace(/[^\w\s]/g, '');
    const normA = normalize(textA);
    const normB = normalize(textB);

    if (normA === normB) return 1.0;

    const wordsA = new Set(normA.split(/\s+/).filter((w) => w.length > 3));
    const wordsB = new Set(normB.split(/\s+/).filter((w) => w.length > 3));

    if (wordsA.size === 0 || wordsB.size === 0) return 0.0;

    let intersection = 0;
    wordsA.forEach((w) => {
      if (wordsB.has(w)) intersection++;
    });

    const union = new Set([...wordsA, ...wordsB]).size;
    return intersection / union;
  }
}
