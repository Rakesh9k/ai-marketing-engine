import type {
  CreativeQualityScore,
  QualityEvidence,
  CreativeQualityEvaluationInput} from "../../../types";
import {
  CreativeQualityDimension,
  CreativeComponent,
} from "../../../types";

export class DifferentiationEvaluator {
  public evaluate(input: CreativeQualityEvaluationInput, policyVersion: string): CreativeQualityScore {
    const evidence: QualityEvidence[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const getStr = (val: any): string => {
      if (!val) return "";
      if (typeof val === "string") return val;
      return val.content || "";
    };

    const headline = getStr(input.creative.copy?.headline).toLowerCase();
    const body = getStr((input.creative.copy as any)?.bodyText || input.creative.copy?.supportingCopy).toLowerCase();
    const fullText = `${headline} ${body}`;

    let score = 80;

    // 1. Swap Test (Generic Slogan Check)
    if (/(?:quality food|best service|great prices|satisfaction guaranteed|top quality|best in town)/i.test(fullText) && !/(?:kondapur|hyderabad|dum biryani|signature|recipe|handcrafted|family combo)/i.test(fullText)) {
      score -= 25;
      weaknesses.push("Creative uses interchangeable generic messaging (fails competitor swap test)");
      evidence.push({
        source: "COPY",
        observation: "Copy could be used by any local competitor by swapping business name",
        impact: "NEGATIVE",
      });
    } else {
      strengths.push("Creative contains business-specific or product-specific distinctive details");
      evidence.push({
        source: "COPY",
        observation: "Copy includes distinctive product/brand proof details",
        impact: "POSITIVE",
      });
    }

    // 2. Specificity Bonus
    const verifiedFactsCount = input.business.verifiedFacts?.length || 0;
    if (verifiedFactsCount > 0 && input.business.products && input.business.products.length > 0) {
      score += 10;
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      dimension: CreativeQualityDimension.DIFFERENTIATION,
      score: finalScore,
      confidence: "MODERATE_EVIDENCE",
      evidence,
      strengths,
      weaknesses,
      repairability: finalScore < 70 ? "MODERATE" : "EASY",
      repairStrategy:
        weaknesses.length > 0
          ? {
              strategyId: `rep_dif_${Date.now()}`,
              recommendedAction: "Incorporate specific business facts, unique product features, or situational proof",
              targetComponents: [CreativeComponent.HEADLINE, CreativeComponent.SUPPORTING_COPY],
              expectedImpact: [CreativeQualityDimension.DIFFERENTIATION],
              estimatedEffort: "MEDIUM",
            }
          : undefined,
      policyVersion,
    };
  }
}
