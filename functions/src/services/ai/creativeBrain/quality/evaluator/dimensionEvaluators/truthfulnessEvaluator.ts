import type {
  CreativeQualityScore,
  QualityEvidence,
  CreativeQualityEvaluationInput} from "../../../types";
import {
  CreativeQualityDimension,
  CreativeComponent,
} from "../../../types";

export class TruthfulnessEvaluator {
  public evaluate(input: CreativeQualityEvaluationInput, policyVersion: string): CreativeQualityScore {
    const evidence: QualityEvidence[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const truthCheck = input.governance.truth;

    let score = 100;
    let repairability: "EASY" | "MODERATE" | "HARD" | "NOT_REPAIRABLE" = "EASY";

    if (truthCheck.status === "FAIL") {
      score = 0;
      repairability = "HARD";
      weaknesses.push("Authoritative Truth Check FAILED. Deceptive or unverified claims detected");
      evidence.push({
        source: "TRUTH_CHECK",
        observation: "Truth Check status is FAIL",
        impact: "NEGATIVE",
      });
    } else if (truthCheck.status === "REVIEW_REQUIRED") {
      score = 50;
      repairability = "MODERATE";
      weaknesses.push("Truth Check requires human review for unverified claims or expiration dates");
      evidence.push({
        source: "TRUTH_CHECK",
        observation: "Truth Check status is REVIEW_REQUIRED",
        impact: "NEUTRAL",
      });
    } else {
      score = 100;
      strengths.push("All creative copy and asset claims strictly verified against Business Brain");
      evidence.push({
        source: "TRUTH_CHECK",
        observation: "Authoritative Truth Check passed completely",
        impact: "POSITIVE",
      });
    }

    return {
      dimension: CreativeQualityDimension.TRUTHFULNESS,
      score,
      confidence: "VALIDATED",
      evidence,
      strengths,
      weaknesses,
      repairability,
      repairStrategy:
        score < 100
          ? {
              strategyId: `rep_tru_${Date.now()}`,
              recommendedAction: "Remove unverified pricing/scarcity/claim text or attach verified business facts",
              targetComponents: [CreativeComponent.HEADLINE, CreativeComponent.OFFER_COPY],
              expectedImpact: [CreativeQualityDimension.TRUTHFULNESS],
              estimatedEffort: "LOW",
            }
          : undefined,
      policyVersion,
    };
  }
}
