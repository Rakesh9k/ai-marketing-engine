import {
  StrategicConfirmationState,
  type StrategyState,
  type ConfirmationExecutionState,
  type ConfirmationEvent,
  type ConfirmationTransitionContext,
  type InvalidConfirmationTransition,
  type ConfirmationStateTransition,
  type StrategicConfirmation,
} from "../types";

export class InvalidConfirmationTransitionError extends Error {
  public payload: InvalidConfirmationTransition;

  constructor(payload: InvalidConfirmationTransition) {
    super(`Invalid Confirmation Transition: Cannot transition from '${payload.currentState}' via event '${payload.requestedEvent}'. Reason: ${payload.reason}`);
    this.name = "InvalidConfirmationTransitionError";
    this.payload = payload;
  }
}

export class StrategicConfirmationStateMachine {
  private transitionAuditLog: ConfirmationStateTransition[] = [];

  /**
   * Transition Matrix mapping (CurrentState + EventType) -> NextState
   */
  private transitionMatrix: Record<
    StrategicConfirmationState,
    Partial<Record<ConfirmationEvent["type"], (event: ConfirmationEvent, context: ConfirmationTransitionContext) => StrategicConfirmationState>>
  > = {
    [StrategicConfirmationState.NOT_CREATED]: {
      BUILD: () => StrategicConfirmationState.BUILDING,
      UPSTREAM_CHANGED: () => StrategicConfirmationState.STALE,
    },
    [StrategicConfirmationState.BUILDING]: {
      BUILD_SUCCEEDED: () => StrategicConfirmationState.REQUIRED,
      BUILD_FAILED: (e) => {
        const failEvent = e as Extract<ConfirmationEvent, { type: "BUILD_FAILED" }>;
        return failEvent.failure.code === "UNRECOVERABLE"
          ? StrategicConfirmationState.REJECTED
          : StrategicConfirmationState.NOT_CREATED;
      },
      UPSTREAM_CHANGED: () => StrategicConfirmationState.STALE,
    },
    [StrategicConfirmationState.REQUIRED]: {
      CONFIRM: () => StrategicConfirmationState.CONFIRMING,
      REQUEST_CHANGE: () => StrategicConfirmationState.REVISION_REQUIRED,
      START_EXPLORATION: () => StrategicConfirmationState.EXPLORING,
      UPSTREAM_CHANGED: () => StrategicConfirmationState.STALE,
      EXPIRE: () => StrategicConfirmationState.EXPIRED,
    },
    [StrategicConfirmationState.CONFIRMING]: {
      CONFIRM_SUCCEEDED: () => StrategicConfirmationState.CONFIRMED,
      CONFIRM_FAILED: () => StrategicConfirmationState.REQUIRED,
      UPSTREAM_CHANGED: () => StrategicConfirmationState.STALE,
    },
    [StrategicConfirmationState.CONFIRMED]: {
      UPSTREAM_CHANGED: () => StrategicConfirmationState.STALE,
      EXPIRE: () => StrategicConfirmationState.EXPIRED,
    },
    [StrategicConfirmationState.REVISION_REQUIRED]: {
      BUILD: () => StrategicConfirmationState.BUILDING,
      UPSTREAM_CHANGED: () => StrategicConfirmationState.STALE,
    },
    [StrategicConfirmationState.EXPLORING]: {
      ALTERNATIVE_FOUND: () => StrategicConfirmationState.ALTERNATIVE_READY,
      NO_ALTERNATIVE_FOUND: () => StrategicConfirmationState.REQUIRED,
      EXPLORATION_FAILED: () => StrategicConfirmationState.REQUIRED,
      UPSTREAM_CHANGED: () => StrategicConfirmationState.STALE,
    },
    [StrategicConfirmationState.ALTERNATIVE_READY]: {
      USE_ALTERNATIVE: () => StrategicConfirmationState.REQUIRED, // Preserves Human Agency
      START_EXPLORATION: () => StrategicConfirmationState.EXPLORING,
      GO_BACK: () => StrategicConfirmationState.REQUIRED,
      UPSTREAM_CHANGED: () => StrategicConfirmationState.STALE,
      EXPIRE: () => StrategicConfirmationState.EXPIRED,
    },
    [StrategicConfirmationState.STALE]: {
      BUILD: () => StrategicConfirmationState.BUILDING,
    },
    [StrategicConfirmationState.EXPIRED]: {
      BUILD: () => StrategicConfirmationState.BUILDING,
    },
    [StrategicConfirmationState.REJECTED]: {
      BUILD: () => StrategicConfirmationState.BUILDING,
    },
  };

