import type {
  CreativeQualityScore,
  QualityEvidence,
  CreativeQualityEvaluationInput} from "../../../types";
import {
  CreativeQualityDimension,
  CreativeComponent,
} from "../../../types";

export class AttentionEvaluator {
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
    const hook = (input.strategy.hook as any)?.openingFunction || input.strategy.hook?.illustrativeExample || "";

    let score = 80;

    // 1. Hook / Pattern Interrupt Check
    if (hook || /(?:did you know|stop|why|secret|finally|never|what if|how to)/i.test(headline)) {
      score += 10;
      strengths.push("Headline uses an active hook or curiosity trigger for visual stopping power");
      evidence.push({
        source: "CREATIVE_DIRECTION",
        observation: "Strong opening curiosity or pattern interruption pattern detected",
        impact: "POSITIVE",
      });
    } else {
      score -= 10;
      weaknesses.push("Headline lacks strong pattern interrupt or opening hook");
      evidence.push({
        source: "COPY",
        observation: "Headline uses passive framing without an attention hook",
        impact: "NEGATIVE",
      });
    }

    // 2. Visual Subject Salience
    if (input.creative.assets && input.creative.assets.length > 0) {
      const heroAsset = input.creative.assets.find(
        (a) => (a as any).compositionRole === "MAIN_SUBJECT" || (a as any).compositionRole === "HERO_BACKGROUND" || a.type === "HERO_IMAGE"
      );
      if (heroAsset) {
        score += 10;
        strengths.push("Includes prominent hero asset for visual focus");
        evidence.push({
          source: "ASSET",
          observation: `Prominent hero asset defined: '${heroAsset.assetId}'`,
          impact: "POSITIVE",
        });
      }
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      dimension: CreativeQualityDimension.ATTENTION,
      score: finalScore,
      confidence: "MODERATE_EVIDENCE",
      evidence,
      strengths,
      weaknesses,
      repairability: finalScore < 70 ? "EASY" : "MODERATE",
      repairStrategy:
        weaknesses.length > 0
          ? {
              strategyId: `rep_att_${Date.now()}`,
              recommendedAction: "Strengthen headline pattern interrupt and elevate hero visual contrast",
              targetComponents: [CreativeComponent.HOOK, CreativeComponent.HERO_ASSET],
              expectedImpact: [CreativeQualityDimension.ATTENTION],
              estimatedEffort: "LOW",
            }
          : undefined,
      policyVersion,
    };
  }
}
