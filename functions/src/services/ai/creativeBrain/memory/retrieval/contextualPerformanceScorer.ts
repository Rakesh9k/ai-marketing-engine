import type {
  ContextualPerformanceScore,
  CreativeNoveltySignal,
  HistoricalPerformanceSignal,
} from "../../types/memory";
import type { Score } from "../../types/primitives";

/**
 * Computes contextual performance ranking score integrating historical performance signals
 * and novelty fatigue penalties.
 * 
 * CRITICAL INVARIANT: Hard governance gates (Truth, Safety, Ethics, Capability)
 * CAN NEVER be overridden by historical performance scores.
 * If governance fails, performance score multiplier CANNOT authorize execution.
 */
export function scoreContextualPerformance(
  signal: HistoricalPerformanceSignal,
  novelty: CreativeNoveltySignal,
  contextMatchScore: Score = 0.9,
  governancePassed: boolean = true
): ContextualPerformanceScore {
  // If governance failed, score is hard-locked to 0.0 (governance invariants override all performance)
  if (!governancePassed) {
    return {
      componentId: signal.componentId,
      contextMatch: contextMatchScore,
      historicalLift: 0,
      evidenceStrength: 0,
      generalization: 0,
      recency: 0,
      finalSignal: 0.0,
    };
  }

  // Convert lift (-0.5 .. +1.0) into a 0..1 multiplier score
  // Lift of 0.0 -> score 0.5 (neutral)
  // Lift of +0.5 -> score 0.85
  // Lift of -0.3 -> score 0.2
  const liftScore: Score = Math.min(1.0, Math.max(0.1, 0.5 + signal.contextualLift * 0.7));

  // Evidence strength based on sample count and confidence level
  const confMult = signal.confidence === "HIGH" ? 1.0 : signal.confidence === "MEDIUM" ? 0.75 : 0.5;
  const evidenceStrength: Score = Number(
    Math.min(1.0, (Math.min(signal.evidenceCount, 10) / 10) * confMult).toFixed(4)
  );

  const generalizationScore = signal.generalization.overall;
  const recencyScore = signal.recency;

  // Final Signal = (Base Context Match * Lift Score * Evidence Strength * Generalization * Recency) * Novelty
  const rawSignal =
    contextMatchScore * 0.3 +
    liftScore * 0.3 +
    evidenceStrength * 0.15 +
    generalizationScore * 0.15 +
    recencyScore * 0.1;

  const finalSignal: Score = Number((rawSignal * novelty.noveltyScore).toFixed(4));

  return {
    componentId: signal.componentId,
    contextMatch: contextMatchScore,
    historicalLift: Number(liftScore.toFixed(4)),
    evidenceStrength,
    generalization: generalizationScore,
    recency: recencyScore,
    finalSignal,
  };
}
