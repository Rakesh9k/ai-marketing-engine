import type {
  CreativeBrainInput,
  BusinessContext,
  PlatformContext,
  FormatContext,
} from "../types";

import { CreativeBrainOrchestrator } from "../orchestrator/creativeBrainOrchestrator";
import { CreativeBrainStateMachine } from "../orchestrator/creativeBrainStateMachine";
import { CreativeExecutionAdapter } from "../execution/creativeExecutionAdapter";

describe("Phase 10.20 — Creative Brain Strategic Orchestrator", () => {
  let orchestrator: CreativeBrainOrchestrator;
  let mockInput: CreativeBrainInput;

  beforeEach(() => {
    orchestrator = new CreativeBrainOrchestrator();

    const mockBusiness: BusinessContext = {
      businessId: "biz-spa-1",
      name: "Serene Aura Spa",
      industry: "Wellness",
      subIndustry: "Luxury Spa",
      products: [],
      services: [
        {
          id: "srv-massage",
          name: "Aromatherapy Massage",
          verified: true,
          available: true,
          price: { amount: 2500, currency: "INR" },
        },
      ],
      capabilities: {
        booking: true,
        reservation: true,
        purchase: true,
        whatsapp: true,
        phone: true,
        physicalLocation: true,
        delivery: false,
        onlineOrdering: true,
      },
      contactCapabilities: {
        phone: { available: true, verified: true },
        whatsapp: { available: true, verified: true },
        website: { available: true, verified: true },
        bookingUrl: { available: "UNKNOWN", verified: false },
        orderingUrl: { available: "UNKNOWN", verified: false },
        reservationUrl: { available: "UNKNOWN", verified: false },
      },
      verifiedFacts: [
        {
          id: "fact-1",
          statement: "Certified Organic Essential Oils",
          category: "PROOF",
          source: "Audit Report",
          verified: true,
        },
      ],
      restrictions: [],
      status: "ACTIVE",
    };

    const mockPlatform: PlatformContext = {
      platformId: "plat-meta",
      name: "Meta",
      supported: true,
      expressionConstraints: {
        aspectRatios: ["1:1", "9:16"],
        textDensity: "LOW",
        contentDensity: "MEDIUM",
        visualPacing: "MODERATE",
        sourceVersion: 1,
        lastVerified: "2026-10-07T00:00:00Z",
      },
    };

    const mockFormat: FormatContext = {
      formatId: "fmt-feed",
      name: "Feed Post",
      type: "STATIC",
    };

    mockInput = {
      business: mockBusiness,
      audience: {
        description: "Busy urban professionals",
        motivations: ["Stress Relief", "Self Care"],
        barriers: ["Time Constraints", "Trust"],
        desiredOutcomes: ["Rejuvenation"],
        awarenessStage: "SOLUTION_AWARE",
        purchaseIntent: "HIGH",
      },
      situation: {
        id: "sit-weekend-prep",
        name: "Pre-Weekend Stress Relief",
        description: "Seeking relaxation after intense work week",
        motivations: ["Stress Relief"],
        barriers: ["Time Constraints"],
        desiredOutcome: "Relaxation",
        confidence: "VALIDATED",
        evidenceIds: [],
        assumptions: [],
      },
      objective: "CONVERSION",
      platform: mockPlatform,
      format: mockFormat,
      campaignStage: "CONVERSION",
    };
  });

  // Test 1: Complete end-to-end orchestration pipeline
  it("Test 1: should run full orchestration pipeline and produce structured confirmation summary", async () => {
    const result = await orchestrator.orchestrate(mockInput);
    expect(result.status).toBe("CONFIRMATION_REQUIRED");

    if (result.status === "CONFIRMATION_REQUIRED") {
      expect(result.summary.businessName).toBe("Serene Aura Spa");
      expect(result.summary.industry).toBe("Wellness");
      expect(result.summary.whatWeAreNotDoing).toContain("Leading with unverified discount claims");
      expect(result.variantSet.variants.length).toBeGreaterThanOrEqual(2);
    }
  });

  // Test 2: State machine transitions validation
  it("Test 2: should enforce strict allowed state transitions in state machine", () => {
    const stateMachine = new CreativeBrainStateMachine();

    expect(stateMachine.canTransition("INIT", "LOADING_BUSINESS")).toBe(true);
    expect(stateMachine.canTransition("CONFIRMATION_REQUIRED", "CONFIRMED")).toBe(true);
    expect(stateMachine.canTransition("CONFIRMED", "EXECUTION_READY")).toBe(true);

    // Invalid transition check: Cannot jump from INIT directly to EXECUTING
    expect(stateMachine.canTransition("INIT", "EXECUTING")).toBe(false);
  });

  // Test 3: User Confirmation & Execution Boundary Gate
  it("Test 3: should allow execution payload preparation ONLY after explicit user confirmation", async () => {
    const orchestrateResult = await orchestrator.orchestrate(mockInput);
    expect(orchestrateResult.status).toBe("CONFIRMATION_REQUIRED");

    const adapter = new CreativeExecutionAdapter();

    // Verify exception thrown when attempting execution prior to confirmation
    if (orchestrateResult.status === "CONFIRMATION_REQUIRED") {
      expect(() => adapter.prepareExecutionPayload(orchestrateResult.session)).toThrow(
        /Execution forbidden/
      );
    }

    // Now confirm session
    if (orchestrateResult.status === "CONFIRMATION_REQUIRED") {
      const confirmResult = await orchestrator.confirm(orchestrateResult.session, "Looks great!");
      expect(confirmResult.status).toBe("SUCCESS");

      if (confirmResult.status === "SUCCESS") {
        const payload = adapter.prepareExecutionPayload(confirmResult.session);
        expect(payload.direction).toBeDefined();
        expect(payload.business.name).toBe("Serene Aura Spa");
      }
    }
  });

  // Test 4: User Revision invalidates downstream decisions
  it("Test 4: should invalidate downstream decisions when user requests audience revision", async () => {
    const result = await orchestrator.orchestrate(mockInput);
    expect(result.status).toBe("CONFIRMATION_REQUIRED");

    if (result.status === "CONFIRMATION_REQUIRED") {
      const revisedResult = await orchestrator.revise(result.session, {
        type: "CHANGE_AUDIENCE",
        updatedAudience: {
          description: "Bridal Party Grooming Seekers",
          motivations: ["Bridal Glow", "Luxury Experience"],
          barriers: ["Scheduling"],
          desiredOutcomes: ["Flawless look"],
          awarenessStage: "SOLUTION_AWARE",
          purchaseIntent: "HIGH",
        },
        timestamp: new Date().toISOString(),
      });

      expect(revisedResult.status).toBe("CONFIRMATION_REQUIRED");
      if (revisedResult.status === "CONFIRMATION_REQUIRED") {
        expect(revisedResult.summary.targetAudience).toBe("Bridal Party Grooming Seekers");
      }
    }
  });

  // Test 5: Business Context Remains Authoritative
  it("Test 5: should preserve Business Context immutability during user strategy revisions", async () => {
    const result = await orchestrator.orchestrate(mockInput);
    if (result.status === "CONFIRMATION_REQUIRED") {
      const revisedResult = await orchestrator.revise(result.session, {
        type: "CHANGE_OBJECTIVE",
        updatedObjective: "AWARENESS",
        timestamp: new Date().toISOString(),
      });

      if (revisedResult.status === "CONFIRMATION_REQUIRED") {
        expect(revisedResult.session.businessContext.name).toBe("Serene Aura Spa");
        expect(revisedResult.session.businessContext.verifiedFacts.length).toBe(1);
      }
    }
  });
});
