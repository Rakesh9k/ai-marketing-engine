import type {
  CreativeVariant,
  CreativeVariantScore,
  CreativeContext,
  CreativeConstraints,
  Score,
} from "../types";
import { CANONICAL_VARIANT_STRATEGIES } from "./strategyLibrary";

export class VariantScoringService {
  /**
   * Scores a single CreativeVariant deterministically.
   */
  public scoreVariant(
    variant: CreativeVariant,
    context: CreativeContext,
    constraints?: CreativeConstraints
  ): CreativeVariantScore {
    const stratRef = CANONICAL_VARIANT_STRATEGIES[variant.strategy];

    // 1. Context Fit (0–15)
    let contextFit: Score = 15;

    // 2. Audience Fit (0–15)
    let audienceFit: Score = 15;

    // 3. Objective Fit (0–15)
    let objectiveFit: Score = 15;
    if (stratRef && !stratRef.bestFor.includes(context.objective)) {
      objectiveFit = 10; // slight drop if not top-tier objective match
    }

    // 4. Strategic Fit (0–15)
    let strategicFit: Score = 15;

    // 5. Offer / Product Fit (0–10)
    let productFit: Score = 10;

    // 6. Psychology Fit (0–10)
    let psychologyFit: Score = 10;

    // 7. Mechanism Fit (0–5)
    let mechanismFit: Score = 5;

    // 8. Platform Fit (0–5)
    let platformFit: Score = 5;

    // 9. Differentiation (0–5)
    let differentiation: Score = variant.differentiation.changedDimensions.length >= 2 ? 5 : 3;

    // 10. Evidence / Confidence Fit (0–5)
    let evidenceFit: Score = variant.confidence === "VALIDATED" ? 5 : variant.confidence === "STRONG_EVIDENCE" ? 4 : 3;

    // Base score calculation
    let baseScore =
      contextFit +
      audienceFit +
      objectiveFit +
      strategicFit +
      productFit +
      psychologyFit +
      mechanismFit +
      platformFit +
      differentiation +
      evidenceFit;

    // Calculate penalties
    let conflictPenalty = 0;
    let riskPenalty = 0;

    if (variant.risks.length > 0) {
      riskPenalty += Math.min(20, variant.risks.length * 5);
    }

    // Check for hard/prohibited constraints
    if (constraints?.prohibitedClaims) {
      const copyStr = JSON.stringify(variant.direction).toLowerCase();
      for (const prohibited of constraints.prohibitedClaims) {
        if (copyStr.includes(prohibited.toLowerCase())) {
          conflictPenalty += 50;
        }
      }
    }

    const finalScore = Math.max(0, Math.min(100, baseScore - conflictPenalty - riskPenalty));

    const explanation = `Base score ${baseScore}/100. Conflict penalty: ${conflictPenalty}, Risk penalty: ${riskPenalty}. Final variant score: ${finalScore}.`;

    return {
      contextFit,
      strategicFit,
      audienceFit,
      objectiveFit,
      differentiation,
      componentCoherence: 15,
      evidenceFit,
      executionFeasibility: 10,
      ethicalSafety: 10,
      conflictPenalty,
      riskPenalty,
      finalScore,
      scorePolicyVersion: 1,
      explanation,
    };
  }
}
