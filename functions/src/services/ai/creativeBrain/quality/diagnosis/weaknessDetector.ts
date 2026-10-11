import type {
  CreativeQualityScore,
  QualityWeakness,
  QualityStrength,
  CreativeQualityPolicy,
  CreativeQualityDiagnosis} from "../../types";
import {
  CreativeQualityDimension,
  CreativeQualityStatus,
  CreativeComponent,
} from "../../types";
import { QualityComponentMapper } from "./componentMapper";

export class QualityWeaknessDetector {
  private componentMapper = new QualityComponentMapper();

  /**
   * Diagnoses strengths and weaknesses across all evaluated dimensions.
   */
  public diagnose(
    scores: CreativeQualityScore[],
    policy: CreativeQualityPolicy
  ): {
    strengths: QualityStrength[];
    weaknesses: QualityWeakness[];
    diagnosis: CreativeQualityDiagnosis;
  } {
    const strengths: QualityStrength[] = [];
    const weaknesses: QualityWeakness[] = [];

    for (const scoreObj of scores) {
      const minThreshold = policy.minimumScores[scoreObj.dimension] || 70;

      // Extract Strengths
      if (scoreObj.score >= 85 && scoreObj.strengths.length > 0) {
        for (const strText of scoreObj.strengths) {
          strengths.push({
            id: `str_${scoreObj.dimension}_${strengths.length + 1}`,
            dimension: scoreObj.dimension,
            observation: strText,
            evidence: scoreObj.evidence.filter((e) => e.impact === "POSITIVE"),
          });
        }
      }

      // Extract Weaknesses
      if (scoreObj.score < minThreshold || scoreObj.weaknesses.length > 0) {
        let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";
        if (scoreObj.dimension === CreativeQualityDimension.TRUTHFULNESS && scoreObj.score < 100) {
          severity = "CRITICAL";
        } else if (scoreObj.score < 60) {
          severity = "HIGH";
        } else if (scoreObj.score < minThreshold) {
          severity = "MEDIUM";
        } else {
          severity = "LOW";
        }

        const affectedComponents = this.componentMapper.mapDimensionToComponents(scoreObj.dimension);

        for (const wText of scoreObj.weaknesses) {
          weaknesses.push({
            id: `wk_${scoreObj.dimension}_${weaknesses.length + 1}`,
            dimension: scoreObj.dimension,
            severity,
            observation: wText,
            cause: `Score (${scoreObj.score}) below target threshold (${minThreshold}) on ${scoreObj.dimension}`,
            evidence: scoreObj.evidence.filter((e) => e.impact === "NEGATIVE"),
            repairable: scoreObj.repairability !== "NOT_REPAIRABLE",
            affectedComponents,
          });
        }
      }
    }

    // Determine repair scope
    let recommendedScope: "COMPONENT" | "MULTIPLE_COMPONENTS" | "FULL_CREATIVE" | "RETURN_TO_STRATEGY" = "COMPONENT";
    const criticalWeaknesses = weaknesses.filter((w) => w.severity === "CRITICAL" || w.severity === "HIGH");
    const uniqueComponents = new Set<CreativeComponent>(weaknesses.flatMap((w) => w.affectedComponents));

    if (uniqueComponents.has(CreativeComponent.STRATEGY) || criticalWeaknesses.length > 3) {
      recommendedScope = "FULL_CREATIVE";
    } else if (uniqueComponents.size > 2) {
      recommendedScope = "MULTIPLE_COMPONENTS";
    } else {
      recommendedScope = "COMPONENT";
    }

    const diagnosis: CreativeQualityDiagnosis = {
      evaluationId: `diag_${Date.now()}`,
      overallStatus: weaknesses.length === 0 ? CreativeQualityStatus.PASS : CreativeQualityStatus.NEEDS_IMPROVEMENT,
      primaryWeaknesses: weaknesses,
      repairable: weaknesses.every((w) => w.repairable),
      recommendedScope,
      diagnosisSummary:
        weaknesses.length === 0
          ? "Creative meets quality and strategic performance criteria across all dimensions"
          : `Diagnosed ${weaknesses.length} weakness area(s) affecting ${uniqueComponents.size} component(s)`,
    };

    return { strengths, weaknesses, diagnosis };
  }
}
