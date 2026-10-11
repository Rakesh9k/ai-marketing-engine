import type {
  CreativeQualityScore,
  QualityEvidence,
  CreativeQualityEvaluationInput} from "../../../types";
import {
  CreativeQualityDimension,
  CreativeComponent,
} from "../../../types";

export class PlatformFitEvaluator {
  public evaluate(input: CreativeQualityEvaluationInput, policyVersion: string): CreativeQualityScore {
    const evidence: QualityEvidence[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const platformName = input.platform.name || "Instagram";
    const constraints = input.platform.expressionConstraints;

    let score = 90;

    if (constraints) {
      if (constraints.textDensity === "LOW") {
        const getStr = (val: any): string => {
          if (!val) return "";
          if (typeof val === "string") return val;
          return val.content || "";
        };
        const fullText = `${getStr(input.creative.copy?.headline)} ${getStr((input.creative.copy as any)?.bodyText || input.creative.copy?.supportingCopy)}`;
        if (fullText.split(/\s+/).length > 30) {
          score -= 15;
          weaknesses.push(`Text density exceeds platform '${platformName}' recommendation for LOW text density`);
          evidence.push({
            source: "PLATFORM",
            observation: `Word count exceeds optimal limit for ${platformName}`,
            impact: "NEGATIVE",
          });
        } else {
          strengths.push(`Text density is compliant with ${platformName} constraints`);
        }
      }
    } else {
      strengths.push(`Asset aspect ratios and layout match target platform '${platformName}'`);
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      dimension: CreativeQualityDimension.PLATFORM_FIT,
      score: finalScore,
      confidence: "MODERATE_EVIDENCE",
      evidence,
      strengths,
      weaknesses,
      repairability: finalScore < 70 ? "EASY" : "MODERATE",
      repairStrategy:
        weaknesses.length > 0
          ? {
              strategyId: `rep_plt_${Date.now()}`,
              recommendedAction: "Trim text density and adjust aspect ratio bounds for target platform specifications",
              targetComponents: [CreativeComponent.PLATFORM_EXPRESSION, CreativeComponent.COMPOSITION],
              expectedImpact: [CreativeQualityDimension.PLATFORM_FIT],
              estimatedEffort: "LOW",
            }
          : undefined,
      policyVersion,
    };
  }
}
