import type {
  CreativeBrainSession,
  CreativeBrainRevision,
  StrategicRevisionType,
} from "../types";

export class StrategicRevisionInvalidationService {
  /**
   * Processes a user revision with targeted downstream invalidation.
   * BusinessContext remains strictly immutable.
   */
  public processRevisionWithInvalidation(
    session: CreativeBrainSession,
    revision: CreativeBrainRevision
  ): CreativeBrainSession {
    // Audit check: Business context must not be mutated
    const originalBusiness = session.businessContext;

    let updatedAudience = session.audienceContext;
    let updatedSituation = session.situationContext;
    let updatedObjective = session.objective;
    let updatedOffer = session.offerContext;
    let updatedProduct = session.productContext;

    const revisionType: StrategicRevisionType = this.mapRevisionType(revision.type);

    switch (revisionType) {
      case "AUDIENCE":
        if (revision.updatedAudience) updatedAudience = revision.updatedAudience;
        // Invalidate Situation downstream when Audience changes significantly
        updatedSituation = revision.updatedSituation || undefined;
        break;

      case "SITUATION":
        if (revision.updatedSituation) updatedSituation = revision.updatedSituation;
        break;

      case "OBJECTIVE":
        if (revision.updatedObjective) updatedObjective = revision.updatedObjective;
        break;

      case "OFFER":
        if (revision.updatedOffer) updatedOffer = revision.updatedOffer;
        break;

      case "PRODUCT":
        break;

      case "DIRECTION":
        break;

      case "ADDITIONAL_INFORMATION":
        break;

      default:
        break;
    }

    const updatedHistory = [
      ...session.stateHistory,
      {
        from: session.currentState,
        to: "REVISION_REQUIRED" as const,
        reason: `Targeted revision applied for '${revisionType}'. Downstream intelligence invalidated.`,
        timestamp: new Date().toISOString(),
      },
    ];

    return {
      ...session,
      businessContext: originalBusiness, // Business Brain facts remain strictly read-only
      audienceContext: updatedAudience,
      situationContext: updatedSituation,
      objective: updatedObjective,
      offerContext: updatedOffer,
      productContext: updatedProduct,
      // Target invalidation of downstream generated intelligence
      opportunityRecommendations: undefined,
      selectedOpportunity: undefined,
      creativeContext: undefined,
      creativeDirection: undefined,
      variantSet: undefined,
      selectedVariant: undefined,
      understandingSummary: undefined,
      userConfirmation: undefined,
      currentState: "REVISION_REQUIRED",
      revisions: [...session.revisions, revision],
      stateHistory: updatedHistory,
      updatedAt: new Date().toISOString(),
    };

  }

  private mapRevisionType(type: string): StrategicRevisionType {
    switch (type) {
      case "CHANGE_AUDIENCE":
        return "AUDIENCE";
      case "CHANGE_SITUATION":
        return "SITUATION";
      case "CHANGE_OBJECTIVE":
        return "OBJECTIVE";
      case "CHANGE_OFFER":
        return "OFFER";
      case "CHANGE_DIRECTION":
        return "DIRECTION";
      case "ADD_INFORMATION":
        return "ADDITIONAL_INFORMATION";
      default:
        return "ADDITIONAL_INFORMATION";
    }
  }
}
