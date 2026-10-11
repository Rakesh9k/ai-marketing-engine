/**
 * PHASE 20 — Regression Detector & Revision Acceptor
 * Evaluates baseline vs candidate V2 scores to ensure targeted fixes improve weak dimensions
 * without damaging protected strategic dimensions or overall quality.
 */

import type { CreativeCriticResult } from '../creativeCritic.types';
import type { CreativeRevisionPlan, RevisionAcceptanceResult } from './revision.types';

export class RegressionDetector {
  public readonly MIN_MEANINGFUL_IMPROVEMENT = 5;

  /**
   * Evaluates candidate V2 against baseline V1 using the CreativeRevisionPlan.
   */
  public evaluateRevision(
    baseline: CreativeCriticResult,
    candidate: CreativeCriticResult,
    plan: CreativeRevisionPlan
  ): RevisionAcceptanceResult {
    const regressionsDetected: string[] = [];

    // 1. Check Protected Dimension Regressions
    plan.regressionConstraints.forEach((constraint) => {
      const dim = constraint.dimension;
      const baseScore = constraint.baselineScore;
      const candScore = candidate.dimensions[dim].score;
      const drop = baseScore - candScore;

      if (drop > constraint.maximumAllowedDrop) {
        regressionsDetected.push(
          `Protected dimension '${dim}' regressed by ${drop} points (${baseScore} -> ${candScore}), exceeding max drop (${constraint.maximumAllowedDrop}).`
        );
      }
    });

    // 2. Check Concept Fidelity Hard Rule (Concept Fidelity must not fall below 70)
    if (candidate.dimensions.conceptFidelity.score < 70) {
      regressionsDetected.push(
        `Concept Fidelity hard failure: Candidate V2 score (${candidate.dimensions.conceptFidelity.score}) fell below minimum required threshold (70).`
      );
    }

    // 3. Check Improvement on Target Dimensions
    let totalTargetImprovement = 0;
    plan.targetDimensions.forEach((dim) => {
      const baseScore = baseline.dimensions[dim].score;
      const candScore = candidate.dimensions[dim].score;
      const diff = candScore - baseScore;
      totalTargetImprovement += diff;
    });

    const averageTargetImprovement = plan.targetDimensions.length > 0
      ? totalTargetImprovement / plan.targetDimensions.length
      : 0;

    // 4. Decision logic
    if (regressionsDetected.length > 0) {
      return {
        accepted: false,
        reason: `Revision rejected due to regressions: ${regressionsDetected.join('; ')}`,
        chosenExecutionId: baseline.assetId, // Keep V1!
        improvementDelta: candidate.overallScore - baseline.overallScore,
        regressionsDetected,
      };
    }

    if (averageTargetImprovement < this.MIN_MEANINGFUL_IMPROVEMENT && candidate.overallScore <= baseline.overallScore) {
      return {
        accepted: false,
        reason: `Revision rejected due to insufficient improvement (average target delta: +${averageTargetImprovement.toFixed(1)} points).`,
        chosenExecutionId: baseline.assetId, // Keep V1!
        improvementDelta: candidate.overallScore - baseline.overallScore,
        regressionsDetected: [],
      };
    }

    return {
      accepted: true,
      reason: `Revision accepted! Target dimensions improved by +${averageTargetImprovement.toFixed(1)} points on average.`,
      chosenExecutionId: candidate.assetId, // Accept V2!
      improvementDelta: candidate.overallScore - baseline.overallScore,
      regressionsDetected: [],
    };
  }
}