  /**
   * Executes a state transition safely enforcing all 10 domain invariants.
   */
  public transition(
    confirmation: StrategicConfirmation,
    context: ConfirmationTransitionContext
  ): { confirmation: StrategicConfirmation; transition: ConfirmationStateTransition } {
    // Invariant 7: Revision check — A different revision invalidates current confirmation
    if (context.revision !== confirmation.revision) {
      const staleConfirmation: StrategicConfirmation = {
        ...confirmation,
        state: StrategicConfirmationState.STALE,
        status: StrategicConfirmationState.STALE,
        strategyState: "STALE",
        updatedAt: new Date().toISOString(),
      };
      const staleTransition: ConfirmationStateTransition = {
        transitionId: `tr_${Date.now()}`,
        confirmationId: confirmation.confirmationId,
        sessionId: confirmation.sessionId,
        revision: context.revision,
        from: confirmation.state,
        event: "UPSTREAM_CHANGED",
        to: StrategicConfirmationState.STALE,
        actor: context.actor,
        operationId: context.idempotencyKey,
        createdAt: new Date().toISOString(),
      };
      this.transitionAuditLog.push(staleTransition);
      return { confirmation: staleConfirmation, transition: staleTransition };
    }

    const currentState = confirmation.state;
    const allowedMap = this.transitionMatrix[currentState];
    const transitionFn = allowedMap ? allowedMap[context.event.type] : undefined;

    if (!transitionFn) {
      const invalidError: InvalidConfirmationTransition = {
        code: "INVALID_CONFIRMATION_TRANSITION",
        currentState,
        requestedEvent: context.event.type,
        reason: `Event '${context.event.type}' is illegal from state '${currentState}'.`,
        recoverable: true,
        recoveryAction: "Return user to current valid confirmation state",
      };
      throw new InvalidConfirmationTransitionError(invalidError);
    }

    const nextState = transitionFn(context.event, context);

    // Invariant 4 & Invariant 2 Protection checks:
    if (currentState === StrategicConfirmationState.ALTERNATIVE_READY && context.event.type === "CONFIRM") {
      throw new InvalidConfirmationTransitionError({
        code: "INVALID_CONFIRMATION_TRANSITION",
        currentState,
        requestedEvent: "CONFIRM",
        reason: "ALTERNATIVE_READY cannot directly become CONFIRMED. Must select USE_ALTERNATIVE first.",
        recoverable: true,
        recoveryAction: "Select alternative direction to return to REQUIRED state before confirmation.",
      });
    }

    // Invariant 5 & 6 Protection checks:
    if ((currentState === StrategicConfirmationState.STALE || currentState === StrategicConfirmationState.EXPIRED) && context.event.type === "CONFIRM") {
      throw new InvalidConfirmationTransitionError({
        code: "INVALID_CONFIRMATION_TRANSITION",
        currentState,
        requestedEvent: "CONFIRM",
        reason: `Cannot execute or confirm a confirmation in '${currentState}' state.`,
        recoverable: false,
        recoveryAction: "Recompose strategy to create new confirmation.",
      });
    }

    let strategyState: StrategyState = confirmation.strategyState || "READY";
    let executionState: ConfirmationExecutionState = confirmation.executionState || "NOT_AUTHORIZED";

    if (nextState === StrategicConfirmationState.CONFIRMED) {
      executionState = "AUTHORIZED";
    } else if (nextState === StrategicConfirmationState.STALE) {
      strategyState = "STALE";
    }

    const updatedConfirmation: StrategicConfirmation = {
      ...confirmation,
      state: nextState,
      status: nextState,
      strategyState,
      executionState,
      updatedAt: new Date().toISOString(),
    };

    const transitionRecord: ConfirmationStateTransition = {
      transitionId: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      confirmationId: confirmation.confirmationId,
      sessionId: confirmation.sessionId,
      revision: confirmation.revision,
      from: currentState,
      event: context.event.type,
      to: nextState,
      actor: context.actor,
      operationId: context.idempotencyKey,
      createdAt: new Date().toISOString(),
    };

    this.transitionAuditLog.push(transitionRecord);

    return {
      confirmation: updatedConfirmation,
      transition: transitionRecord,
    };
  }

  public getAuditLog(): ConfirmationStateTransition[] {
    return [...this.transitionAuditLog];
  }
}
