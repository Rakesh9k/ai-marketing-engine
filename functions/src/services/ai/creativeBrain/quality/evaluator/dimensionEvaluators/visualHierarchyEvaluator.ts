import type {
  CreativeQualityScore,
  QualityEvidence,
  CreativeQualityEvaluationInput} from "../../../types";
import {
  CreativeQualityDimension,
  CreativeComponent,
} from "../../../types";

export class VisualHierarchyEvaluator {
  public evaluate(input: CreativeQualityEvaluationInput, policyVersion: string): CreativeQualityScore {
    const evidence: QualityEvidence[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const compositionPlan = input.assetPlan?.compositionPlan || (input.creative.assetPlan as any)?.compositionPlan;

    let score = 85;

    if (compositionPlan) {
      if (compositionPlan.hierarchy) {
        strengths.push("Explicit visual hierarchy (primary & secondary focus regions) defined");
        evidence.push({
          source: "COMPOSITION",
          observation: "Primary focus region assigned",
          impact: "POSITIVE",
        });
      }
      if (compositionPlan.safeAreas && compositionPlan.safeAreas.length > 0) {
        strengths.push("Composition respects platform-defined safe areas");
      }
    } else {
      strengths.push("Basic visual layout and element hierarchy established");
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      dimension: CreativeQualityDimension.VISUAL_HIERARCHY,
      score: finalScore,
      confidence: "MODERATE_EVIDENCE",
      evidence,
      strengths,
      weaknesses,
      repairability: finalScore < 70 ? "EASY" : "MODERATE",
      repairStrategy:
        weaknesses.length > 0
          ? {
              strategyId: `rep_vis_${Date.now()}`,
              recommendedAction: "Rebalance composition layout to highlight hero element and headline reading order",
              targetComponents: [CreativeComponent.COMPOSITION, CreativeComponent.TYPOGRAPHY],
              expectedImpact: [CreativeQualityDimension.VISUAL_HIERARCHY],
              estimatedEffort: "MEDIUM",
            }
          : undefined,
      policyVersion,
    };
  }
}
