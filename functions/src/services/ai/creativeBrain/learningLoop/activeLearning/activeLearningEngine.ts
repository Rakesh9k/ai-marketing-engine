import type { CreativeExperimentSuggestion, CreativeLearning } from "../../types/learningLoop";
import type { ID, ISODateTime } from "../../types/primitives";

/**
 * Active Learning Engine.
 * Identifies creative intelligence gaps and formulates experiment suggestions
 * ("what should Mitra test next?") to systematically improve strategic understanding.
 */
export class ActiveLearningEngine {
  /**
   * Generates active learning experiment suggestions based on existing validated & emerging learnings.
   */
  generateExperimentSuggestions(
    learnings: CreativeLearning[],
    _allMechanisms: ID[]
  ): CreativeExperimentSuggestion[] {
    const suggestions: CreativeExperimentSuggestion[] = [];
    const now: ISODateTime = new Date().toISOString();

    const validatedMechs = new Set(
      learnings.filter((l) => l.status === "VALIDATED").map((l) => l.mechanismId)
    );
    const emergingMechs = learnings
      .filter((l) => l.status === "EMERGING" || l.status === "VALIDATING")
      .map((l) => l.mechanismId);

    // If we have strong evidence for Mechanism A, but weak evidence for Mechanism B in the same industry, suggest A vs B test
    if (validatedMechs.size > 0 && emergingMechs.length > 0) {
      const mechA = Array.from(validatedMechs)[0];
      const mechB = emergingMechs[0];
      const primaryLearning = learnings.find((l) => l.mechanismId === mechA);

      suggestions.push({
        experimentId: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tenantId: primaryLearning?.tenantId,
        hypothesis: `Testing emerging mechanism [${mechB}] against validated mechanism [${mechA}] will reduce strategic uncertainty in ${
          primaryLearning?.context.industry || "target"
        } context.`,
        targetMechanismA: mechA,
        targetMechanismB: mechB,
        context: {
          industry: primaryLearning?.context.industry,
          objective: primaryLearning?.context.objective,
          platform: primaryLearning?.context.platform,
        },
        rationale: `Mechanism [${mechA}] has strong historical evidence, while [${mechB}] has promising emerging signals requiring controlled validation.`,
        expectedInsight: `Determines whether [${mechB}] can outperform or synergize with [${mechA}].`,
        createdAt: now,
      });
    }

    return suggestions;
  }
}
