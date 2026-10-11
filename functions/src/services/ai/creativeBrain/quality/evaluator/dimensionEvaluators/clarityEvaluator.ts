import type {
  CreativeQualityScore,
  QualityEvidence,
  CreativeQualityEvaluationInput} from "../../../types";
import {
  CreativeQualityDimension,
  CreativeComponent,
} from "../../../types";

export class ClarityEvaluator {
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
    const body = getStr((input.creative.copy as any)?.bodyText || input.creative.copy?.supportingCopy);
    const cta = getStr((input.creative.copy as any)?.primaryCta || input.creative.copy?.cta);

    let score = 90;

    // 1. Headline Length & Jargon Check
    if (headline.split(/\s+/).length > 14) {
      score -= 15;
      weaknesses.push("Headline is overly verbose (over 14 words)");
      evidence.push({
        source: "COPY",
        observation: `Headline contains ${headline.split(/\s+/).length} words`,
        impact: "NEGATIVE",
      });
    } else {
      strengths.push("Headline is concise and easy to comprehend");
      evidence.push({
        source: "COPY",
        observation: "Headline word count is well-structured",
        impact: "POSITIVE",
      });
    }

    // 2. Ambiguous Language / Jargon
    if (/(?:synergy|paradigm|unprecedented|revolutionary|world-class|next-gen|holistic solution)/i.test(`${headline} ${body}`)) {
      score -= 15;
      weaknesses.push("Copy contains abstract corporate jargon that obscures the offer");
      evidence.push({
        source: "COPY",
        observation: "Abstract buzzwords diminish clarity",
        impact: "NEGATIVE",
      });
    }

    // 3. CTA Clarity
    if (!cta || cta.length === 0) {
      score -= 25;
      weaknesses.push("Missing explicit Call-to-Action");
    } else if (cta.split(/\s+/).length > 5) {
      score -= 10;
      weaknesses.push("Call-to-Action is confusingly long");
    } else {
      strengths.push(`Clear Call-to-Action: '${cta}'`);
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      dimension: CreativeQualityDimension.CLARITY,
      score: finalScore,
      confidence: "MODERATE_EVIDENCE",
      evidence,
      strengths,
      weaknesses,
      repairability: finalScore < 70 ? "EASY" : "MODERATE",
      repairStrategy:
        weaknesses.length > 0
          ? {
              strategyId: `rep_clr_${Date.now()}`,
              recommendedAction: "Simplify headline and remove buzzwords to make the primary offer immediately obvious",
              targetComponents: [CreativeComponent.HEADLINE, CreativeComponent.CTA],
              expectedImpact: [CreativeQualityDimension.CLARITY],
              estimatedEffort: "LOW",
            }
          : undefined,
      policyVersion,
    };
  }
}
