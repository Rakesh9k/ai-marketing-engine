import type {
  CreativeQualityScore,
  QualityEvidence,
  CreativeQualityEvaluationInput} from "../../../types";
import {
  CreativeQualityDimension,
  CreativeComponent,
} from "../../../types";

export class StrategicFitEvaluator {
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
    const offerCopy = getStr((input.creative.copy as any)?.offerText || input.creative.copy?.offerCopy).toLowerCase();
    const fullText = `${headline} ${body} ${offerCopy}`;

    const strategy = input.strategy;
    const coreIdea = (strategy.coreIdea as any)?.statement || (strategy.coreIdea as any)?.shortVersion || (strategy as any).name || "";
    const mechanism = (strategy as any).mechanism?.name || strategy.creativeMechanism?.primary?.name || "";

    let score = 85;

    // 1. Core Idea & Strategic Angle Alignment
    if (coreIdea) {
      const coreWords = coreIdea.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
      const matchesCore = coreWords.some((w: string) => fullText.includes(w));
      if (matchesCore) {
        score += 5;
        strengths.push(`Creative copy aligns with core strategic idea: '${coreIdea}'`);
        evidence.push({
          source: "STRATEGY",
          observation: `Copy reflects core idea keywords from '${coreIdea}'`,
          impact: "POSITIVE",
        });
      } else {
        score -= 15;
        weaknesses.push(`Creative copy deviates from core strategic idea '${coreIdea}'`);
        evidence.push({
          source: "COPY",
          observation: `Copy lacks core strategic theme '${coreIdea}'`,
          impact: "NEGATIVE",
        });
      }
    }

    // 2. Strategic Mechanism vs Generic Discount Check
    // E.g., Strategy is Convenience ("effortless family dinner"), but copy replaced it with generic discount ("20% OFF")
    if (mechanism) {
      const mechLower = mechanism.toLowerCase();
      const mentionsMechanism = fullText.includes(mechLower) ||
        (mechLower.includes("convenience") && (fullText.includes("easy") || fullText.includes("quick") || fullText.includes("effortless") || fullText.includes("ready"))) ||
        (mechLower.includes("family") && fullText.includes("family")) ||
        (mechLower.includes("quality") && fullText.includes("fresh"));

      if (mentionsMechanism) {
        score += 5;
        strengths.push(`Creative communicates approved strategic mechanism '${mechanism}'`);
        evidence.push({
          source: "CREATIVE_DIRECTION",
          observation: `Execution emphasizes mechanism '${mechanism}'`,
          impact: "POSITIVE",
        });
      } else if (/(?:\d+%\s*off|discount|cheapest|sale)/i.test(fullText)) {
        score -= 20;
        weaknesses.push(`Creative replaced strategic mechanism '${mechanism}' with generic discount messaging`);
        evidence.push({
          source: "COPY",
          observation: `Strategic mechanism '${mechanism}' substituted with price-discount focus`,
          impact: "NEGATIVE",
        });
      }
    }

    const finalScore = Math.max(0, Math.min(100, score));
    const repairability = finalScore < 70 ? "EASY" : "MODERATE";

    return {
      dimension: CreativeQualityDimension.STRATEGIC_FIT,
      score: finalScore,
      confidence: "MODERATE_EVIDENCE",
      evidence,
      strengths,
      weaknesses,
      repairability,
      repairStrategy:
        weaknesses.length > 0
          ? {
              strategyId: `rep_strat_${Date.now()}`,
              recommendedAction: "Align headline and copy directly with approved strategic core idea and mechanism",
              targetComponents: [CreativeComponent.HEADLINE, CreativeComponent.SUPPORTING_COPY],
              expectedImpact: [CreativeQualityDimension.STRATEGIC_FIT],
              estimatedEffort: "LOW",
            }
          : undefined,
      policyVersion,
    };
  }
}
