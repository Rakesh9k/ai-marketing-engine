import type {
  CreativeQualityScore,
  QualityEvidence,
  CreativeQualityEvaluationInput} from "../../../types";
import {
  CreativeQualityDimension,
  CreativeComponent,
} from "../../../types";

export class EmotionalResonanceEvaluator {
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

    const intendedEmotion = (input.strategy.psychology as any)?.intendedEmotion || (input.strategy as any).emotionalTerritory || "RELIEF";

    let score = 85;

    // 1. Transactional Noise vs Intended Emotional Resonance
    // E.g., Intended = RELIEF/CONFIDENCE, but copy is purely aggressive transaction ("BUY NOW 30% OFF!!!")
    if (/(?:buy now|order immediately|\d+%\s*off|cheap|limited offer)/i.test(fullText) && !/(?:relax|effortless|peace|confidence|care|treat|enjoy|comfort|worry)/i.test(fullText)) {
      score -= 25;
      weaknesses.push(`Execution communicates transactional pressure rather than intended emotional territory '${intendedEmotion}'`);
      evidence.push({
        source: "COPY",
        observation: `Copy tone conflicts with intended emotion '${intendedEmotion}'`,
        impact: "NEGATIVE",
      });
    } else {
      strengths.push(`Copy resonates with strategic emotional territory '${intendedEmotion}'`);
      evidence.push({
        source: "CREATIVE_DIRECTION",
        observation: `Execution tone aligns with '${intendedEmotion}'`,
        impact: "POSITIVE",
      });
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      dimension: CreativeQualityDimension.EMOTIONAL_RESONANCE,
      score: finalScore,
      confidence: "MODERATE_EVIDENCE",
      evidence,
      strengths,
      weaknesses,
      repairability: finalScore < 70 ? "EASY" : "MODERATE",
      repairStrategy:
        weaknesses.length > 0
          ? {
              strategyId: `rep_emo_${Date.now()}`,
              recommendedAction: `Reframe messaging around intended emotion '${intendedEmotion}' rather than aggressive transaction`,
              targetComponents: [CreativeComponent.HEADLINE, CreativeComponent.SUPPORTING_COPY, CreativeComponent.VISUAL_DIRECTION],
              expectedImpact: [CreativeQualityDimension.EMOTIONAL_RESONANCE],
              estimatedEffort: "MEDIUM",
            }
          : undefined,
      policyVersion,
    };
  }
}
