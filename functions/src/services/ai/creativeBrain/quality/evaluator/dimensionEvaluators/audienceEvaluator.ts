import type {
  CreativeQualityScore,
  QualityEvidence,
  CreativeQualityEvaluationInput} from "../../../types";
import {
  CreativeQualityDimension,
  CreativeComponent,
} from "../../../types";

export class AudienceEvaluator {
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

    const situation = (input.strategy.audience as any)?.situation?.context || (input.strategy as any).situation?.description || "";
    const locality = (input.business.location as any)?.locality || input.business.description || "";

    let score = 80;

    // 1. Generic Audience Mention Penalty vs True Situational Recognition
    if (/(?:for (?:people|families|customers|everyone) who (?:love|want|like))/i.test(fullText)) {
      score -= 10;
      weaknesses.push("Uses generic audience callout rather than situational context");
      evidence.push({
        source: "COPY",
        observation: "Contains superficial audience phrasing ('For families who love...')",
        impact: "NEGATIVE",
      });
    }

    // 2. Situational Tension Recognition
    if (situation) {
      const sitWords = situation.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
      const matchesSit = sitWords.some((w: string) => fullText.includes(w));
      if (matchesSit) {
        score += 10;
        strengths.push("Copy incorporates specific audience situational context");
        evidence.push({
          source: "AUDIENCE",
          observation: `Copy reflects situational context: '${situation}'`,
          impact: "POSITIVE",
        });
      }
    }

    // 3. Local Context Relevance
    if (locality && locality.length > 2) {
      if (fullText.includes(locality.toLowerCase())) {
        score += 10;
        strengths.push(`Creative establishes local audience relevance for '${locality}'`);
        evidence.push({
          source: "COPY",
          observation: `Mentions local context '${locality}'`,
          impact: "POSITIVE",
        });
      }
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      dimension: CreativeQualityDimension.AUDIENCE_RELEVANCE,
      score: finalScore,
      confidence: "MODERATE_EVIDENCE",
      evidence,
      strengths,
      weaknesses,
      repairability: finalScore < 70 ? "EASY" : "MODERATE",
      repairStrategy:
        weaknesses.length > 0
          ? {
              strategyId: `rep_aud_${Date.now()}`,
              recommendedAction: "Reframe copy around specific audience situation rather than generic target labels",
              targetComponents: [CreativeComponent.SUPPORTING_COPY, CreativeComponent.HEADLINE],
              expectedImpact: [CreativeQualityDimension.AUDIENCE_RELEVANCE],
              estimatedEffort: "LOW",
            }
          : undefined,
      policyVersion,
    };
  }
}
