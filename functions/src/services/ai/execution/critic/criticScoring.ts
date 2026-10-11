/**
 * PHASE 19 — Critic Scoring & Decision Engine
 * Computes weighted overall score across 10 dimensions, enforces hard-fail minimum thresholds,
 * and determines decision (APPROVE, REVISE, REJECT).
 */

import type {
  CreativeCriticResult,
  CreativeCriticWeights,
  CriticDecision,
  CriticIssue,
} from './creativeCritic.types';

export class CriticScoring {
  public readonly defaultWeights: CreativeCriticWeights = {
    hook: 0.10,
    relevance: 0.12,
    originality: 0.10,
    businessFit: 0.10,
    conceptFidelity: 0.15,
    visualCommunication: 0.10,
    offerClarity: 0.08,
    brand: 0.08,
    platformFit: 0.07,
    conversion: 0.10,
  };

  /**
   * Calculates overall weighted score from 10 dimensions.
   */
  public calculateOverallScore(
    dimensions: CreativeCriticResult['dimensions'],
    weights: CreativeCriticWeights = this.defaultWeights
  ): number {
    let score = 0;
    score += dimensions.hook.score * weights.hook;
    score += dimensions.relevance.score * weights.relevance;
    score += dimensions.originality.score * weights.originality;
    score += dimensions.businessFit.score * weights.businessFit;
    score += dimensions.conceptFidelity.score * weights.conceptFidelity;
    score += dimensions.visualCommunication.score * weights.visualCommunication;
    score += dimensions.offerClarity.score * weights.offerClarity;
    score += dimensions.brand.score * weights.brand;
    score += dimensions.platformFit.score * weights.platformFit;
    score += dimensions.conversion.score * weights.conversion;

    return Math.round(score);
  }

  /**
   * Determines Critic Decision (APPROVE, REVISE, REJECT) based on overall score,
   * hard fail thresholds, and critical issues.
   */
  public determineDecision(
    overallScore: number,
    dimensions: CreativeCriticResult['dimensions'],
    criticalIssues: CriticIssue[]
  ): CriticDecision {
    // 1. Hard Fail Minimum Thresholds
    if (
      dimensions.conceptFidelity.score < 60 ||
      dimensions.businessFit.score < 60 ||
      dimensions.relevance.score < 60
    ) {
      return 'REJECT';
    }

    // 2. Critical Issue Rejection
    const hasCriticalFail = criticalIssues.some((issue) => issue.severity === 'CRITICAL');
    if (hasCriticalFail) {
      return 'REJECT';
    }

    // 3. Score-based decisions
    if (overallScore >= 80 && dimensions.conceptFidelity.score >= 70) {
      return 'APPROVE';
    }

    if (overallScore >= 65) {
      return 'REVISE';
    }

    return 'REJECT';
  }
}
