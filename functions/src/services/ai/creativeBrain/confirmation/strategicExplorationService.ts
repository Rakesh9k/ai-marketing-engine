import type {
  CreativeBrainSession,
  CreativeExplorationContext,
  CreativeVariant,
} from "../types";

export interface StrategicExplorationResult {
  session: CreativeBrainSession;
  explorationContext: CreativeExplorationContext;
  selectedAlternative: CreativeVariant;
  remainingExplorations: number;
}

export class StrategicExplorationService {
  public static readonly MAX_EXPLORATION_LIMIT = 5;

  /**
   * Explores an alternative strategic direction for the session while enforcing:
   * 1. Strategy deduplication (no repeated strategy types)
   * 2. Hard limit of max 5 explorations per session
   */
  public exploreAlternativeDirection(
    session: CreativeBrainSession,
    explorationContext?: CreativeExplorationContext
  ): StrategicExplorationResult {
    const currentCount = explorationContext?.explorationCount || 0;
    if (currentCount >= StrategicExplorationService.MAX_EXPLORATION_LIMIT) {
      throw new Error(
        `Exploration limit reached: Maximum of ${StrategicExplorationService.MAX_EXPLORATION_LIMIT} strategic explorations allowed per campaign session.`
      );
    }

    const availableVariants = session.variantSet?.variants || [];
    if (availableVariants.length === 0) {
      throw new Error("No variants available in current session to explore alternatives.");
    }

    const exploredDirectionIds = new Set(explorationContext?.exploredDirectionIds || []);
    const exploredStrategyTypes = new Set(explorationContext?.exploredStrategyTypes || []);

    // Include the current selected variant strategy as already explored
    if (session.selectedVariant) {
      exploredDirectionIds.add(session.selectedVariant.id);
      exploredStrategyTypes.add(session.selectedVariant.strategy);
    }

    // Find the first variant whose strategy type has NOT been explored yet
    let candidate = availableVariants.find(
      (v) => !exploredDirectionIds.has(v.id) && !exploredStrategyTypes.has(v.strategy)
    );

    // Fallback: if all candidate variant strategy types in variantSet were explored, find any un-explored variant ID
    if (!candidate) {
      candidate = availableVariants.find((v) => !exploredDirectionIds.has(v.id));
    }

    // Secondary Fallback: pick next variant in sequence cycle
    if (!candidate) {
      candidate = availableVariants[(currentCount + 1) % availableVariants.length];
    }

    const newExplorationCount = currentCount + 1;
    const updatedDirectionIds = Array.from(new Set([...exploredDirectionIds, candidate.id]));
    const updatedStrategyTypes = Array.from(new Set([...exploredStrategyTypes, candidate.strategy]));

    const updatedContext: CreativeExplorationContext = {
      sessionId: session.sessionId,
      exploredDirectionIds: updatedDirectionIds,
      exploredStrategyTypes: updatedStrategyTypes,
      explorationCount: newExplorationCount,
      lastExploredAt: new Date().toISOString(),
    };

    const updatedSession: CreativeBrainSession = {
      ...session,
      selectedVariant: candidate,
      currentState: "ALTERNATIVE_DIRECTION_READY",
      stateHistory: [
        ...session.stateHistory,
        {
          from: session.currentState,
          to: "ALTERNATIVE_DIRECTION_READY",
          reason: `Explored alternative strategy: ${candidate.strategy} (exploration ${newExplorationCount}/${StrategicExplorationService.MAX_EXPLORATION_LIMIT})`,
          timestamp: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    return {
      session: updatedSession,
      explorationContext: updatedContext,
      selectedAlternative: candidate,
      remainingExplorations: StrategicExplorationService.MAX_EXPLORATION_LIMIT - newExplorationCount,
    };
  }

  /**
   * Applies "USE_ALTERNATIVE" decision:
   * Sets the chosen alternative as current direction and transitions workflow state to CONFIRMATION_REQUIRED.
   * Enforces Human Agency Invariant: Selecting an alternative DOES NOT automatically confirm it.
   * The user must explicitly view the new direction and confirm it.
   */
  public selectAlternativeDirection(
    session: CreativeBrainSession,
    alternativeVariantId: string
  ): CreativeBrainSession {
    const variants = session.variantSet?.variants || [];
    const selectedVariant = variants.find((v) => v.id === alternativeVariantId) || session.selectedVariant;

    if (!selectedVariant) {
      throw new Error(`Alternative variant '${alternativeVariantId}' not found in current session.`);
    }

    return {
      ...session,
      selectedVariant,
      currentState: "CONFIRMATION_REQUIRED",
      stateHistory: [
        ...session.stateHistory,
        {
          from: session.currentState,
          to: "CONFIRMATION_REQUIRED",
          reason: `Selected alternative direction '${selectedVariant.strategy}'. Confirmation required.`,
          timestamp: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  }
}
