import {
  StrategicConfirmationStateMachine,
  InvalidConfirmationTransitionError,
} from "../confirmation/strategicConfirmationStateMachine";
import { StrategicConfirmationState, type StrategicConfirmation } from "../types";

describe("Phase 10.21 — Exact Confirmation State Machine & Invariants Tests", () => {
  let stateMachine: StrategicConfirmationStateMachine;

  const mockConfirmation: StrategicConfirmation = {
    confirmationId: "conf_test_100",
    sessionId: "sess_test_100",
    revision: 1,
    strategyRevision: 1,
    state: StrategicConfirmationState.REQUIRED,
    status: StrategicConfirmationState.REQUIRED,
    strategyState: "READY",
    executionState: "NOT_AUTHORIZED",
    summary: {
      businessName: "Bawarchi Biryani",
      industry: "RESTAURANT",
      productOrService: "Dum Biryani",
      targetAudience: "Families in Kondapur",
      situation: "Weekend Dinner Decision",
      marketingObjective: "CONVERSION",
    },
    opportunity: {
      opportunityTitle: "Weekend Family Feast",
      whyNow: "High Friday evening intent",
      coreInsight: "Families want authentic quality without wait friction",
    },
    recommendedDirection: {
      directionId: "dir_1",
      variantId: "var_1",
      strategyType: "CONVENIENCE",
      strategyName: "Convenience",
      strategicPremise: "Hassle-free authentic weekend dinner",
      targetDesireOrFear: "Desire for quality family time",
      creativeHookConcept: "Direct feast hook",
      coreMechanismConcept: "Fast delivery",
      callToActionConcept: "Order Now",
      whyThisWorks: ["Lowers friction"],
      whatWeAreDoing: ["Emphasizing ease"],
      whatWeAreNotDoing: ["No fake discounts"],
    },
    alternatives: [
      {
        alternativeId: "var_2",
        strategyType: "VALUE",
        strategyName: "Value",
        strategicAngle: "Family bundle value",
        whyExploreThis: "Pivots focus to value",
        keyDifferenceFromRecommended: "Shifts focus from speed to value",
      },
    ],
    explanation: {
      whyThisAudience: "High intent",
      whyThisSituation: "Weekend decision",
      whyThisOpportunity: "Solve wait pain point",
      whyThisStrategy: "Lowest friction",
      tradeoffs: ["Focuses on convenience over broad branding"],
    },
    confidence: "VALIDATED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    stateMachine = new StrategicConfirmationStateMachine();
  });

  test("Invariant 1: Only REQUIRED can accept CONFIRM, REQUEST_CHANGE, START_EXPLORATION", () => {
    const confirmRes = stateMachine.transition(mockConfirmation, {
      sessionId: mockConfirmation.sessionId,
      revision: 1,
      actor: "USER",
      event: { type: "CONFIRM" },
      expectedState: StrategicConfirmationState.REQUIRED,
    });
    expect(confirmRes.confirmation.state).toBe(StrategicConfirmationState.CONFIRMING);

    const changeRes = stateMachine.transition(mockConfirmation, {
      sessionId: mockConfirmation.sessionId,
      revision: 1,
      actor: "USER",
      event: { type: "REQUEST_CHANGE", revisionType: "AUDIENCE" },
      expectedState: StrategicConfirmationState.REQUIRED,
    });
    expect(changeRes.confirmation.state).toBe(StrategicConfirmationState.REVISION_REQUIRED);

    const exploreRes = stateMachine.transition(mockConfirmation, {
      sessionId: mockConfirmation.sessionId,
      revision: 1,
      actor: "USER",
      event: { type: "START_EXPLORATION" },
      expectedState: StrategicConfirmationState.REQUIRED,
    });
    expect(exploreRes.confirmation.state).toBe(StrategicConfirmationState.EXPLORING);
  });

  test("Invariant 2: Only CONFIRMING can transition to CONFIRMED", () => {
    const confirmingConf: StrategicConfirmation = {
      ...mockConfirmation,
      state: StrategicConfirmationState.CONFIRMING,
      status: StrategicConfirmationState.CONFIRMING,
    };

    const result = stateMachine.transition(confirmingConf, {
      sessionId: mockConfirmation.sessionId,
      revision: 1,
      actor: "SYSTEM",
      event: { type: "CONFIRM_SUCCEEDED" },
      expectedState: StrategicConfirmationState.CONFIRMING,
    });

    expect(result.confirmation.state).toBe(StrategicConfirmationState.CONFIRMED);
    expect(result.confirmation.executionState).toBe("AUTHORIZED");
  });

  test("Invariant 3: Only EXPLORING can transition to ALTERNATIVE_READY", () => {
    const exploringConf: StrategicConfirmation = {
      ...mockConfirmation,
      state: StrategicConfirmationState.EXPLORING,
      status: StrategicConfirmationState.EXPLORING,
    };

    const result = stateMachine.transition(exploringConf, {
      sessionId: mockConfirmation.sessionId,
      revision: 1,
      actor: "SYSTEM",
      event: { type: "ALTERNATIVE_FOUND", directionId: "dir_2", strategyType: "VALUE" },
      expectedState: StrategicConfirmationState.EXPLORING,
    });

    expect(result.confirmation.state).toBe(StrategicConfirmationState.ALTERNATIVE_READY);
  });

  test("Invariant 4: ALTERNATIVE_READY cannot directly become CONFIRMED (Human Agency Invariant)", () => {
    const altReadyConf: StrategicConfirmation = {
      ...mockConfirmation,
      state: StrategicConfirmationState.ALTERNATIVE_READY,
      status: StrategicConfirmationState.ALTERNATIVE_READY,
    };

    expect(() => {
      stateMachine.transition(altReadyConf, {
        sessionId: mockConfirmation.sessionId,
        revision: 1,
        actor: "USER",
        event: { type: "CONFIRM" },
        expectedState: StrategicConfirmationState.ALTERNATIVE_READY,
      });
    }).toThrow(InvalidConfirmationTransitionError);
  });

  test("Invariant 4b: USE_ALTERNATIVE on ALTERNATIVE_READY returns to REQUIRED for explicit confirmation", () => {
    const altReadyConf: StrategicConfirmation = {
      ...mockConfirmation,
      state: StrategicConfirmationState.ALTERNATIVE_READY,
      status: StrategicConfirmationState.ALTERNATIVE_READY,
    };

    const result = stateMachine.transition(altReadyConf, {
      sessionId: mockConfirmation.sessionId,
      revision: 1,
      actor: "USER",
      event: { type: "USE_ALTERNATIVE", directionId: "dir_2" },
      expectedState: StrategicConfirmationState.ALTERNATIVE_READY,
    });

    expect(result.confirmation.state).toBe(StrategicConfirmationState.REQUIRED);
  });

  test("Invariant 5 & 6: STALE and EXPIRED confirmations can never confirm directly", () => {
    const staleConf: StrategicConfirmation = {
      ...mockConfirmation,
      state: StrategicConfirmationState.STALE,
      status: StrategicConfirmationState.STALE,
      strategyState: "STALE",
    };

    expect(() => {
      stateMachine.transition(staleConf, {
        sessionId: mockConfirmation.sessionId,
        revision: 1,
        actor: "USER",
        event: { type: "CONFIRM" },
        expectedState: StrategicConfirmationState.STALE,
      });
    }).toThrow(InvalidConfirmationTransitionError);

    const expiredConf: StrategicConfirmation = {
      ...mockConfirmation,
      state: StrategicConfirmationState.EXPIRED,
      status: StrategicConfirmationState.EXPIRED,
    };

    expect(() => {
      stateMachine.transition(expiredConf, {
        sessionId: mockConfirmation.sessionId,
        revision: 1,
        actor: "USER",
        event: { type: "CONFIRM" },
        expectedState: StrategicConfirmationState.EXPIRED,
      });
    }).toThrow(InvalidConfirmationTransitionError);
  });

  test("Invariant 7: Revision mismatch immediately sets confirmation to STALE", () => {
    const result = stateMachine.transition(mockConfirmation, {
      sessionId: mockConfirmation.sessionId,
      revision: 2, // Mismatch (confirmation is revision 1)
      actor: "SYSTEM",
      event: { type: "CONFIRM" },
      expectedState: StrategicConfirmationState.REQUIRED,
    });

    expect(result.confirmation.state).toBe(StrategicConfirmationState.STALE);
    expect(result.confirmation.strategyState).toBe("STALE");
  });

  test("Transition audit logging creates traceable historical record", () => {
    stateMachine.transition(mockConfirmation, {
      sessionId: mockConfirmation.sessionId,
      revision: 1,
      actor: "USER",
      event: { type: "CONFIRM" },
      expectedState: StrategicConfirmationState.REQUIRED,
    });

    const logs = stateMachine.getAuditLog();
    expect(logs.length).toBe(1);
    expect(logs[0].from).toBe(StrategicConfirmationState.REQUIRED);
    expect(logs[0].to).toBe(StrategicConfirmationState.CONFIRMING);
    expect(logs[0].actor).toBe("USER");
  });
});
