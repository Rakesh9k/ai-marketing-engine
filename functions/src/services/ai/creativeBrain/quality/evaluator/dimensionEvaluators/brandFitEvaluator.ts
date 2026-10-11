import type {
  CreativeQualityScore,
  QualityEvidence,
  CreativeQualityEvaluationInput} from "../../../types";
import {
  CreativeQualityDimension,
  CreativeComponent,
} from "../../../types";

export class BrandFitEvaluator {
  public evaluate(input: CreativeQualityEvaluationInput, policyVersion: string): CreativeQualityScore {
    const evidence: QualityEvidence[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const brandCheck = input.governance.brand;

    let score = 90;

    if (brandCheck.status === "FAIL") {
      score = 40;
      weaknesses.push("Governance Brand Check failed with blocking brand violations");
      evidence.push({
        source: "BRAND",
        observation: `Brand governance status: ${brandCheck.status}`,
        impact: "NEGATIVE",
      });
    } else {
      if (brandCheck.voiceCompliant) {
        strengths.push("Copy complies with authoritative brand voice guidelines");
        evidence.push({
          source: "BRAND",
          observation: "Brand voice compliance verified",
          impact: "POSITIVE",
        });
      }
      if (brandCheck.positioningCompliant) {
        strengths.push("Creative aligns with brand positioning");
      }
      if (brandCheck.visualIdentityCompliant) {
        strengths.push("Visual assets strictly adhere to authentic brand assets");
      }
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      dimension: CreativeQualityDimension.BRAND_FIT,
      score: finalScore,
      confidence: "MODERATE_EVIDENCE",
      evidence,
      strengths,
      weaknesses,
      repairability: finalScore < 70 ? "EASY" : "MODERATE",
      repairStrategy:
        weaknesses.length > 0
          ? {
              strategyId: `rep_brd_${Date.now()}`,
              recommendedAction: "Adjust vocabulary and visual identity to match brand positioning",
              targetComponents: [CreativeComponent.STYLE, CreativeComponent.HEADLINE],
              expectedImpact: [CreativeQualityDimension.BRAND_FIT],
              estimatedEffort: "LOW",
            }
          : undefined,
      policyVersion,
    };
  }
}
