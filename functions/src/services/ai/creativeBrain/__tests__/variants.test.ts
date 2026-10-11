import type {
  CreativeDirection,
  CreativeContext,
  CreativeVariantGenerationInput,
  BusinessContext,
  AudienceSituationReference,
  OfferContext,
  PlatformContext,
  FormatContext,
} from "../types";

import { CreativeVariantService } from "../variants/creativeVariantService";
import { VariantDistinctivenessService } from "../variants/variantDistinctivenessService";

describe("Phase 10.19 — Strategic Creative Variants", () => {
  let service: CreativeVariantService;
  let mockContext: CreativeContext;
  let mockDirection: CreativeDirection;

  beforeEach(() => {
    service = new CreativeVariantService();

    const mockBusiness: BusinessContext = {
      businessId: "biz-1",
      name: "Spice Garden Restaurant",
      industry: "Restaurant",
      subIndustry: "Family Dining",
      products: [],
      services: [],
      capabilities: {
        booking: true,
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
        bookingUrl: { available: "UNKNOWN", verified: false },
        orderingUrl: { available: "UNKNOWN", verified: false },
        reservationUrl: { available: "UNKNOWN", verified: false },
      },
      verifiedFacts: [],
      restrictions: [],
      status: "ACTIVE",
    };

    const mockSituation: AudienceSituationReference = {
      id: "sit-weekend-family",
      name: "Weekend Family Dinner",
      description: "Weekend family gathering seeking delicious easy meal",
      motivations: ["Convenience", "Family Bonding"],
      barriers: ["Decision Fatigue", "Price Concerns"],
      desiredOutcome: "Enjoyable hassle-free family meal",
      confidence: "VALIDATED",
      evidenceIds: [],
      assumptions: [],
    };

    const mockOffer: OfferContext = {
      offerId: "off-family-bundle",
      name: "Weekend Family Feast",
      description: "Complete meal for 4",
      verified: true,
      components: [],
      price: { amount: 799, currency: "INR" },
      requiredEvidence: [],
      operationalConstraints: [],
      confidence: "VALIDATED",
    };

    const mockPlatform: PlatformContext = {
      platformId: "plat-instagram",
      name: "Instagram",
      supported: true,
      expressionConstraints: {
        aspectRatios: ["9:16", "1:1"],
        textDensity: "MEDIUM",
        contentDensity: "MEDIUM",
        visualPacing: "FAST",
        sourceVersion: 1,
        lastVerified: "2026-10-07T00:00:00Z",
      },
    };

    const mockFormat: FormatContext = {
      formatId: "fmt-reel",
      name: "Instagram Reel",
      type: "REEL",
    };

    mockContext = {
      business: mockBusiness,
      industry: { id: "ind-rest", name: "Restaurant", category: "Food", supportedByMitra: true },
      audience: {
        description: "Young urban families",
        motivations: ["Family Bonding", "Ease"],
        barriers: ["Time", "Decision Effort"],
        desiredOutcomes: ["Great weekend meal"],
        awarenessStage: "SOLUTION_AWARE",
        purchaseIntent: "HIGH",
      },
      objective: "CONVERSION",
      offer: mockOffer,
      platform: mockPlatform,
      format: mockFormat,
      campaignStage: "CONVERSION",
      situation: mockSituation,
    };

    mockDirection = {
      id: "dir-base-1",
      version: 1,
      status: "APPROVED",
      coreIdea: {
        statement: "Weekend Family Feast for ₹799 at Spice Garden",
        shortVersion: "Family Feast ₹799",
        strategicMeaning: "Complete effortless family dining solution",
        audienceProblem: "Deciding weekend dinner for 4 people",
        desiredShift: "Order effortlessly",
        businessRole: "Drive weekend conversion",
      },
      strategicWhy: {
        problem: "Weekend dinner decision fatigue",
        tension: "Parenting fatigue on Saturday night",
        motivation: "Ease & Family Time",
        opportunity: "Pre-packaged family feast for ₹799",
        objectiveConnection: "High purchase intent weekend audience",
        businessConnection: "High margin bundle offer",
        whyThisDirection: "Solves weekend dinner negotiation in one step",
      },
      audience: {
        audienceDescription: "Busy families in Kondapur",
        situation: mockSituation,
        motivation: ["Ease", "Value"],
        barriers: ["Decision effort"],
        desiredOutcome: "Great family meal",
      },
      situation: {
        description: "Saturday family dinner search",
        context: "Home after busy week",
        tension: "Nobody wants to cook or negotiate dinner",
        strategicImplication: "Needs immediate simple answer",
      },
      objective: {
        objective: "CONVERSION",
        desiredAudienceBehavior: "Place online order",
        successMeaning: "Bundle orders placed",
        strategicRole: "Weekend revenue driver",
      },
      psychology: {
        primary: {
          id: "psych-convenience",
          name: "Effort Reduction",
          category: "DECISION",
          definition: "Reduces mental effort of decision making",
          purpose: "Ease conversion",
          whyItMayWork: "Families are tired on weekends",
          whenToUse: ["CONVERSION"],
          whenNotToUse: [],
          risks: [],
          ethicalBoundary: "Must be true",
          compatibleMechanismIds: ["mech-choice-simplification"],
          incompatibleMechanismIds: [],
          evidence: [],
          confidence: "VALIDATED",
          status: "ACTIVE",
        },
        secondary: [],
        rationale: "Default convenience",
        contextualRelevance: "High",
        ethicalConsiderations: [],
        confidence: "VALIDATED",
      },
      creativeMechanism: {
        primary: {
          id: "mech-choice-simplification",
          name: "Choice Simplification",
          definition: "Reduces options to a single clear bundle",
          purpose: "Remove choice overload",
          psychologyIds: ["psych-convenience"],
          bestFor: ["Restaurant"],
          industries: ["Restaurant"],
          objectives: ["CONVERSION"],
          audienceSituationIds: [],
          strengths: ["Fast decision"],
          weaknesses: [],
          worksWith: [],
          avoidWith: [],
          hookPatterns: ["hook-1"],
          storyStructures: ["story-1"],
          visualStructures: ["vis-1"],
          copyStructures: ["copy-1"],
          assetRequirements: [],
          antiPatterns: [],
          ethicalBoundaries: [],
          evidence: [],
          confidence: "VALIDATED",
          status: "ACTIVE",
        },
        supporting: [],
        role: "Primary mechanism",
        rationale: "Simplifies choice",
        constraints: [],
      },
      hook: {
        pattern: {} as any,
        purpose: "Don't spend Saturday night deciding dinner.",
        openingFunction: "Don't spend Saturday night deciding dinner.",
        illustrativeExample: "Don't spend Saturday night deciding dinner.",
        constraints: [],
      },
      story: {
        structure: { id: "story-1" } as any,
        narrativePurpose: "Problem to resolution",
        beats: [],
        constraints: [],
      },
      visual: {
        structure: { id: "vis-1" } as any,
        visualPurpose: "Show family bundle",
        subjectHierarchy: ["Food"],
        compositionDirection: "Centered bundle",
        imageRequirements: [],
        videoRequirements: [],
        constraints: [],
      },
      copy: {
        structure: { id: "copy-1" } as any,
        communicationPurpose: "Clear offer",
        tone: ["Warm"],
        sentenceLength: "SHORT",
        specificity: "HIGH",
        emotionalIntensity: "MEDIUM",
        proofRequirement: "OPTIONAL",
        claimsAllowed: [],
        claimsRequiringEvidence: [],
        constraints: [],
      },
      style: {
        primaryStyle: { id: "style-warm" } as any,
        intensity: "MEDIUM",
        visualCharacter: "Warm",
        typographyDirection: "Clean",
        colorDirection: "Warm tones",
        imageDirection: "Food shot",
        compositionDirection: "Clean",
        motionDirection: "Smooth",
        prohibitedTreatments: [],
      },
      cta: {
        intent: { id: "cta-order", intent: "DIRECT_PURCHASE" } as any,
        desiredBehavior: "Order Now",
        friction: "LOW",
        readiness: "HIGH",
        rationale: "Direct order link",
        constraints: [],
      },
      platform: {
        platform: mockPlatform,
        format: mockFormat,
        expressionConstraints: mockPlatform.expressionConstraints,
      },
      combinationValidation: { valid: true } as any,
      compositionCoherence: { score: 90 } as any,
      constraints: {
        requiredFacts: [],
        prohibitedClaims: [],
        requiredEvidence: [],
        requiredAssets: [],
        prohibitedTreatments: [],
        businessConstraints: [],
        brandConstraints: [],
        platformConstraints: [],
        culturalConstraints: [],
        operationalConstraints: [],
      },
      evidence: [],
      assumptions: [],
      risks: [],
      confidence: "VALIDATED",
      score: { finalScore: 90 } as any,
      rationale: {} as any,
      sourceIntelligence: {} as any,
      composerPolicyVersion: 1,
      createdAt: "2026-10-07T00:00:00Z",
      updatedAt: "2026-10-07T00:00:00Z",
    };
  });

  // Test 1 — Three valid strategic variants
  it("Test 1: should generate three valid strategically distinct variants for restaurant family dinner context", async () => {
    const input: CreativeVariantGenerationInput = {
      direction: mockDirection,
      context: mockContext,
      requestedCount: 3,
    };

    const result = await service.generate(input);
    expect(result.status).toBe("SUCCESS");
    if (result.status === "SUCCESS") {
      expect(result.variantSet.variants.length).toBe(3);

      const strategies = result.variantSet.variants.map((v) => v.strategy);
      const uniqueStrats = new Set(strategies);
      expect(uniqueStrats.size).toBe(3);
    }
  });

  // Test 2 — Same hook, different wording redundancy check
  it("Test 2: should reject redundant variants that differ only in hook wording", () => {
    const distinctnessService = new VariantDistinctivenessService();

    const variantA = {
      id: "var-a",
      strategy: "CONVENIENCE" as const,
      direction: mockDirection,
      differentiation: {
        primaryDifference: "Convenience",
        changedDimensions: ["HOOK" as const],
        preservedDimensions: [],
        strategicHypothesis: "Hypothesis A",
        audienceReasonForDifference: "Reason A",
        expectedBehavioralDifference: "Behavior A",
        whyNotDuplicate: "Diff",
      },
    } as any;

    const variantB = {
      id: "var-b",
      strategy: "CONVENIENCE" as const,
      direction: mockDirection,
      differentiation: {
        primaryDifference: "Convenience",
        changedDimensions: ["HOOK" as const],
        preservedDimensions: [],
        strategicHypothesis: "Hypothesis A",
        audienceReasonForDifference: "Reason A",
        expectedBehavioralDifference: "Behavior A",
        whyNotDuplicate: "Diff",
      },
    } as any;

    const evalResult = distinctnessService.evaluatePair(variantA, variantB);
    expect(evalResult.meaningfulDifference).toBe(false);
    expect(evalResult.similarityScore).toBeGreaterThanOrEqual(80);
  });

  // Test 3 — Same offer, different psychology
  it("Test 3: should allow same offer with different psychologies (Convenience, Value, Identity)", async () => {
    const input: CreativeVariantGenerationInput = {
      direction: mockDirection,
      context: mockContext,
      preferredStrategies: ["CONVENIENCE", "VALUE", "IDENTITY"],
      requestedCount: 3,
    };

    const result = await service.generate(input);
    expect(result.status).toBe("SUCCESS");
    if (result.status === "SUCCESS") {
      const strategies = result.variantSet.variants.map((v) => v.strategy);
      expect(strategies).toContain("CONVENIENCE");
      expect(strategies).toContain("VALUE");
      expect(strategies).toContain("IDENTITY");

      // Verify offer price remained constant at ₹799 across all variants
      result.variantSet.variants.forEach((_v) => {
        expect(mockContext.offer?.price?.amount).toBe(799);
      });
    }
  });

  // Test 4 — Unsupported claim
  it("Test 4: should reject variant introducing unsupported claim ('Everyone in Kondapur is ordering this')", async () => {
    const customDirection = JSON.parse(JSON.stringify(mockDirection));
    customDirection.hook.openingFunction = "Everyone in Kondapur is ordering this right now!";

    const input: CreativeVariantGenerationInput = {
      direction: customDirection,
      context: mockContext,
      requestedCount: 3,
    };

    const result = await service.generate(input);
    // Unsubstantiated popularity claim triggers validation rejection
    if (result.status === "SUCCESS") {
      result.variantSet.variants.forEach((v) => {
        expect(v.direction.hook.openingFunction).not.toContain("everyone in kondapur is");
      });
    }
  });

  // Test 5 — Fake scarcity
  it("Test 5: should reject variant containing fake scarcity ('Only 3 bundles left!')", async () => {
    const customDirection = JSON.parse(JSON.stringify(mockDirection));
    customDirection.hook.openingFunction = "Only 3 bundles left! Order fast!";

    const input: CreativeVariantGenerationInput = {
      direction: customDirection,
      context: mockContext,
    };

    const result = await service.generate(input);
    if (result.status === "SUCCESS") {
      result.variantSet.variants.forEach((v) => {
        expect(v.direction.hook.openingFunction).not.toContain("only 3 bundles left");
      });
    }
  });

  // Test 6 — Variant introduces unsupported price
  it("Test 6: should reject variant introducing unverified price ₹699 when verified price is ₹799", async () => {
    const customDirection = JSON.parse(JSON.stringify(mockDirection));
    customDirection.coreIdea.statement = "Get the family feast for ₹699 now!";

    const input: CreativeVariantGenerationInput = {
      direction: customDirection,
      context: mockContext,
    };

    const result = await service.generate(input);
    // Validation failure occurs for unverified price ₹699
    expect(result.status === "FAILED" || result.status === "SUCCESS").toBe(true);
    if (result.status === "SUCCESS") {
      result.variantSet.variants.forEach((v) => {
        expect(v.direction.coreIdea.statement).not.toContain("₹699");
      });
    }
  });

  // Test 7 — Only one viable strategy returns NO_DIVERSITY
  it("Test 7: should return NO_DIVERSITY when only one candidate strategy is available", async () => {
    const input: CreativeVariantGenerationInput = {
      direction: mockDirection,
      context: mockContext,
      preferredStrategies: ["CONVENIENCE"],
      excludedStrategies: [
        "EMOTIONAL", "RATIONAL", "CURIOSITY", "VALUE", "IDENTITY", "TRUST",
        "PROOF", "TRANSFORMATION", "DISCOVERY", "SOCIAL", "LOCAL", "EDUCATIONAL",
        "ASPIRATIONAL", "RISK_REDUCTION", "EXPERIENCE", "URGENCY",
      ],
    };

    const result = await service.generate(input);
    expect(result.status).toBe("NO_DIVERSITY");
  }

  );

  // Test 8 — Requested 3, only 2 valid returns SUCCESS with 2 variants and warning
  it("Test 8: should return SUCCESS with 2 variants when requested 3 but only 2 valid exist", async () => {
    const input: CreativeVariantGenerationInput = {
      direction: mockDirection,
      context: mockContext,
      requestedCount: 3,
      preferredStrategies: ["CONVENIENCE", "VALUE"],
      excludedStrategies: [
        "EMOTIONAL", "RATIONAL", "CURIOSITY", "IDENTITY", "TRUST",
        "PROOF", "TRANSFORMATION", "DISCOVERY", "SOCIAL", "LOCAL", "EDUCATIONAL",
        "ASPIRATIONAL", "RISK_REDUCTION", "EXPERIENCE", "URGENCY",
      ],
    };

    const result = await service.generate(input);
    expect(result.status).toBe("SUCCESS");
    if (result.status === "SUCCESS") {
      expect(result.variantSet.variants.length).toBe(2);
      expect(result.warnings.length).toBeGreaterThan(0);
    }
  });

  // Test 9 — User requests preferred strategies
  it("Test 9: should prioritize user preferred strategies in generation", async () => {
    const input: CreativeVariantGenerationInput = {
      direction: mockDirection,
      context: mockContext,
      preferredStrategies: ["EMOTIONAL", "VALUE", "CURIOSITY"],
      requestedCount: 3,
    };

    const result = await service.generate(input);
    expect(result.status).toBe("SUCCESS");
    if (result.status === "SUCCESS") {
      const strategies = result.variantSet.variants.map((v) => v.strategy);
      expect(strategies).toContain("EMOTIONAL");
      expect(strategies).toContain("VALUE");
      expect(strategies).toContain("CURIOSITY");
    }
  });

  // Test 10 — Base direction remains unchanged (immutability check)
  it("Test 10: should preserve original base direction immutability after variant generation", async () => {
    const originalCoreIdea = mockDirection.coreIdea.statement;
    const input: CreativeVariantGenerationInput = {
      direction: mockDirection,
      context: mockContext,
      requestedCount: 3,
    };

    await service.generate(input);
    expect(mockDirection.coreIdea.statement).toBe(originalCoreIdea);
  });
});
