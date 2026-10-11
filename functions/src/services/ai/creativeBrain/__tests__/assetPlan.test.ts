import { CreativeBrainOrchestrator } from "../orchestrator/creativeBrainOrchestrator";
import { CreativeAssetPlanService } from "../assetPlan/creativeAssetPlanService";
import { AssetGenerationPromptBuilder } from "../assetPlan/assetGenerationPromptBuilder";
import { CreativeAssetValidator } from "../assetPlan/creativeAssetValidator";
import {
  AssetPlanStatus,
  AssetRequirementType,
  AssetRole,
  AssetGenerationMethod,
} from "../types/assetPlan";
import type { BusinessContext } from "../types";

describe("Phase 10.22 — Connect Creative Bank to Asset Generation Tests", () => {
  let orchestrator: CreativeBrainOrchestrator;
  let planService: CreativeAssetPlanService;
  let promptBuilder: AssetGenerationPromptBuilder;
  let validator: CreativeAssetValidator;

  const mockBusiness: BusinessContext = {
    businessId: "biz-kondapur-biryani-1022",
    name: "Bawarchi Biryani Kondapur",
    industry: "RESTAURANT",
    description: "Authentic Hyderabad dum biryani family dining in Kondapur",
    products: [
      {
        id: "prod-combo-1",
        name: "Family Biryani Combo",
        category: "Biryani",
        verified: true,
        available: true,
      },
    ],
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
    verifiedFacts: [
      {
        id: "fact-1",
        statement: "Fresh authentic Dum Biryani cooked daily",
        category: "PROOF",
        source: "Verification Audit",
        verified: true,
      },
    ],
    restrictions: [],
    status: "ACTIVE",
  };

  const sampleInput = {
    business: mockBusiness,
    objective: "CONVERSION" as const,
    platform: {
      platformId: "plt-ig",
      name: "Instagram",
      supported: true,
      expressionConstraints: {
        aspectRatios: ["1:1", "9:16"],
        textDensity: "LOW" as const,
        contentDensity: "MEDIUM" as const,
        visualPacing: "MODERATE" as const,
        sourceVersion: 1,
        lastVerified: new Date().toISOString(),
      },
    },
    format: {
      formatId: "fmt-post",
      name: "Feed Post",
      type: "POST" as const,
      constraints: [],
    },
    campaignStage: "CONVERSION" as const,
  };

  beforeEach(() => {
    orchestrator = new CreativeBrainOrchestrator();
    planService = new CreativeAssetPlanService();
    promptBuilder = new AssetGenerationPromptBuilder();
    validator = new CreativeAssetValidator();
  });

  test("Test 1: Strategy-lock requirement — Asset generation forbidden before confirmation", async () => {
    const orchestrateResult = await orchestrator.orchestrate(sampleInput);
    const unconfirmedSession = orchestrateResult.session;

    expect(unconfirmedSession.currentState).toBe("CONFIRMATION_REQUIRED");

    expect(() => {
      orchestrator.generateAssetPlan(unconfirmedSession);
    }).toThrow("Strategy Lock violation: Asset plan generation forbidden while session is in state 'CONFIRMATION_REQUIRED'");
  });

  test("Test 2: Deterministic Asset Plan creation after confirmation", async () => {
    const orchestrateResult = await orchestrator.orchestrate(sampleInput);
    let session = orchestrateResult.session;

    const confirmRes = orchestrator.processStrategicConfirmation(session, "CONFIRM");
    session = confirmRes.session;

    expect(session.currentState).toBe("CONFIRMED");

    const assetPlan = orchestrator.generateAssetPlan(session, confirmRes.authorization);

    expect(assetPlan).toBeDefined();
    expect(assetPlan.assetPlanId).toContain("plan_");
    expect(assetPlan.status).toBe(AssetPlanStatus.EXECUTION_AUTHORIZED);
    expect(assetPlan.creativeIntent.coreIdea).toBeDefined();
    expect(assetPlan.requirements.length).toBeGreaterThanOrEqual(3);
    expect(assetPlan.copyPlan.headline).toBeDefined();
    expect(assetPlan.compositionPlan.canvas).toBeDefined();
    expect(assetPlan.visualPlan.colorPalette).toBeDefined();
  });

  test("Test 3: Verified Business Assets priority (reuses verified product asset)", async () => {
    const orchestrateResult = await orchestrator.orchestrate(sampleInput);
    const confirmRes = orchestrator.processStrategicConfirmation(orchestrationResultToConfirmedSession(orchestrateResult), "CONFIRM");
    const assetPlan = orchestrator.generateAssetPlan(confirmRes.session, confirmRes.authorization);

    const logoReq = assetPlan.requirements.find((r) => r.type === AssetRequirementType.LOGO);
    expect(logoReq).toBeDefined();
    expect(logoReq?.generationMethod).toBe(AssetGenerationMethod.EXISTING_BUSINESS_ASSET);
    expect(logoReq?.sourceRequirements?.sourceType).toBe("VERIFIED_BUSINESS_ASSET");

    const heroReq = assetPlan.requirements.find((r) => r.type === AssetRequirementType.HERO_IMAGE);
    expect(heroReq).toBeDefined();
    expect(heroReq?.generationMethod).toBe(AssetGenerationMethod.EXISTING_BUSINESS_ASSET);
    expect(heroReq?.sourceRequirements?.authenticityRequired).toBe(true);
  });

  test("Test 4: Structured Prompt Generation without strategy re-interpretation", async () => {
    const orchestrateResult = await orchestrator.orchestrate(sampleInput);
    const confirmRes = orchestrator.processStrategicConfirmation(orchestrationResultToConfirmedSession(orchestrateResult), "CONFIRM");
    const assetPlan = orchestrator.generateAssetPlan(confirmRes.session, confirmRes.authorization);

    const contextReq = assetPlan.requirements.find((r) => r.type === AssetRequirementType.CONTEXTUAL_IMAGE);
    expect(contextReq).toBeDefined();

    const promptArtifact = promptBuilder.buildPrompt(contextReq!);
    expect(promptArtifact.subject).toBe(contextReq?.subject.primarySubject);
    expect(promptArtifact.composition).toBe(contextReq?.visualDirection.composition);
    expect(promptArtifact.negativeConstraints).toContain("watermark");
    expect(promptArtifact.outputRequirements).toContain("Aspect ratio: 1:1");
  });

  test("Test 5: Technical & Business Asset Validation", () => {
    const mockReq = {
      assetRequirementId: "req_test_1",
      type: AssetRequirementType.LOGO,
      role: AssetRole.BRANDING,
      purpose: "Brand logo",
      required: true,
      quantity: 1,
      subject: { primarySubject: "Bawarchi Logo" },
      visualDirection: {
        composition: "Top right",
        subjectHierarchy: "Logo",
        framing: "Vector",
        lighting: "Flat",
        environment: "Transparent",
        realism: "Vector",
        negativeConstraints: [],
      },
      generationMethod: AssetGenerationMethod.EXISTING_BUSINESS_ASSET,
      sourceRequirements: {
        sourceType: "VERIFIED_BUSINESS_ASSET" as const,
        authenticityRequired: true,
      },
      compositionRole: "BRAND_HEADER" as const,
      technicalRequirements: {
        minWidth: 300,
        minHeight: 100,
        aspectRatio: "3:1",
        format: "PNG" as const,
      },
      validationRequirements: {
        subjectAccuracyRequired: true,
        brandComplianceRequired: true,
        truthVerificationRequired: true,
        prohibitedContentFilter: true,
      },
      priority: "P0_CRITICAL" as const,
      dependencies: [],
    };

    // Valid asset
    const validAsset = {
      assetId: "ast_valid_1",
      width: 400,
      height: 150,
      source: "BUSINESS_ASSET" as const,
    };

    const validResult = validator.validateAsset(validAsset, mockReq);
    expect(validResult.valid).toBe(true);

    // Invalid source asset (attempting fake generated logo)
    const invalidAsset = {
      assetId: "ast_invalid_1",
      width: 400,
      height: 150,
      source: "GENERATED" as const,
    };

    const invalidResult = validator.validateAsset(invalidAsset, mockReq);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.truthValid).toBe(false);
    expect(invalidResult.errors[0].code).toBe("UNVERIFIED_SOURCE_ASSET");
  });

  test("Test 6: Asset-level Regeneration without destroying strategy", async () => {
    const orchestrateResult = await orchestrator.orchestrate(sampleInput);
    const confirmRes = orchestrator.processStrategicConfirmation(orchestrationResultToConfirmedSession(orchestrateResult), "CONFIRM");
    const assetPlan = orchestrator.generateAssetPlan(confirmRes.session, confirmRes.authorization);

    const reqId = assetPlan.requirements[0].assetRequirementId;
    const regenOp = planService.regenerateFailedAsset(assetPlan, reqId, 1);

    expect(regenOp.assetRequirementId).toBe(reqId);
    expect(regenOp.attempt).toBe(2);
    expect(regenOp.status).toBe("PENDING");
  });

  test("Test 7: Reel format generates temporal ReelAssetPlan", async () => {
    const reelInput = {
      ...sampleInput,
      format: {
        formatId: "fmt-reel",
        name: "Instagram Reel",
        type: "REEL" as const,
        constraints: [],
      },
    };

    const orchestrateResult = await orchestrator.orchestrate(reelInput);
    const confirmRes = orchestrator.processStrategicConfirmation(orchestrationResultToConfirmedSession(orchestrateResult), "CONFIRM");
    const assetPlan = orchestrator.generateAssetPlan(confirmRes.session, confirmRes.authorization);

    expect(assetPlan.reelPlan).toBeDefined();
    expect(assetPlan.reelPlan?.scenes.length).toBeGreaterThanOrEqual(2);
    expect(assetPlan.reelPlan?.duration.recommendedSeconds).toBe(10);
    expect(assetPlan.reelPlan?.transitions.length).toBeGreaterThan(0);
  });
});

function orchestrationResultToConfirmedSession(result: any) {
  return result.session;
}
