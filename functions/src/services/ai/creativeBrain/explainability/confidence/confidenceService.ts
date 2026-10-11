import type { ExplanationConfidence, DecisionEvidence, DecisionInput } from "../../types/explainability";

/**
 * Phase 10.30 — Confidence Service
 *
 * Calculates structured ExplanationConfidence scores.
 * CRITICAL INVARIANT: Confidence (strategic appropriateness) is strictly separated
 * from Empirical Performance (observed lift).
 */
export class ConfidenceService {
  static calculateConfidence(
    inputs: DecisionInput[],
    evidence: DecisionEvidence[],
    compatibilityScore: number = 0.85
  ): ExplanationConfidence {
    let basis: string[] = [];

    // 1. Inputs weight (0.30)
    const inputsScore = Math.min(1.0, inputs.length * 0.25);
    if (inputs.some((i) => i.type === "BUSINESS_BRAIN")) basis.push("Business context alignment");
    if (inputs.some((i) => i.type === "AUDIENCE")) basis.push("Audience situation fit");

    // 2. Evidence weight (0.40)
    let evidenceScore = 0.5;
    const strongEvidence = evidence.filter((e) => e.strength === "STRONG");
    if (evidence.length > 0) {
      evidenceScore = Math.min(1.0, (strongEvidence.length / evidence.length) * 0.5 + 0.5);
      basis.push(`${evidence.length} evidence reference(s)`);
    }

    // 3. Compatibility weight (0.30)
    const compScore = Math.max(0.0, Math.min(1.0, compatibilityScore));
    if (compScore >= 0.80) basis.push("High creative compatibility");

    const totalScore = Number((inputsScore * 0.30 + evidenceScore * 0.40 + compScore * 0.30).toFixed(4));

    const level: "LOW" | "MEDIUM" | "HIGH" =
      totalScore >= 0.75 ? "HIGH" : totalScore >= 0.55 ? "MEDIUM" : "LOW";

    return {
      score: totalScore,
      level,
      basis,
      evidenceCount: evidence.length,
      evidenceQuality: evidenceScore,
    };
  }
}
