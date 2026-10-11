import type { AudienceSituationReference, BusinessContext, AudienceContext } from "../types";

export class SituationUnderstandingService {
  /**
   * Formulates situational context, trigger, and customer tension.
   */
  public async understand(
    source?: AudienceSituationReference,
    business?: BusinessContext,
    audience?: AudienceContext
  ): Promise<AudienceSituationReference> {
    if (source && source.name) {
      return {
        ...source,
        motivations: source.motivations || audience?.motivations || ["Ease"],
        barriers: source.barriers || audience?.barriers || ["Decision Effort"],
        desiredOutcome: source.desiredOutcome || "Satisfying resolution",
        confidence: source.confidence || "VALIDATED",
        evidenceIds: source.evidenceIds || [],
        assumptions: source.assumptions || [],
      };
    }

    const industry = business?.industry || "Retail";
    return {
      id: `sit-default-${industry.toLowerCase()}`,
      name: `Prime ${industry} Selection Moment`,
      description: `Customer evaluating ${industry} choices during peak decision time`,
      industry,
      trigger: "Impending decision deadline or routine need",
      motivations: audience?.motivations || ["Quality", "Ease"],
      barriers: audience?.barriers || ["Choice Overload"],
      desiredOutcome: "Instant confident choice",
      awarenessStage: audience?.awarenessStage || "SOLUTION_AWARE",
      purchaseIntent: audience?.purchaseIntent || "HIGH",
      confidence: "MODERATE_EVIDENCE",
      evidenceIds: [],
      assumptions: [],
    };
  }
}
