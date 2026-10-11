/**
 * PHASE 24 — Confidence Readiness Evaluator
 * Evaluates overall campaign strategic readiness based on confidence scores across dimensions.
 * Enforces: Readiness depends on decision sufficiency, NOT completeness of optional fields.
 */

import type {
  CreativeConfidenceDimension,
  CreativeConfidence,
  CreativeReadiness,
} from './confidence.types';
import { ConfidenceScoring } from './confidenceScoring';

export class ConfidenceReadinessEvaluator {
  public static readonly CRITICAL_THRESHOLD = 0.75;
  public static readonly STRATEGIC_PREFERRED_THRESHOLD = 0.80;
  public static readonly STRONG_THRESHOLD = 0.90;

  /**
   * Evaluates overall readiness for a given set of confidence dimensions.
   */
  public static evaluateReadiness(
    dimensions: Record<CreativeConfidenceDimension, CreativeConfidence>,
    stage: string = 'CREATIVE_OPPORTUNITY'
  ): CreativeReadiness {
    const blockingDimensions: CreativeConfidenceDimension[] = [];
    const weakDimensions: CreativeConfidenceDimension[] = [];
    let totalScoreSum = 0;
    let countedDimensions = 0;

    const allDims = Object.values(dimensions);

    for (const dimState of allDims) {
      const isBlocking = ConfidenceScoring.isDimensionBlocking(dimState.dimension, stage);
      dimState.blocking = isBlocking;

      totalScoreSum += dimState.score;
      countedDimensions++;

      if (dimState.score < this.CRITICAL_THRESHOLD) {
        weakDimensions.push(dimState.dimension);
        if (isBlocking) {
          blockingDimensions.push(dimState.dimension);
        }
      }
    }

    const overallScore = countedDimensions > 0
      ? Math.round((totalScoreSum / countedDimensions) * 100) / 100
      : 0.0;

    const isReady = blockingDimensions.length === 0;

    let reason = '';
    if (isReady) {
      reason = 'All required strategic dimensions meet or exceed confidence threshold (≥ 0.75).';
    } else {
      reason = `Blocked by ${blockingDimensions.length} weak required dimension(s): ${blockingDimensions.join(', ')}.`;
    }

    return {
      overallScore,
      blockingDimensions,
      weakDimensions,
      ready: isReady,
      reason,
    };
  }
}
