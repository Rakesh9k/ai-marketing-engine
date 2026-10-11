import type {
  CreativeBrainSession,
  CreativeUnderstandingSummary,
} from "../types";

export class CreativeExplanationService {
  /**
   * Generates a structured "Here's what I understood" summary from a CreativeBrainSession.
   */
  public generateSummary(session: CreativeBrainSession): CreativeUnderstandingSummary {
    const businessName = session.businessContext.name;
    const industry = session.businessContext.industry;
    const productOrService = session.productContext?.name || session.offerContext?.name || `${industry} Offerings`;
    const targetAudience = session.audienceContext?.description || "Target Audience";
    const situation = session.situationContext?.name || session.situationContext?.description || "Decision Moment";

    const coreOpportunity = session.selectedOpportunity?.opportunity.strategicPurpose ||
      session.creativeDirection?.coreIdea.strategicMeaning ||
      "Simplify decision and drive customer action";

    const primaryStrategy = session.variantSet?.variants[0]?.strategy || "CONVENIENCE";
    const recommendedDirectionStatement = session.creativeDirection?.coreIdea.statement ||
      `Promote ${productOrService} with ${primaryStrategy} framing`;

    const alternativeStrategies = session.variantSet?.variants.slice(1).map((v) => v.strategy) || ["VALUE", "IDENTITY"];

    const whatWeAreDoing = [
      `Focusing on customer tension: ${session.situationContext?.description || situation}`,
      `Positioning ${productOrService} around ${primaryStrategy.toLowerCase()} strategy`,
      `Using verified business facts and clear call to action`,
    ];

    const whatWeAreNotDoing = [
      "Leading with unverified discount claims",
      "Using artificial countdown timers or fake scarcity",
      "Making unsubstantiated popularity promises",
    ];

    return {
      businessName,
      industry,
      productOrService,
      targetAudience,
      situation,
      coreOpportunity,
      primaryStrategy,
      recommendedDirectionStatement,
      alternativeStrategies,
      whatWeAreDoing,
      whatWeAreNotDoing,
      confidence: session.creativeDirection?.confidence || "VALIDATED",
    };
  }
}
