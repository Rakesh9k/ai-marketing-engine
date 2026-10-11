import type { AudienceContext, BusinessContext } from "../types";

export class AudienceUnderstandingService {
  /**
   * Synthesizes audience context, motivations, barriers, and awareness stage.
   */
  public async understand(
    source?: AudienceContext,
    business?: BusinessContext
  ): Promise<AudienceContext> {
    if (source && source.description) {
      return {
        ...source,
        motivations: source.motivations || ["Quality", "Ease"],
        barriers: source.barriers || ["Time", "Price Concerns"],
        desiredOutcomes: source.desiredOutcomes || ["Satisfaction"],
        awarenessStage: source.awarenessStage || "SOLUTION_AWARE",
        purchaseIntent: source.purchaseIntent || "HIGH",
      };
    }

    // Default synthesis if audience is unsupplied
    const industryName = business?.industry || "Category";
    return {
      description: `Discerning customers seeking quality ${industryName} solutions`,
      motivations: ["Quality", "Reliability", "Ease"],
      barriers: ["Decision Effort", "Trust Verification"],
      desiredOutcomes: ["Hassle-free satisfaction"],
      awarenessStage: "SOLUTION_AWARE",
      purchaseIntent: "MEDIUM",
      trustLevel: "MODERATE_EVIDENCE",
      uncertaintyLevel: "HYPOTHESIS",
    };
  }
}
