import { StrategicConfirmationState } from "../types";
import type {
  CreativeBrainSession,
  StrategicConfirmation,
  StrategicConfirmationStatus,
  StrategicConfirmationSummary,
  StrategicOpportunitySummary,
  StrategicDirectionSummary,
  StrategicAlternativeSummary,
} from "../types";

import { StrategicConfirmationExplanationService } from "./strategicConfirmationExplanationService";

export class StrategicConfirmationProjectionService {
  private explanationService: StrategicConfirmationExplanationService;

  constructor(explanationService?: StrategicConfirmationExplanationService) {
    this.explanationService = explanationService || new StrategicConfirmationExplanationService();
  }

  /**
   * Projects an internal CreativeBrainSession into a presentation-safe StrategicConfirmation object.
   * Internal machine IDs (psychology IDs, mechanism IDs, recipe IDs, graph node keys, scoring weights)
   * are deliberately filtered out and replaced with clean human-readable strategic concepts.
   */
  public projectConfirmation(session: CreativeBrainSession): StrategicConfirmation {
    const summary = this.buildSummary(session);
    const opportunity = this.buildOpportunitySummary(session);
    const recommendedDirection = this.buildRecommendedDirectionSummary(session);
    const alternatives = this.buildAlternativeSummaries(session);
    const explanation = this.explanationService.generateExplanation(session);

    const state: StrategicConfirmationState =
      session.currentState === "CONFIRMED"
        ? StrategicConfirmationState.CONFIRMED
        : session.currentState === "REVISION_REQUIRED"
        ? StrategicConfirmationState.REVISION_REQUIRED
        : session.currentState === "ALTERNATIVE_DIRECTION_READY" || (session.currentState as string) === "ALTERNATIVE_READY"
        ? StrategicConfirmationState.ALTERNATIVE_READY
        : StrategicConfirmationState.REQUIRED;

    const status: StrategicConfirmationStatus =
      session.currentState === "CONFIRMED"
        ? "CONFIRMED"
        : session.currentState === "REVISION_REQUIRED"
        ? "REVISION_REQUIRED"
        : session.currentState === "ALTERNATIVE_DIRECTION_READY" || (session.currentState as string) === "ALTERNATIVE_READY"
        ? "ALTERNATIVE_DIRECTION_READY"
        : "REQUIRED";

    return {
      confirmationId: `conf_${session.sessionId}_${Date.now()}`,
      sessionId: session.sessionId,
      revision: session.revisions?.length || 1,
      strategyRevision: session.revisions?.length || 1,
      state,
      status,
      strategyState: session.creativeDirection ? "READY" : "NOT_READY",
      executionState: session.currentState === "CONFIRMED" ? "AUTHORIZED" : "NOT_AUTHORIZED",
      summary,
      opportunity,
      recommendedDirection,
      alternatives,
      explanation,
      confidence: "HIGH",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private buildSummary(session: CreativeBrainSession): StrategicConfirmationSummary {
    return {
      businessName: session.businessContext.name,
      industry: session.businessContext.industry,
      productOrService: session.productContext?.name || session.offerContext?.name || `${session.businessContext.industry} Solution`,
      targetAudience: session.audienceContext?.description || "Primary Target Audience",
      situation: session.situationContext?.name || session.situationContext?.description || "Key Decision Moment",
      marketingObjective: session.objective,
    };
  }

  private buildOpportunitySummary(session: CreativeBrainSession): StrategicOpportunitySummary {
    const opp = session.selectedOpportunity;
    return {
      opportunityTitle: opp?.opportunity.name || opp?.opportunity.strategicPurpose || "Strategic Engagement Opportunity",
      whyNow: opp?.opportunity.definition || "Audience has an active decision moment requiring resolution",
      coreInsight: opp?.opportunity.strategicPurpose || "Customer values clear, trustworthy resolution of key pain point",
    };
  }

  private buildRecommendedDirectionSummary(session: CreativeBrainSession): StrategicDirectionSummary {
    const selectedVariant = session.selectedVariant || session.variantSet?.variants[0];
    const direction = selectedVariant?.direction || session.creativeDirection;
    const strategy = selectedVariant?.strategy || "CONVENIENCE";

    return {
      directionId: direction?.id || `dir_${session.sessionId}`,
      variantId: selectedVariant?.id || `var_${session.sessionId}_0`,
      strategyType: strategy,
      strategyName: this.formatStrategyName(strategy),
      strategicPremise: direction?.coreIdea.statement || `Positioning offering via ${strategy.toLowerCase()} strategy`,
      targetDesireOrFear: direction?.coreIdea.strategicMeaning || "Desire for effective, reliable outcome",
      creativeHookConcept: direction?.hook?.openingFunction || direction?.hook?.purpose || "Direct value hook highlighting key outcome",
      coreMechanismConcept: direction?.creativeMechanism?.primary?.name || "Proven, simple delivery process",
      callToActionConcept: direction?.cta?.desiredBehavior || "Get started now",
      whyThisWorks: [
        `Aligns directly with audience situation: ${session.situationContext?.name || "Decision Moment"}`,
        `Leverages ${strategy.toLowerCase()} hypothesis to remove friction`,
        "Supported by verified business facts and transparent value proposition",
      ],
      whatWeAreDoing: [
        `Emphasizing ${strategy.toLowerCase()} benefits for target segment`,
        "Structuring messaging for clear decision making",
        "Using direct, authentic value messaging",
      ],
      whatWeAreNotDoing: [
        "Leading with unverified discount claims",
        "Using fake countdown timers or artificial scarcity",
        "Making unsubstantiated popularity promises",
      ],
    };
  }

  private buildAlternativeSummaries(session: CreativeBrainSession): StrategicAlternativeSummary[] {
    const variants = session.variantSet?.variants || [];
    const selectedVariantId = session.selectedVariant?.id || variants[0]?.id;

    const alternatives = variants.filter((v) => v.id !== selectedVariantId);

    return alternatives.map((alt) => ({
      alternativeId: alt.id,
      strategyType: alt.strategy,
      strategyName: this.formatStrategyName(alt.strategy),
      strategicAngle: alt.differentiation?.strategicHypothesis || alt.differentiation?.primaryDifference || `Alternative ${alt.strategy} angle`,
      whyExploreThis: `Pivots angle to emphasis on ${alt.strategy.toLowerCase()}`,
      keyDifferenceFromRecommended: `Shifts emphasis from ${variants[0]?.strategy.toLowerCase() || "recommended"} to ${alt.strategy.toLowerCase()}`,
    }));
  }

  private formatStrategyName(strategy: string): string {
    return strategy
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
}
