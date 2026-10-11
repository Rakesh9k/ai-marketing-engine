import type {
  CreativeQualityScore,
  QualityEvidence,
  CreativeQualityEvaluationInput} from "../../../types";
import {
  CreativeQualityDimension,
  CreativeComponent,
} from "../../../types";

export class CTAEvaluator {
  public evaluate(input: CreativeQualityEvaluationInput, policyVersion: string): CreativeQualityScore {
    const evidence: QualityEvidence[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const getStr = (val: any): string => {
      if (!val) return "";
      if (typeof val === "string") return val;
      return val.content || "";
    };

    const ctaText = getStr((input.creative.copy as any)?.primaryCta || input.creative.copy?.cta).toLowerCase();

    let score = 85;

    // 1. Specificity & Action Relevance
    if (!ctaText || ctaText.trim().length === 0) {
      score = 30;
      weaknesses.push("Missing Call-to-Action");
      evidence.push({
        source: "COPY",
        observation: "No CTA phrase found in copy",
        impact: "NEGATIVE",
      });
    } else if (ctaText === "learn more" || ctaText === "click here") {
      score -= 20;
      weaknesses.push(`CTA '${ctaText}' is generic and weak for direct action campaigns`);
      evidence.push({
        source: "COPY",
        observation: `Generic CTA '${ctaText}' lacks high-intent action phrasing`,
        impact: "NEGATIVE",
      });
    } else {
      score += 10;
      strengths.push(`Actionable, high-intent Call-to-Action: '${ctaText}'`);
      evidence.push({
        source: "COPY",
        observation: `Specific CTA '${ctaText}' aligns with direct conversion objective`,
        impact: "POSITIVE",
      });
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      dimension: CreativeQualityDimension.CTA_STRENGTH,
      score: finalScore,
      confidence: "MODERATE_EVIDENCE",
      evidence,
      strengths,
      weaknesses,
      repairability: finalScore < 70 ? "EASY" : "MODERATE",
      repairStrategy:
        weaknesses.length > 0
          ? {
              strategyId: `rep_cta_${Date.now()}`,
              recommendedAction: "Replace generic CTA with direct, action-oriented verb matching campaign objective (e.g. Order Now, Book Slot)",
              targetComponents: [CreativeComponent.CTA],
              expectedImpact: [CreativeQualityDimension.CTA_STRENGTH],
              estimatedEffort: "LOW",
            }
          : undefined,
      policyVersion,
    };
  }
}
