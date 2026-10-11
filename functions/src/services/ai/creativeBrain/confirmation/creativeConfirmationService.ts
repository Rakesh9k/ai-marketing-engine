import type {
  CreativeBrainSession,
  CreativeConfirmation,
  CreativeBrainRevision,
} from "../types";

export class CreativeConfirmationService {
  /**
   * Processes explicit user confirmation of strategy.
   */
  public processConfirmation(
    session: CreativeBrainSession,
    userNotes?: string,
    selectedVariantId?: string
  ): CreativeBrainSession {
    const confirmation: CreativeConfirmation = {
      confirmed: true,
      selectedVariantId: selectedVariantId || session.variantSet?.variants[0]?.id,
      userNotes,
      confirmedAt: new Date().toISOString(),
    };

    const updatedVariant = selectedVariantId
      ? session.variantSet?.variants.find((v) => v.id === selectedVariantId) || session.selectedVariant
      : session.selectedVariant || session.variantSet?.variants[0];

    return {
      ...session,
      userConfirmation: confirmation,
      selectedVariant: updatedVariant,
      currentState: "CONFIRMED",
      stateHistory: [
        ...session.stateHistory,
        {
          from: session.currentState,
          to: "CONFIRMED",
          reason: "User confirmed creative strategy",
          timestamp: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Processes a user revision, invalidating affected downstream decision nodes.
   */
  public processRevision(
    session: CreativeBrainSession,
    revision: CreativeBrainRevision
  ): CreativeBrainSession {
    const updatedHistory = [
      ...session.stateHistory,
      {
        from: session.currentState,
        to: "UNDERSTANDING_BUSINESS" as const,
        reason: `User requested revision: ${revision.type}`,
        timestamp: new Date().toISOString(),
      },
    ];

    let updatedAudience = session.audienceContext;
    let updatedSituation = session.situationContext;
    let updatedObjective = session.objective;
    let updatedOffer = session.offerContext;

    switch (revision.type) {
      case "CHANGE_AUDIENCE":
        if (revision.updatedAudience) updatedAudience = revision.updatedAudience;
        break;

      case "CHANGE_SITUATION":
        if (revision.updatedSituation) updatedSituation = revision.updatedSituation;
        break;

      case "CHANGE_OBJECTIVE":
        if (revision.updatedObjective) updatedObjective = revision.updatedObjective;
        break;

      case "CHANGE_OFFER":
        if (revision.updatedOffer) updatedOffer = revision.updatedOffer;
        break;

      case "SELECT_VARIANT":
        if (revision.selectedVariantId) {
          const variant = session.variantSet?.variants.find((v) => v.id === revision.selectedVariantId);
          if (variant) {
            return {
              ...session,
              selectedVariant: variant,
              revisions: [...session.revisions, revision],
              updatedAt: new Date().toISOString(),
            };
          }
        }
        break;

      default:
        break;
    }

    // Invalidate downstream decision nodes (direction, variants, recommendations)
    return {
      ...session,
      audienceContext: updatedAudience,
      situationContext: updatedSituation,
      objective: updatedObjective,
      offerContext: updatedOffer,
      opportunityRecommendations: undefined,
      selectedOpportunity: undefined,
      creativeDirection: undefined,
      variantSet: undefined,
      selectedVariant: undefined,
      understandingSummary: undefined,
      userConfirmation: undefined,
      currentState: "UNDERSTANDING_AUDIENCE",
      revisions: [...session.revisions, revision],
      stateHistory: updatedHistory,
      updatedAt: new Date().toISOString(),
    };
  }
}
