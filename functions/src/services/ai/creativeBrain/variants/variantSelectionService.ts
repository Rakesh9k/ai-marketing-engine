import type {
  CreativeVariant,
  CreativeVariantSet,
  VariantSelectionPolicy,
  MarketingObjective,
} from "../types";
import { VariantDistinctivenessService } from "./variantDistinctivenessService";

export class VariantSelectionService {
  private distinctivenessService = new VariantDistinctivenessService();

  /**
   * Selects a diverse set of CreativeVariants based on the specified selection policy.
   */
  public selectDiverseSet(
    candidates: CreativeVariant[],
    policy: VariantSelectionPolicy,
    sourceDirectionId: string,
    objective: MarketingObjective
  ): CreativeVariantSet {
    const requested = policy.requestedCount || 3;
    const selected: CreativeVariant[] = [];
    const remaining = [...candidates];

    // Sort candidates: prioritize preferredStrategies order if specified
    remaining.sort((a, b) => {
      const aPrefIndex = policy.preferredStrategies ? policy.preferredStrategies.indexOf(a.strategy) : -1;
      const bPrefIndex = policy.preferredStrategies ? policy.preferredStrategies.indexOf(b.strategy) : -1;

      const aPref = aPrefIndex !== -1;
      const bPref = bPrefIndex !== -1;

      if (aPref && !bPref) return -1;
      if (!aPref && bPref) return 1;
      if (aPref && bPref) return aPrefIndex - bPrefIndex;

      return b.score.finalScore - a.score.finalScore;
    });

    while (selected.length < policy.maximumCount && remaining.length > 0) {
      if (selected.length === 0) {
        // Pick the top candidate
        selected.push(remaining.shift()!);
      } else {
        // Compute adjusted score considering redundancy penalty against already selected variants
        let bestCandidateIndex = -1;
        let maxAdjustedScore = -Infinity;

        for (let i = 0; i < remaining.length; i++) {
          const cand = remaining[i];
          if (!cand) continue;
          let maxSimilarity = 0;

          for (const sel of selected) {
            const pairEval = this.distinctivenessService.evaluatePair(cand, sel);
            if (pairEval.similarityScore > maxSimilarity) {
              maxSimilarity = pairEval.similarityScore;
            }
          }

          // Preference boost for policy.preferredStrategies
          const prefIndex = policy.preferredStrategies ? policy.preferredStrategies.indexOf(cand.strategy) : -1;
          const prefBoost = prefIndex !== -1 ? (policy.preferredStrategies!.length - prefIndex) * 100 : 0;

          // Redundancy penalty proportional to similarity
          const redundancyPenalty = maxSimilarity >= 80 ? (maxSimilarity - 50) * 1.5 : 0;
          const adjustedScore = cand.score.finalScore + prefBoost - redundancyPenalty;

          if (adjustedScore > maxAdjustedScore) {
            maxAdjustedScore = adjustedScore;
            bestCandidateIndex = i;
          }
        }

        if (bestCandidateIndex >= 0) {
          const chosen = remaining.splice(bestCandidateIndex, 1)[0];
          if (chosen) {
            // Check if it satisfies distinctiveness threshold
            let isDistinctEnough = true;
            for (const sel of selected) {
              const pairEval = this.distinctivenessService.evaluatePair(chosen, sel);
              if (!pairEval.meaningfulDifference || pairEval.similarityScore > 85) {
                isDistinctEnough = false;
                break;
              }
            }

            if (isDistinctEnough || !policy.requireStrategicDifference) {
              selected.push(chosen);
            }
          }
        } else {
          break;
        }
      }

      if (selected.length >= requested) {
        break;
      }
    }

    const diversity = this.distinctivenessService.evaluateSetDiversity(selected);

    let status: "DRAFT" | "VALIDATED" | "READY" | "PARTIALLY_VALID" | "FAILED" = "READY";
    if (selected.length < policy.minimumCount) {
      status = "FAILED";
    } else if (selected.length < requested) {
      status = "PARTIALLY_VALID";
    }

    return {
      id: `varset-${Date.now()}`,
      version: 1,
      sourceDirectionId,
      objective,
      variants: selected,
      diversity,
      selectionPolicy: policy,
      confidence: selected.every((v) => v.confidence === "VALIDATED") ? "VALIDATED" : "MODERATE_EVIDENCE",
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
