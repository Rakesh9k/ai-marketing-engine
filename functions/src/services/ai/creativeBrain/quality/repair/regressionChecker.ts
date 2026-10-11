import type {
  CreativeQualityEvaluation,
  QualityComparison,
  QualityRegression,
  CreativeQualityDimension,
  QualityIterationPolicy,
} from "../../types";
import { DEFAULT_ITERATION_POLICY } from "../scoring/qualityScoringPolicy";

export class QualityRegressionChecker {
  /**
   * Compares prior evaluation with new post-repair evaluation to prevent quality oscillation
   * and reject repairs causing severe collateral regression.
   */
  public compareEvaluations(
    previous: CreativeQualityEvaluation,
    current: CreativeQualityEvaluation,
    policy: QualityIterationPolicy = DEFAULT_ITERATION_POLICY
  ): QualityComparison {
    const regressions: QualityRegression[] = [];
    const improvements: { dimension: CreativeQualityDimension; delta: number }[] = [];

    const prevMap = new Map<CreativeQualityDimension, number>(
      previous.dimensions.map((d) => [d.dimension, d.score])
    );

    let totalDelta = 0;
    let maxSingleRegression = 0;

    for (const currDim of current.dimensions) {
      const prevScore = prevMap.get(currDim.dimension) ?? currDim.score;
      const delta = currDim.score - prevScore;
      totalDelta += delta;

      if (delta < 0) {
        const drop = Math.abs(delta);
        if (drop > maxSingleRegression) maxSingleRegression = drop;
        const acceptable = drop <= policy.maxRegression;

        regressions.push({
          dimension: currDim.dimension,
          previousScore: prevScore,
          newScore: currDim.score,
          delta,
          acceptable,
          reason: acceptable
            ? `Minor regression of ${delta} within allowed threshold (${policy.maxRegression})`
            : `Severe regression of ${delta} exceeds maximum allowed drop (${policy.maxRegression})`,
        });
      } else if (delta > 0) {
        improvements.push({ dimension: currDim.dimension, delta });
      }
    }

    const hasUnacceptableRegression = regressions.some((r) => !r.acceptable);
    const hasNetImprovement = totalDelta >= policy.minimumImprovement;
    const governancePassed = current.status !== "BLOCKED";

    let acceptable = false;
    let decision: "ACCEPT_REPAIR" | "REJECT_REPAIR" | "REQUIRES_FURTHER_ITERATION" = "REJECT_REPAIR";
    let reason = "";

    if (!governancePassed) {
      acceptable = false;
      decision = "REJECT_REPAIR";
      reason = "Repair blocked because post-repair governance status is invalid/blocked";
    } else if (hasUnacceptableRegression) {
      acceptable = false;
      decision = "REJECT_REPAIR";
      reason = `Repair rejected due to severe regression on ${regressions.filter((r) => !r.acceptable).map((r) => r.dimension).join(", ")}`;
    } else if (!hasNetImprovement && improvements.length === 0) {
      acceptable = false;
      decision = "REQUIRES_FURTHER_ITERATION";
      reason = "Repair produced no meaningful score improvement";
    } else {
      acceptable = true;
      decision = "ACCEPT_REPAIR";
      reason = `Repair accepted with net score improvement of +${totalDelta} across ${improvements.length} dimension(s)`;
    }

    return {
      previousEvaluationId: previous.evaluationId,
      newEvaluationId: current.evaluationId,
      overallDelta: totalDelta,
      regressions,
      improvements,
      acceptable,
      decision,
      reason,
    };
  }
}
