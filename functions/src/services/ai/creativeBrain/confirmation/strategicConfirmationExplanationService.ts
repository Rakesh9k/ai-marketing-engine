import type {
  CreativeBrainSession,
  StrategicConfirmationExplanation,
} from "../types";

export class StrategicConfirmationExplanationService {
  /**
   * Generates traceable human explanations detailing why this specific audience,
   * situation, opportunity, and strategy were chosen, as well as the strategic tradeoffs.
   */
  public generateExplanation(session: CreativeBrainSession): StrategicConfirmationExplanation {
    const businessName = session.businessContext.name;
    const audienceDesc = session.audienceContext?.description || "target customers";
    const situationDesc = session.situationContext?.description || session.situationContext?.name || "active evaluation state";
    const oppPurpose = session.selectedOpportunity?.opportunity.strategicPurpose || "capitalize on market demand with clear positioning";
    const primaryStrategy = session.selectedVariant?.strategy || session.variantSet?.variants[0]?.strategy || "CONVENIENCE";

    const whyThisAudience = `Mitra identified ${audienceDesc} as the primary segment for ${businessName} based on high intent alignment and product-market fit.`;

    const whyThisSituation = `The audience is currently experiencing ${situationDesc}, creating a responsive window for targeted strategic message placement.`;

    const whyThisOpportunity = `The core strategic opportunity is to ${oppPurpose}, directly resolving audience hesitation at the critical decision moment.`;

    const whyThisStrategy = `The ${primaryStrategy.toLowerCase()} strategy was chosen because it directly addresses the dominant friction point in the customer's decision journey.`;

    const tradeoffs = [
      `Prioritizes ${primaryStrategy.toLowerCase()} focus over broad brand awareness messaging`,
      "Requires tight messaging consistency across creative assets",
      "May require secondary campaigns to target adjacent audience segments with different motivations",
    ];

    return {
      whyThisAudience,
      whyThisSituation,
      whyThisOpportunity,
      whyThisStrategy,
      tradeoffs,
    };
  }
}
