import { CreativeBrainOrchestrator } from "../orchestrator/creativeBrainOrchestrator";
import { StrategicConfirmationStateMachine } from "../confirmation/strategicConfirmationStateMachine";
import { ExecutionAuthorizationService } from "../confirmation/executionAuthorizationService";
import { StrategicRevisionInvalidationService } from "../confirmation/strategicRevisionInvalidationService";
import type {
  BusinessContext,
  CreativeBrainInput,
  CreativeExplorationContext,
} from "../types";

describe("Phase 10.21 — Strategic Confirmation Layer Tests", () => {
  let orchestrator: CreativeBrainOrchestrator;
  let _stateMachine: StrategicConfirmationStateMachine;
  let _authService: ExecutionAuthorizationService;
  let revisionService: StrategicRevisionInvalidationService;

  const mockBusiness: BusinessContext = {
    businessId: "biz-kondapur-biryani",
    name: "Bawarchi Biryani Kondapur",
    industry: "RESTAURANT",
    description: "Authentic Hyderabad dum biryani family dining in Kondapur",
    products: [
      {
        id: "prod-1",
        name: "Family Biryani Combo",
        category: "Biryani",
        verified: true,
        available: true,
      },
    ],
    services: [],
    capabilities: {
      booking: false,
      reservation: true,
      purchase: true,
      whatsapp: true,
      phone: true,
      physicalLocation: true,
      delivery: true,
      onlineOrdering: true,
    },
    contactCapabilities: {
      phone: { available: true, verified: true },
      whatsapp: { available: true, verified: true },
      website: { available: true, verified: true },
      bookingUrl: { available: false, verified: false },
      orderingUrl: { available: true, verified: true },
      reservationUrl: { available: true, verified: true },
    },
    verifiedFacts: [
      {
        id: "fact-1",
        statement: "Authentic hand-pressed dum biryani made daily",
        category: "PRODUCT",
        source: "Kitchen Inspection",
        verified: true,
      },
    ],
    restrictions: [
      {
        id: "rest-1",
        type: "CLAIM",
        rule: "No fake discount claims or artificial scarcity timers",
        severity: "HARD",
        source: "Brand Policy",
      },
    ],
    status: "ACTIVE",
  };

  const sampleInput: CreativeBrainInput = {
    business: mockBusiness,
    objective: "CONVERSION",
    platform: {
      platformId: "plat-meta",
      name: "Meta",
      supported: true,
      expressionConstraints: {
        aspectRatios: ["1:1", "9:16"],
        textDensity: "LOW",
        contentDensity: "MEDIUM",
        visualPacing: "MODERATE",
        sourceVersion: 1,
        lastVerified: new Date().toISOString(),
      },
    },
    format: {
      formatId: "fmt-feed",
      name: "Feed Post",
      type: "POST",
      constraints: [],
    },
    campaignStage: "CONVERSION",
    audience: {
      description: "Families in Kondapur seeking weekend dinner feast options",
      motivations: ["Authentic Hyderabad taste", "Convenient family dining"],
      barriers: ["Long weekend wait times", "Inconsistent quality"],
      desiredOutcomes: ["Delightful family weekend feast"],
      awarenessStage: "SOLUTION_AWARE",
      purchaseIntent: "HIGH",
    },
    situation: {
      id: "sit-weekend-feast",
      name: "Weekend Family Dinner Decision",
      description: "Parents looking for trusted, hassle-free weekend dinner for family",
      motivations: ["Authentic taste"],
      barriers: ["Wait times"],
      desiredOutcome: "Enjoyable family dinner",
      confidence: "VALIDATED",
      evidenceIds: [],
      assumptions: [],
    },
  };

  beforeEach(() => {
    orchestrator = new CreativeBrainOrchestrator();
    _stateMachine = new StrategicConfirmationStateMachine();
    _authService = new ExecutionAuthorizationService();
    revisionService = new StrategicRevisionInvalidationService();
  });

  test("Test 1: Normal confirmation ('That's right') produces valid ExecutionAuthorization", async () => {
    const orchestrateResult = await orchestrator.orchestrate(sampleInput);
    expect(orchestrateResult.status).toBe("CONFIRMATION_REQUIRED");

    const session = orchestrateResult.session;
    const confirmationResult = orchestrator.processStrategicConfirmation(session, "CONFIRM", {
      userNotes: "Strategy looks spot on for Kondapur families!",
    });

    expect(confirmationResult.session.currentState).toBe("CONFIRMED");
    expect(confirmationResult.confirmation.status).toBe("CONFIRMED");
    expect(confirmationResult.authorization).toBeDefined();

    const isAuthValid = orchestrator.verifyExecutionAuthorization(confirmationResult.authorization!);
    expect(isAuthValid).toBe(true);
    expect(confirmationResult.authorization?.sessionId).toBe(session.sessionId);
  });

  test("Test 2: Idempotency of confirmation & exploration requests", async () => {
    const orchestrateResult = await orchestrator.orchestrate(sampleInput);
    const session = orchestrateResult.session;

    const firstConfirm = orchestrator.processStrategicConfirmation(session, "CONFIRM");
    expect(firstConfirm.session.currentState).toBe("CONFIRMED");

    // Second confirmation on already confirmed session
    const secondConfirm = orchestrator.processStrategicConfirmation(firstConfirm.session, "CONFIRM");
    expect(secondConfirm.session.currentState).toBe("CONFIRMED");
    expect(secondConfirm.authorization?.signature).toBe(firstConfirm.authorization?.signature);
  });

  test("Test 3: Stale confirmation invalidation on upstream revision", async () => {
    const orchestrateResult = await orchestrator.orchestrate(sampleInput);
    const session = orchestrateResult.session;

    const confirmedResult = orchestrator.processStrategicConfirmation(session, "CONFIRM");
    expect(confirmedResult.session.currentState).toBe("CONFIRMED");

    // Process upstream revision (change objective)
    const revisedSession = revisionService.processRevisionWithInvalidation(confirmedResult.session, {
      type: "CHANGE_OBJECTIVE",
      updatedObjective: "RETENTION",
      timestamp: new Date().toISOString(),
    });

    expect(revisedSession.currentState).toBe("REVISION_REQUIRED");
    expect(revisedSession.userConfirmation).toBeUndefined();
    expect(revisedSession.creativeDirection).toBeUndefined();
  });

  test("Test 4: Targeted revision invalidation while keeping BusinessContext strictly immutable", async () => {
    const orchestrateResult = await orchestrator.orchestrate(sampleInput);
    const session = orchestrateResult.session;

    const revisedSession = revisionService.processRevisionWithInvalidation(session, {
      type: "CHANGE_AUDIENCE",
      updatedAudience: {
        description: "Late night software engineers looking for quick biryani delivery",
        motivations: ["Speed", "Late night availability"],
        barriers: ["Closed kitchens"],
        desiredOutcomes: ["Quick late night meal"],
        awarenessStage: "SOLUTION_AWARE",
        purchaseIntent: "HIGH",
      },
      timestamp: new Date().toISOString(),
    });

    expect(revisedSession.businessContext).toEqual(mockBusiness); // Immutable check
    expect(revisedSession.audienceContext?.description).toBe("Late night software engineers looking for quick biryani delivery");
    expect(revisedSession.creativeDirection).toBeUndefined(); // Downstream invalidated
  });

  test("Test 5: 'Explore another direction' contextual strategy retrieval", async () => {
    const orchestrateResult = await orchestrator.orchestrate(sampleInput);
    const session = orchestrateResult.session;

    const initialStrategy = session.selectedVariant?.strategy;
    expect(initialStrategy).toBeDefined();

    const exploreResult = orchestrator.exploreAlternativeDirection(session);
    expect(exploreResult.selectedAlternative.strategy).not.toBe(initialStrategy);
    expect(exploreResult.explorationContext.explorationCount).toBe(1);
    expect(exploreResult.remainingExplorations).toBe(4);
  });

  test("Test 6: Exploration deduplication & max 5-attempt limit cap", async () => {
    const orchestrateResult = await orchestrator.orchestrate(sampleInput);
    let session = orchestrateResult.session;
    let context: CreativeExplorationContext | undefined = undefined;

    for (let i = 0; i < 5; i++) {
      const result = orchestrator.exploreAlternativeDirection(session, context);
      session = result.session;
      context = result.explorationContext;
      expect(context.explorationCount).toBe(i + 1);
    }

    expect(context?.explorationCount).toBe(5);

    // 6th attempt should throw error
    expect(() => {
      orchestrator.exploreAlternativeDirection(session, context);
    }).toThrow("Exploration limit reached: Maximum of 5 strategic explorations allowed per campaign session.");
  });

  test("Test 7: Dishonest claim & fake scarcity rejection from confirmation", async () => {
    const orchestrateResult = await orchestrator.orchestrate(sampleInput);
    const session = orchestrateResult.session;

    expect(() => {
      orchestrator.processStrategicConfirmation(session, "CONFIRM", {
        userNotes: "Add a fake countdown timer and fake scarcity claim to boost urgency",
      });
    }).toThrow("Strategic Confirmation rejected: Dishonest claim pattern detected ('fake scarcity').");
  });

  test("Test 8: End-to-end Kondapur weekend family biryani combo restaurant fixture", async () => {
    const orchestrateResult = await orchestrator.orchestrate(sampleInput);
    const session = orchestrateResult.session;

    // 1. Get presentation-safe confirmation summary
    const confirmationSummary = orchestrator.getStrategicConfirmation(session);
    expect(confirmationSummary.summary.businessName).toBe("Bawarchi Biryani Kondapur");
    expect(confirmationSummary.summary.targetAudience).toBe("Families in Kondapur seeking weekend dinner feast options");
    expect(confirmationSummary.recommendedDirection.strategyName).toBeDefined();

    // Verify machine IDs are NOT in recommendedDirection summary
    const rawSummaryJson = JSON.stringify(confirmationSummary.recommendedDirection);
    expect(rawSummaryJson).not.toContain("psych-primary");
    expect(rawSummaryJson).not.toContain("mech-1");

    // 2. User confirms direction
    const processResult = orchestrator.processStrategicConfirmation(session, "CONFIRM", {
      userNotes: "Confirmed for Kondapur weekend biryani combo launch.",
    });

    expect(processResult.session.currentState).toBe("CONFIRMED");
    expect(processResult.authorization).toBeDefined();

    // 3. Confirm execution gate allows launch with authorization
    const isAuthorized = orchestrator.verifyExecutionAuthorization(processResult.authorization!);
    expect(isAuthorized).toBe(true);

    const executionResult = await orchestrator.confirm(processResult.session, "Confirmed");
    expect(executionResult.status).toBe("SUCCESS");
    if (executionResult.status === "SUCCESS") {
      expect(executionResult.direction).toBeDefined();
    }
  });
});
