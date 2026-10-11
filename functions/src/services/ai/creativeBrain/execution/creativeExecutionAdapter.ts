import type {
  CreativeBrainSession,
  CreativeExecutionInput,
} from "../types";

export class CreativeExecutionAdapter {
  /**
   * Prepares execution payload strictly after user confirmation.
   * Throws error if user confirmation has not occurred.
   */
  public prepareExecutionPayload(session: CreativeBrainSession): CreativeExecutionInput {
    if (session.currentState !== "CONFIRMED" && session.currentState !== "EXECUTION_READY") {
      throw new Error(
        `Execution forbidden: Creative Brain session is in state '${session.currentState}'. Mandatory USER_CONFIRMED gate required before execution.`
      );
    }

    if (!session.userConfirmation || !session.userConfirmation.confirmed) {
      throw new Error("Execution forbidden: Mandatory user confirmation missing.");
    }

    const direction = session.selectedVariant?.direction || session.creativeDirection;
    if (!direction) {
      throw new Error("Execution forbidden: No valid CreativeDirection available in session.");
    }

    return {
      direction,
      business: session.businessContext,
      platform: session.platformContext,
      format: session.formatContext,
      constraints: direction.constraints,
    };
  }
}
