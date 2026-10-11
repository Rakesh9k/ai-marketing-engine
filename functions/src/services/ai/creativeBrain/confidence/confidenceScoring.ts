/**
 * PHASE 24 — Confidence Scoring Engine
 * Computes normalized confidence scores, maps score ranges to statuses,
 * and applies source authority weights to combine multiple pieces of evidence.
 */

import type {
  ConfidenceStatus,
  ConfidenceSourceType,
  ConfidenceEvidence,
  CreativeConfidenceDimension,
} from './confidence.types';

export const SOURCE_AUTHORITY_WEIGHTS: Record<ConfidenceSourceType, number> = {
  USER_EXPLICIT: 1.0,
  BUSINESS_BRAIN: 0.90,
  QUESTION_ANSWER: 0.85,
  USER_SELECTION: 0.85,
  USER_TEXT: 0.85,
  SYSTEM_DERIVATION: 0.75,
  PERFORMANCE_MEMORY: 0.70,
  CREATIVE_MEMORY: 0.65,
  INFERENCE: 0.50,
};

export class ConfidenceScoring {
  /**
   * Normalizes a score between 0.00 and 1.00.
   */
  public static normalizeScore(rawScore: number): number {
    if (isNaN(rawScore) || rawScore < 0) return 0.0;
    if (rawScore > 1.0) return 1.0;
    return Math.round(rawScore * 100) / 100;
  }

  /**
   * Maps a numerical score to a ConfidenceStatus.
   */
  public static getStatusForScore(score: number): ConfidenceStatus {
    const s = this.normalizeScore(score);
    if (s === 0.0) return 'UNKNOWN';
    if (s < 0.50) return 'LOW';
    if (s < 0.75) return 'MEDIUM';
    if (s < 0.90) return 'HIGH';
    return 'VERY_HIGH';
  }

  /**
   * Combines evidence pieces using asymptotic diminishing returns & authority weighting.
   */
  public static calculateCombinedScore(evidenceList: ConfidenceEvidence[]): number {
    if (!evidenceList || evidenceList.length === 0) {
      return 0.0;
    }

    let residualUncertainty = 1.0;
    let maxAuthority = 0.0;
    let hasNonInference = false;

    for (const ev of evidenceList) {
      const weight = SOURCE_AUTHORITY_WEIGHTS[ev.source] ?? 0.50;
      const effectiveStrength = Math.min(1.0, Math.max(0.0, ev.strength * weight));
      
      residualUncertainty *= 1.0 - effectiveStrength;
      if (weight > maxAuthority) {
        maxAuthority = weight;
      }
      if (ev.source !== 'INFERENCE') {
        hasNonInference = true;
      }
    }

    let calculated = 1.0 - residualUncertainty;

    // Rule: Weak inference alone cannot exceed 0.70 confidence without explicit evidence
    if (!hasNonInference && calculated > 0.70) {
      calculated = 0.70;
    }

    return this.normalizeScore(calculated);
  }

  /**
   * Identifies whether a dimension is blocking for a given campaign stage.
   */
  public static isDimensionBlocking(
    dimension: CreativeConfidenceDimension,
    stage: string = 'CREATIVE_OPPORTUNITY'
  ): boolean {
    // Core strategic dimensions block stage transition to Creative Opportunity
    const coreStrategic: CreativeConfidenceDimension[] = [
      'AUDIENCE',
      'OBJECTIVE',
      'PRODUCT',
      'OFFER',
      'CUSTOMER_INSIGHT',
      'DIFFERENTIATOR',
    ];

    if (stage === 'CREATIVE_OPPORTUNITY' || stage === 'CONFIRMATION' || stage === 'CONCEPTS') {
      return coreStrategic.includes(dimension);
    }

    if (stage === 'EXECUTION') {
      return true; // All dimensions required during execution
    }

    return false;
  }
}
