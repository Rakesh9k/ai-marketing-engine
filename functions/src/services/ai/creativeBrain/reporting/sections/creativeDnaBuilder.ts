import type { CreativeLearning, MechanismCombinationLearning } from "../../types/learningLoop";
import type { CreativeDNA } from "../../types/reports";

/**
 * Phase 10.28 — Creative DNA Builder
 *
 * Synthesizes the business's evolving Creative DNA profile from validated learnings.
 */
export class CreativeDnaBuilder {
  static build(
    tenantId: string,
    learnings: CreativeLearning[],
    combos: MechanismCombinationLearning[]
  ): CreativeDNA {
    const validated = learnings.filter((l) => l.status === "VALIDATED" && (l.relativeLift || 0) > 0);

    const definingMechanisms = validated
      .sort((a, b) => (b.relativeLift || 0) - (a.relativeLift || 0))
      .slice(0, 5)
      .map((l) => l.mechanismId || (l as any).patternId || "mechanism");

    const topCombinations = combos
      .filter((c) => (c.synergyMultiplier > 1.0 || (c as any).isSynergistic) && c.confidenceScore >= 0.65)
      .slice(0, 3)
      .map((c) => ({
        mechanisms: (c as any).mechanisms || [c.primaryMechanismId, c.secondaryMechanismId],
        lift: c.combinedLift ?? (c as any).combinationLift ?? 0.35,
      }));

    const weakPatterns = learnings
      .filter((l) => l.status === "REJECTED" || (l.relativeLift || 0) < -0.1)
      .map((l) => l.mechanismId || (l as any).patternId || "pattern");

    const avgConfidence =
      validated.length > 0
        ? validated.reduce((sum, l) => sum + l.confidenceScore, 0) / validated.length
        : 0.5;

    return {
      tenantId,
      definingMechanisms,
      topCombinations,
      strongestFormats: ["Reels", "Carousels"],
      weakPatterns,
      overallConfidence: Number(avgConfidence.toFixed(4)),
      lastUpdatedAt: new Date().toISOString(),
    };
  }
}
