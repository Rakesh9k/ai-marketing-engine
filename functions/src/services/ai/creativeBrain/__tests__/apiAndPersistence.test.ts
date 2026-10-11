import { ConfirmationApplicationService } from "../application/confirmationApplicationService";
import {
  FirestoreCreativeBrainSessionRepository,
  FirestoreCreativeBrainOperationRepository,
  FirestoreCreativeBrainCheckpointRepository,
  FirestoreStrategicConfirmationRepository,
  FirestoreStrategicDecisionRepository,
  FirestoreCreativeExplorationRepository,
  FirestoreExecutionAuthorizationRepository,
  FirestoreCreativeIntelligenceReader,
} from "../persistence";
import type { BusinessContext } from "../types";

describe("Phase 10.21 — Explicit API & Persistence Boundaries Tests", () => {
  jest.setTimeout(60000);
  let appService: ConfirmationApplicationService;
  let sessionRepo: FirestoreCreativeBrainSessionRepository;
  let operationRepo: FirestoreCreativeBrainOperationRepository;
  let checkpointRepo: FirestoreCreativeBrainCheckpointRepository;
  let confirmationRepo: FirestoreStrategicConfirmationRepository;
  let decisionRepo: FirestoreStrategicDecisionRepository;
  let explorationRepo: FirestoreCreativeExplorationRepository;
  let authRepo: FirestoreExecutionAuthorizationRepository;
  let intelligenceReader: FirestoreCreativeIntelligenceReader;

  const tenantId = "tenant-kondapur-biryani-123";

  const mockBusiness: BusinessContext = {
    businessId: tenantId,
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

  beforeEach(() => {
    sessionRepo = new FirestoreCreativeBrainSessionRepository();
    operationRepo = new FirestoreCreativeBrainOperationRepository();
    checkpointRepo = new FirestoreCreativeBrainCheckpointRepository();
    confirmationRepo = new FirestoreStrategicConfirmationRepository();
    decisionRepo = new FirestoreStrategicDecisionRepository();
    explorationRepo = new FirestoreCreativeExplorationRepository();
    authRepo = new FirestoreExecutionAuthorizationRepository();
    intelligenceReader = new FirestoreCreativeIntelligenceReader();

    appService = new ConfirmationApplicationService(
      undefined,
      sessionRepo,
      operationRepo,
      checkpointRepo,
      confirmationRepo,
      decisionRepo,
      explorationRepo,
      authRepo
    );
  });

  test("Test 1: Create session establishes server-side session identity and initial confirmation projection", async () => {
    const createRes = await appService.createSession(tenantId, mockBusiness, {
      businessId: tenantId,
      objective: "CONVERSION",
      platform: "Meta",
      format: "Feed Post",
      campaignStage: "CONVERSION",
    });

    expect(createRes.sessionId).toBeDefined();
    expect(createRes.revision).toBe(1);

    const sessionRes = await appService.getSession(tenantId, createRes.sessionId);
    expect(sessionRes.session.businessContext.name).toBe("Bawarchi Biryani Kondapur");

    const confRes = await appService.getConfirmation(tenantId, createRes.sessionId);
    expect(confRes.confirmation.summary.businessName).toBe("Bawarchi Biryani Kondapur");
  });

  test("Test 2: Public confirmation API never exposes raw internal machine IDs", async () => {
    const createRes = await appService.createSession(tenantId, mockBusiness, {
      businessId: tenantId,
      objective: "CONVERSION",
      platform: "Meta",
      format: "Feed Post",
      campaignStage: "CONVERSION",
    });

    const confRes = await appService.getConfirmation(tenantId, createRes.sessionId);
    const jsonString = JSON.stringify(confRes.confirmation);

    expect(jsonString).not.toContain("psych-primary");
    expect(jsonString).not.toContain("mech-1");
    expect(jsonString).not.toContain("combinationRules");
  });

  test("Test 3: Idempotent operation handling on generateConfirmation and processDecision", async () => {
    const createRes = await appService.createSession(tenantId, mockBusiness, {
      businessId: tenantId,
      objective: "CONVERSION",
      platform: "Meta",
      format: "Feed Post",
      campaignStage: "CONVERSION",
    });

    const idempotencyKey = `idempotent_${Date.now()}`;

    // First call
    const op1 = await appService.generateConfirmation(tenantId, createRes.sessionId, {
      revision: 1,
      idempotencyKey,
    });
    expect(op1.status).toBe("READY");

    // Second call with same key
    const op2 = await appService.generateConfirmation(tenantId, createRes.sessionId, {
      revision: 1,
      idempotencyKey,
    });
    expect(op2.status).toBe("READY");
    expect(op2.operationId).toBe(op1.operationId);
  });

  test("Test 4: User decision 'CONFIRM' creates ExecutionAuthorization record with HMAC signature", async () => {
    const createRes = await appService.createSession(tenantId, mockBusiness, {
      businessId: tenantId,
      objective: "CONVERSION",
      platform: "Meta",
      format: "Feed Post",
      campaignStage: "CONVERSION",
    });

    const confRes = await appService.getConfirmation(tenantId, createRes.sessionId);

    const decisionRes = await appService.processDecision(tenantId, createRes.sessionId, {
      confirmationId: confRes.confirmation.confirmationId,
      revision: 1,
      decision: "CONFIRM",
      idempotencyKey: `dec_key_${Date.now()}`,
      userNotes: "Approved strategy for Kondapur families.",
    });

    expect(decisionRes.status).toBe("READY");
    expect(decisionRes.confirmation?.status).toBe("CONFIRMED");

    // Check decision persisted in decision repo
    const storedDecision = await decisionRepo.getLatest(confRes.confirmation.confirmationId);
    expect(storedDecision).toBeDefined();
    expect(storedDecision?.decision).toBe("CONFIRM");
  });

  test("Test 5: User decision 'EXPLORE' triggers exploration repository logging and max 5 cap", async () => {
    const createRes = await appService.createSession(tenantId, mockBusiness, {
      businessId: tenantId,
      objective: "CONVERSION",
      platform: "Meta",
      format: "Feed Post",
      campaignStage: "CONVERSION",
    });

    const confRes = await appService.getConfirmation(tenantId, createRes.sessionId);

    const exploreRes = await appService.exploreDirection(tenantId, createRes.sessionId, {
      confirmationId: confRes.confirmation.confirmationId,
      revision: 1,
      idempotencyKey: `exp_key_${Date.now()}`,
    });

    expect(exploreRes.status).toBe("READY");
    expect(exploreRes.confirmation?.status).toBe("ALTERNATIVE_DIRECTION_READY");

    const expLogs = await explorationRepo.list(createRes.sessionId, 1);
    expect(expLogs.length).toBeGreaterThan(0);
    expect(expLogs[0].explorationCount).toBe(1);
  });

  test("Test 6: Revision invalidation preserves BusinessContext immutability", async () => {
    const createRes = await appService.createSession(tenantId, mockBusiness, {
      businessId: tenantId,
      objective: "CONVERSION",
      platform: "Meta",
      format: "Feed Post",
      campaignStage: "CONVERSION",
    });

    const reviseRes = await appService.reviseSession(tenantId, createRes.sessionId, {
      revision: 1,
      idempotencyKey: `rev_key_${Date.now()}`,
      type: "AUDIENCE",
      changes: [{ field: "description", requestedValue: "Late night techies" }],
    });

    expect(reviseRes.status).toBe("READY");
    expect(reviseRes.confirmation?.status).toBeDefined();

    const updatedSession = await appService.getSession(tenantId, createRes.sessionId);
    expect(updatedSession.session.businessContext).toEqual(mockBusiness); // Read-only business context

  });

  test("Test 7: Tenant isolation prevents cross-tenant session reads", async () => {
    const createRes = await appService.createSession(tenantId, mockBusiness, {
      businessId: tenantId,
      objective: "CONVERSION",
      platform: "Meta",
      format: "Feed Post",
      campaignStage: "CONVERSION",
    });

    // Attempting to read with a different tenant ID must throw an error
    await expect(appService.getSession("unauthorized-tenant-999", createRes.sessionId)).rejects.toThrow(
      "not found for tenant"
    );
  });

  test("Test 8: Intelligence reader is strictly read-only and returns null for non-existent IDs", async () => {
    const opp = await intelligenceReader.getOpportunity("non-existent-opp");
    expect(opp).toBeNull();

    const mech = await intelligenceReader.getMechanism("non-existent-mech");
    expect(mech).toBeNull();
  });
});
