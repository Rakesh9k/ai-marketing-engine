import type {
  CreativeQualityScore,
  QualityEvidence,
  CreativeQualityEvaluationInput} from "../../../types";
import {
  CreativeQualityDimension,
  CreativeComponent,
} from "../../../types";

export class OfferClarityEvaluator {
  public evaluate(input: CreativeQualityEvaluationInput, policyVersion: string): CreativeQualityScore {
    const evidence: QualityEvidence[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const getStr = (val: any): string => {
      if (!val) return "";
      if (typeof val === "string") return val;
      return val.content || "";
    };

    const headline = getStr(input.creative.copy?.headline);
    const offerCopy = getStr((input.creative.copy as any)?.offerText || input.creative.copy?.offerCopy);
    const body = getStr((input.creative.copy as any)?.bodyText || input.creative.copy?.supportingCopy);
    const fullText = `${headline} ${offerCopy} ${body}`;

    let score = 85;

    // Check price or value statement clarity
    if (/(?:₹|\$|INR|Rs\.?)\s?\d+/i.test(fullText) || offerCopy.length > 0) {
      score += 10;
      strengths.push("Offer price and value proposition are clearly presented");
      evidence.push({
        source: "COPY",
        observation: "Price/value proposition is explicitly stated in copy",
        impact: "POSITIVE",
      });
    } else {
      score -= 15;
      weaknesses.push("Offer copy lacks clear price or value statement");
      evidence.push({
        source: "COPY",
        observation: "No explicit price/discount or value terms present",
        impact: "NEGATIVE",
      });
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      dimension: CreativeQualityDimension.OFFER_CLARITY,
      score: finalScore,
      confidence: "MODERATE_EVIDENCE",
      evidence,
      strengths,
      weaknesses,
      repairability: finalScore < 70 ? "EASY" : "MODERATE",
      repairStrategy:
        weaknesses.length > 0
          ? {
              strategyId: `rep_ofr_${Date.now()}`,
              recommendedAction: "State the offer price or value proposition clearly in offer copy or headline",
              targetComponents: [CreativeComponent.OFFER_COPY, CreativeComponent.COMPOSITION],
              expectedImpact: [CreativeQualityDimension.OFFER_CLARITY],
              estimatedEffort: "LOW",
            }
          : undefined,
      policyVersion,
    };
  }
}
