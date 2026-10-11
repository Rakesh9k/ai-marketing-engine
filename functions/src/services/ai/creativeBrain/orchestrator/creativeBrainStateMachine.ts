import type { OrchestratorStatus, CreativeBrainSession } from "../types";

export class CreativeBrainStateMachine {
  private allowedTransitions: Record<OrchestratorStatus, OrchestratorStatus[]> = {
    INIT: ["LOADING_BUSINESS", "FAILED"],
    LOADING_BUSINESS: ["UNDERSTANDING_BUSINESS", "FAILED", "BLOCKED"],
    UNDERSTANDING_BUSINESS: ["UNDERSTANDING_AUDIENCE", "CLARIFICATION_REQUIRED", "FAILED"],
    UNDERSTANDING_AUDIENCE: ["UNDERSTANDING_SITUATION", "CLARIFICATION_REQUIRED", "FAILED"],
    UNDERSTANDING_SITUATION: ["UNDERSTANDING_OBJECTIVE", "CLARIFICATION_REQUIRED", "FAILED"],
    UNDERSTANDING_OBJECTIVE: ["IDENTIFYING_OPPORTUNITY", "CLARIFICATION_REQUIRED", "FAILED"],
    IDENTIFYING_OPPORTUNITY: ["RETRIEVING_INTELLIGENCE", "NO_OPPORTUNITY", "FAILED"],
    RETRIEVING_INTELLIGENCE: ["RANKING_INTELLIGENCE", "NO_VALID_INTELLIGENCE", "FAILED"],
    RANKING_INTELLIGENCE: ["COMPOSING_STRATEGY", "FAILED"],
    COMPOSING_STRATEGY: ["GENERATING_VARIANTS", "NO_VALID_STRATEGY", "FAILED"],
    GENERATING_VARIANTS: ["VALIDATING_STRATEGY", "NO_DIVERSITY", "FAILED"],
    VALIDATING_STRATEGY: ["EXPLAINING_STRATEGY", "CONFLICT", "BLOCKED", "FAILED"],
    EXPLAINING_STRATEGY: ["CONFIRMATION_REQUIRED", "FAILED"],
    CONFIRMATION_REQUIRED: ["CONFIRMED", "REVISION_REQUIRED", "ALTERNATIVE_DIRECTION_READY", "UNDERSTANDING_AUDIENCE", "UNDERSTANDING_BUSINESS", "FAILED"],
    CONFIRMED: ["EXECUTION_READY", "FAILED"],
    REVISION_REQUIRED: ["UNDERSTANDING_AUDIENCE", "UNDERSTANDING_BUSINESS", "CONFIRMATION_REQUIRED", "FAILED"],
    ALTERNATIVE_DIRECTION_READY: ["CONFIRMATION_REQUIRED", "CONFIRMED", "REVISION_REQUIRED", "FAILED"],
    EXECUTION_READY: ["EXECUTING", "FAILED"],
    EXECUTING: ["COMPLETED", "FAILED"],
    COMPLETED: [],


    // Failure / Exception states
    CLARIFICATION_REQUIRED: ["UNDERSTANDING_AUDIENCE", "UNDERSTANDING_BUSINESS", "FAILED"],
    INCOMPLETE: ["UNDERSTANDING_BUSINESS", "FAILED"],
    NO_OPPORTUNITY: ["UNDERSTANDING_OBJECTIVE", "FAILED"],
    NO_VALID_INTELLIGENCE: ["RETRIEVING_INTELLIGENCE", "FAILED"],
    NO_VALID_STRATEGY: ["COMPOSING_STRATEGY", "FAILED"],
    NO_DIVERSITY: ["CONFIRMATION_REQUIRED", "FAILED"],
    CONFLICT: ["UNDERSTANDING_BUSINESS", "FAILED"],
    BLOCKED: ["LOADING_BUSINESS", "FAILED"],
    FAILED: ["INIT"],
  };

  /**
   * Validates if state transition is allowed.
   */
  public canTransition(from: OrchestratorStatus, to: OrchestratorStatus): boolean {
    const allowed = this.allowedTransitions[from] || [];
    return allowed.includes(to);
  }

  /**
   * Transitions session state safely.
   */
  public transition(
    session: CreativeBrainSession,
    targetState: OrchestratorStatus,
    reason: string
  ): CreativeBrainSession {
    if (!this.canTransition(session.currentState, targetState)) {
      throw new Error(
        `Invalid state transition in CreativeBrainStateMachine: Cannot transition from '${session.currentState}' to '${targetState}'.`
      );
    }

    return {
      ...session,
      currentState: targetState,
      stateHistory: [
        ...session.stateHistory,
        {
          from: session.currentState,
          to: targetState,
          reason,
          timestamp: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  }
}
