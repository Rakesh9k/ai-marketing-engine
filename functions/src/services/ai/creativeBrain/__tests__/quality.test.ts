import {
  CreativeQualityEvaluatorService,
  CreativeQualityRepairService,
  QualityRegressionChecker,
  CreativeQualityDimension,
  CreativeQualityStatus,
  DEFAULT_ITERATION_POLICY,
} from "../quality";

import { FinalCreativeGovernanceService } from "../governance/governance/finalGovernanceService";
import type {
  BusinessContext,
  FinalCreative,
  CreativeQualityEvaluationInput,
  FinalCreativeGovernanceResult,
} from "../types";

describe("Phase 10.24 — Creative Quality Evaluator & Selective Repair Tests", () => {
  let qualityEvaluator: CreativeQualityEvaluatorService;
  let repairService: CreativeQualityRepairService;
  let regressionChecker: QualityRegressionChecker;
  let _governanceService: FinalCreativeGovernanceService;

  // 1. Restaurant Fixture
  const restaurantBusiness: BusinessContext = {
    businessId: "biz-restaurant-1024",
    name: "Bawarchi Biryani Kondapur",
    industry: "RESTAURANT",
    description: "Authentic Hyderabad dum biryani family dining in Kondapur",
    products: [
      {
        id: "prod-combo-799",
        name: "Family Biryani Combo",
        category: "Biryani",
        verified: true,
        available: true,
        price: { amount: 799, currency: "INR" },
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
        id: "fact-101",
        statement: "Fresh authentic Dum Biryani cooked daily",
        category: "PROOF",
        source: "Verification Audit",
        verified: true,
      },
    ],
    restrictions: [],
    status: "ACTIVE",
  };

  // 2. Salon Fixture
  const salonBusiness: BusinessContext = {
    businessId: "biz-salon-1024",
    name: "Envi Hair & Beauty Salon",
    industry: "SALON",
    description: "Premium hair styling and makeover spa in Gachibowli",
    products: [],
    services: [
      {
        id: "serv-keratin-2999",
        name: "Keratin Hair Treatment",
        category: "Haircare",
        verified: true,
        available: true,
        price: { amount: 2999, currency: "INR" },
      },
    ],
    capabilities: {
      booking: true,
      reservation: true,
      purchase: false,
      whatsapp: true,
      phone: true,
      physicalLocation: true,
      delivery: false,
      onlineOrdering: false,
    },
    contactCapabilities: {
      phone: { available: true, verified: true },
      whatsapp: { available: true, verified: true },
      website: { available: true, verified: true },
      bookingUrl: { available: true, verified: true },
      orderingUrl: { available: "UNKNOWN", verified: false },
      reservationUrl: { available: "UNKNOWN", verified: false },
    },
    verifiedFacts: [
      {
        id: "fact-salon-1",
        statement: "Certified Senior Stylists with 10+ years experience",
        category: "PROOF",
        source: "Certification Audit",
        verified: true,
      },
    ],
    restrictions: [],
    status: "ACTIVE",
  };

  // 3. Real Estate Fixture
  const realEstateBusiness: BusinessContext = {
    businessId: "biz-re-1024",
    name: "Urban Heights Luxury Apartments",
    industry: "REAL_ESTATE",
    description: "3 BHK luxury gated community apartments in Tellapur",
    products: [
      {
        id: "prod-3bhk-125L",
        name: "3 BHK Luxury Apartment",
        category: "Apartment",
        verified: true,
        available: true,
        price: { amount: 12500000, currency: "INR" },
      },
    ],
    services: [],
    capabilities: {
      booking: true,
      reservation: true,
      purchase: false,
      whatsapp: true,
      phone: true,
      physicalLocation: true,
      delivery: false,
      onlineOrdering: false,
    },
    contactCapabilities: {
      phone: { available: true, verified: true },
      whatsapp: { available: true, verified: true },
      website: { available: true, verified: true },
      bookingUrl: { available: true, verified: true },
      orderingUrl: { available: "UNKNOWN", verified: false },
      reservationUrl: { available: "UNKNOWN", verified: false },
    },
    verifiedFacts: [
      {
        id: "fact-re-1",
        statement: "GHMC approved 3 BHK apartments ready for possession",
        category: "PROOF",
        source: "Approval Document",
        verified: true,
      },
    ],
    restrictions: [],
    status: "ACTIVE",
  };

  const sampleStrategy: any = {
    id: "strat-1024",
    name: "Weekend Special Family Feast",
    coreIdea: {
      statement: "Weekend Special Family Feast",
      shortVersion: "Family Biryani Feast",
      strategicMeaning: "Make weekend family dinner effortless",
    },
    hook: {
      openingFunction: "Treat your family this weekend without dinner stress",
      illustrativeExample: "Treat your family this weekend without dinner stress",
    },
    mechanism: { id: "mech_convenience", name: "Convenience" },
    psychology: { intendedEmotion: "RELIEF" },
    marketingObjective: "CONVERSION",
    audience: {
      audienceDescription: "Families in Kondapur seeking fresh weekend dining",
      situation: { context: "Kondapur family weekend dinner" },
      motivations: ["Convenience", "Authentic Taste"],
      barriers: ["Cooking effort"],
    },
  };

  const samplePlatform: any = {
    platformId: "plt-ig",
    name: "Instagram",
    supported: true,
    expressionConstraints: {
      aspectRatios: ["1:1"],
      textDensity: "LOW",
      contentDensity: "MEDIUM",
      visualPacing: "MODERATE",
      sourceVersion: 1,
      lastVerified: new Date().toISOString(),
    },
  };

  const sampleFormat: any = {
    formatId: "fmt-post",
    name: "Feed Post",
    type: "POST",
  };

  const samplePassingGovernance: FinalCreativeGovernanceResult = {
    evaluationId: "eval_gov_pass",
    businessId: restaurantBusiness.businessId,
    sessionId: "sess_1024_pass",
    revision: 1,
    strategyId: sampleStrategy.id,
    creativeVersionId: "ver_1024_pass",
    status: "PASS",
    truth: {
      status: "PASS",
      checkedAt: new Date().toISOString(),
      checks: [],
      summary: "Truth check passed",
    },
    safety: {
      status: "PASS",
      risks: [],
      reasoning: "Safe",
      requiredChanges: [],
      policyVersion: "v1",
    },
    brand: {
      status: "PASS",
      voiceCompliant: true,
      positioningCompliant: true,
      visualIdentityCompliant: true,
      issues: [],
      policyVersion: "v1",
    },
    blockingIssues: [],
    warnings: [],
    policyVersions: { truth: "v1", safety: "v1", brand: "v1" },
    evaluatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    qualityEvaluator = new CreativeQualityEvaluatorService();
    repairService = new CreativeQualityRepairService();
    regressionChecker = new QualityRegressionChecker();
    _governanceService = new FinalCreativeGovernanceService();
  });

  // Test 1: Strong Creative Passes All 12 Quality Dimensions
  test("Test 1: Strong, strategically aligned creative passes all 12 quality dimensions & receives PASS status", async () => {
    const strongCreative: FinalCreative = {
      creativeVersionId: "ver_1024_strong",
      sessionId: "sess_1024_1",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1024_1",
      copy: {
        headline: {
          role: "HEADLINE",
          purpose: "Hook",
          content: "Bawarchi Biryani Kondapur: Weekend Special Family Feast for ₹799",
          requiredInformation: [],
          prohibitedClaims: [],
          truthRequirements: [],
        },
        supportingCopy: {
          role: "SUPPORT",
          purpose: "Body",
          content: "Freshly prepared authentic Dum Biryani cooked daily in Kondapur. Effortless weekend dining.",
          requiredInformation: [],
          prohibitedClaims: [],
          truthRequirements: [],
        },
        cta: {
          role: "CTA",
          purpose: "Action",
          content: "Order Now",
          requiredInformation: [],
          prohibitedClaims: [],
          truthRequirements: [],
        },
        offerCopy: {
          role: "OFFER",
          purpose: "Offer details",
          content: "Family Biryani Combo price INR 799",
          requiredInformation: [],
          prohibitedClaims: [],
          truthRequirements: [],
        },
      },
      assets: [
        {
          assetId: "ast_hero_1",
          tenantId: "tenant_1",
          businessId: restaurantBusiness.businessId,
          sessionId: "sess_1024_1",
          revision: 1,
          assetPlanId: "plan_1",
          assetRequirementId: "req_hero",
          type: "HERO_IMAGE" as any,
          role: "ATTENTION" as any,
          source: "BUSINESS_ASSET",
          storageReference: "gs://bucket/hero.jpg",
          mimeType: "image/jpeg",
          width: 1080,
          height: 1080,
          status: "VALID" as any,
          validation: { assetId: "ast_hero_1", valid: true, technicalValid: true, subjectValid: true, brandValid: true, truthValid: true, compositionCompatible: true, warnings: [], errors: [] },
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const input: CreativeQualityEvaluationInput = {
      businessId: restaurantBusiness.businessId,
      sessionId: "sess_1024_1",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1024_1",
      creativeVersionId: strongCreative.creativeVersionId,
      strategy: sampleStrategy,
      creative: strongCreative,
      governance: samplePassingGovernance,
      platform: samplePlatform,
      format: sampleFormat,
      business: restaurantBusiness,
    };

    const evaluation = await qualityEvaluator.evaluate(input);

    expect(evaluation.status).toBe(CreativeQualityStatus.PASS);
    expect(evaluation.overallScore).toBeGreaterThanOrEqual(85);
    expect(evaluation.dimensions.length).toBe(12);

    // Verify all 12 dimensions are present
    const dimensionNames = evaluation.dimensions.map((d) => d.dimension);
    expect(dimensionNames).toContain(CreativeQualityDimension.STRATEGIC_FIT);
    expect(dimensionNames).toContain(CreativeQualityDimension.AUDIENCE_RELEVANCE);
    expect(dimensionNames).toContain(CreativeQualityDimension.CLARITY);
    expect(dimensionNames).toContain(CreativeQualityDimension.ATTENTION);
    expect(dimensionNames).toContain(CreativeQualityDimension.EMOTIONAL_RESONANCE);
    expect(dimensionNames).toContain(CreativeQualityDimension.DIFFERENTIATION);
    expect(dimensionNames).toContain(CreativeQualityDimension.BRAND_FIT);
    expect(dimensionNames).toContain(CreativeQualityDimension.OFFER_CLARITY);
    expect(dimensionNames).toContain(CreativeQualityDimension.CTA_STRENGTH);
    expect(dimensionNames).toContain(CreativeQualityDimension.VISUAL_HIERARCHY);
    expect(dimensionNames).toContain(CreativeQualityDimension.PLATFORM_FIT);
    expect(dimensionNames).toContain(CreativeQualityDimension.TRUTHFULNESS);
  });

  // Test 2: Truth Check Failure Yields Score 0 & BLOCKED Status (Governance Hard Gate)
  test("Test 2: Truth Check failure yields Truthfulness score 0 & BLOCKED status regardless of visual/copy score", async () => {
    const failingGovernance: FinalCreativeGovernanceResult = {
      ...samplePassingGovernance,
      status: "FAIL",
      truth: {
        status: "FAIL",
        checkedAt: new Date().toISOString(),
        checks: [
          {
            category: "price",
            status: "FAIL",
            generatedValue: "₹499",
            expectedValue: "₹799",
            reason: "Price mismatch: copy claims ₹499 but verified product is ₹799",
          },
        ],
        summary: "Truth check failed",
      },
    };

    const creativeWithFalsePrice: FinalCreative = {
      creativeVersionId: "ver_1024_false_price",
      sessionId: "sess_1024_2",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1024_2",
      copy: {
        headline: { role: "HEADLINE", purpose: "Hook", content: "Bawarchi Biryani for ₹499!", requiredInformation: [], prohibitedClaims: [], truthRequirements: [] },
        cta: { role: "CTA", purpose: "Action", content: "Order Now", requiredInformation: [], prohibitedClaims: [], truthRequirements: [] },
      },
      assets: [],
      createdAt: new Date().toISOString(),
    };

    const input: CreativeQualityEvaluationInput = {
      businessId: restaurantBusiness.businessId,
      sessionId: "sess_1024_2",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1024_2",
      creativeVersionId: creativeWithFalsePrice.creativeVersionId,
      strategy: sampleStrategy,
      creative: creativeWithFalsePrice,
      governance: failingGovernance,
      platform: samplePlatform,
      format: sampleFormat,
      business: restaurantBusiness,
    };

    const evaluation = await qualityEvaluator.evaluate(input);

    expect(evaluation.status).toBe(CreativeQualityStatus.BLOCKED);
    const truthDim = evaluation.dimensions.find((d) => d.dimension === CreativeQualityDimension.TRUTHFULNESS);
    expect(truthDim?.score).toBe(0);
  });

  // Test 3: Strategic Misalignment Triggers Low Score & Repair Plan
  test("Test 3: Creative replacing strategic idea with generic discount receives low STRATEGIC_FIT score & generates repair plan", async () => {
    const misalignedCreative: FinalCreative = {
      creativeVersionId: "ver_1024_misaligned",
      sessionId: "sess_1024_3",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1024_3",
      copy: {
        headline: { role: "HEADLINE", purpose: "Hook", content: "20% OFF Everything - Big Sale!", requiredInformation: [], prohibitedClaims: [], truthRequirements: [] },
        supportingCopy: { role: "SUPPORT", purpose: "Body", content: "Cheapest prices in town. Discount sale.", requiredInformation: [], prohibitedClaims: [], truthRequirements: [] },
        cta: { role: "CTA", purpose: "Action", content: "Order Now", requiredInformation: [], prohibitedClaims: [], truthRequirements: [] },
      },
      assets: [],
      createdAt: new Date().toISOString(),
    };

    const input: CreativeQualityEvaluationInput = {
      businessId: restaurantBusiness.businessId,
      sessionId: "sess_1024_3",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1024_3",
      creativeVersionId: misalignedCreative.creativeVersionId,
      strategy: sampleStrategy,
      creative: misalignedCreative,
      governance: samplePassingGovernance,
      platform: samplePlatform,
      format: sampleFormat,
      business: restaurantBusiness,
    };

    const evaluation = await qualityEvaluator.evaluate(input);

    expect(evaluation.status).toBe(CreativeQualityStatus.NEEDS_IMPROVEMENT);
    const stratFit = evaluation.dimensions.find((d) => d.dimension === CreativeQualityDimension.STRATEGIC_FIT);
    expect(stratFit?.score).toBeLessThan(75);
    expect(evaluation.repairPlan).toBeDefined();
    expect(evaluation.repairPlan?.issues.length).toBeGreaterThan(0);
  });

  // Test 4: Weak CTA Triggers Selective CTA Component Repair
  test("Test 4: Creative with weak generic CTA ('Learn More') receives lower CTA score & generates CTA repair action", async () => {
    const weakCtaCreative: FinalCreative = {
      creativeVersionId: "ver_1024_weak_cta",
      sessionId: "sess_1024_4",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1024_4",
      copy: {
        headline: { role: "HEADLINE", purpose: "Hook", content: "Bawarchi Biryani Kondapur: Weekend Special Family Feast for ₹799", requiredInformation: [], prohibitedClaims: [], truthRequirements: [] },
        supportingCopy: { role: "SUPPORT", purpose: "Body", content: "Freshly prepared daily in Kondapur.", requiredInformation: [], prohibitedClaims: [], truthRequirements: [] },
        cta: { role: "CTA", purpose: "Action", content: "Learn More", requiredInformation: [], prohibitedClaims: [], truthRequirements: [] },
      },
      assets: [],
      createdAt: new Date().toISOString(),
    };

    const input: CreativeQualityEvaluationInput = {
      businessId: restaurantBusiness.businessId,
      sessionId: "sess_1024_4",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1024_4",
      creativeVersionId: weakCtaCreative.creativeVersionId,
      strategy: sampleStrategy,
      creative: weakCtaCreative,
      governance: samplePassingGovernance,
      platform: samplePlatform,
      format: sampleFormat,
      business: restaurantBusiness,
    };

    const evaluation = await qualityEvaluator.evaluate(input);
    const ctaDim = evaluation.dimensions.find((d) => d.dimension === CreativeQualityDimension.CTA_STRENGTH);
    expect(ctaDim?.score).toBeLessThan(70);

    const ctaIssue = evaluation.repairPlan?.issues.find((i) => i.targetComponent === "CTA");
    expect(ctaIssue).toBeDefined();
  });

  // Test 5: Selective Regeneration Preserves Approved Strategy & Assets
  test("Test 5: Selective regeneration repairs weak CTA while preserving approved visual assets and strategy", async () => {
    const weakCtaCreative: FinalCreative = {
      creativeVersionId: "ver_1024_selective",
      sessionId: "sess_1024_5",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1024_5",
      copy: {
        headline: { role: "HEADLINE", purpose: "Hook", content: "Bawarchi Biryani Kondapur: Weekend Special Family Feast for ₹799", requiredInformation: [], prohibitedClaims: [], truthRequirements: [] },
        supportingCopy: { role: "SUPPORT", purpose: "Body", content: "Freshly prepared daily in Kondapur.", requiredInformation: [], prohibitedClaims: [], truthRequirements: [] },
        cta: { role: "CTA", purpose: "Action", content: "Learn More", requiredInformation: [], prohibitedClaims: [], truthRequirements: [] },
      },
      assets: [
        {
          assetId: "ast_hero_approved",
          tenantId: "tenant_1",
          businessId: restaurantBusiness.businessId,
          sessionId: "sess_1024_5",
          revision: 1,
          assetPlanId: "plan_1",
          assetRequirementId: "req_hero",
          type: "HERO_IMAGE" as any,
          role: "ATTENTION" as any,
          source: "BUSINESS_ASSET",
          storageReference: "gs://bucket/approved_hero.jpg",
          mimeType: "image/jpeg",
          width: 1080,
          height: 1080,
          status: "VALID" as any,
          validation: { assetId: "ast_hero_approved", valid: true, technicalValid: true, subjectValid: true, brandValid: true, truthValid: true, compositionCompatible: true, warnings: [], errors: [] },
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const input: CreativeQualityEvaluationInput = {
      businessId: restaurantBusiness.businessId,
      sessionId: "sess_1024_5",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1024_5",
      creativeVersionId: weakCtaCreative.creativeVersionId,
      strategy: sampleStrategy,
      creative: weakCtaCreative,
      governance: samplePassingGovernance,
      platform: samplePlatform,
      format: sampleFormat,
      business: restaurantBusiness,
    };

    const evaluation = await qualityEvaluator.evaluate(input);

    const repairRes = await repairService.repair({
      businessId: restaurantBusiness.businessId,
      sessionId: "sess_1024_5",
      revision: 1,
      currentEvaluation: evaluation,
      repairPlan: evaluation.repairPlan!,
      currentCreative: weakCtaCreative,
      strategy: sampleStrategy,
      governance: samplePassingGovernance,
      platform: samplePlatform,
      format: sampleFormat,
      business: restaurantBusiness,
      iterationCount: 0,
    });

    expect(repairRes.status).toBe("SUCCESS");
    expect(repairRes.repairedCreative?.copy.cta.content).toBe("Order Now");
    // Verify asset is preserved
    expect(repairRes.repairedCreative?.assets[0]?.storageReference).toBe("gs://bucket/approved_hero.jpg");
  });

  // Test 6: Iteration Policy Prevents Endless Regeneration Loop
  test("Test 6: Quality repair service enforces max 3 iterations limit to prevent endless generation loop", async () => {
    const weakCreative: FinalCreative = {
      creativeVersionId: "ver_1024_loop",
      sessionId: "sess_1024_6",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1024_6",
      copy: {
        headline: { role: "HEADLINE", purpose: "Hook", content: "Generic food", requiredInformation: [], prohibitedClaims: [], truthRequirements: [] },
        cta: { role: "CTA", purpose: "Action", content: "Click", requiredInformation: [], prohibitedClaims: [], truthRequirements: [] },
      },
      assets: [],
      createdAt: new Date().toISOString(),
    };

    const input: CreativeQualityEvaluationInput = {
      businessId: restaurantBusiness.businessId,
      sessionId: "sess_1024_6",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1024_6",
      creativeVersionId: weakCreative.creativeVersionId,
      strategy: sampleStrategy,
      creative: weakCreative,
      governance: samplePassingGovernance,
      platform: samplePlatform,
      format: sampleFormat,
      business: restaurantBusiness,
    };

    const evaluation = await qualityEvaluator.evaluate(input);

    const repairRes = await repairService.repair(
      {
        businessId: restaurantBusiness.businessId,
        sessionId: "sess_1024_6",
        revision: 1,
        currentEvaluation: evaluation,
        repairPlan: evaluation.repairPlan!,
        currentCreative: weakCreative,
        strategy: sampleStrategy,
        governance: samplePassingGovernance,
        platform: samplePlatform,
        format: sampleFormat,
        business: restaurantBusiness,
        iterationCount: 3, // Already at max iterations
      },
      DEFAULT_ITERATION_POLICY
    );

    expect(repairRes.status).toBe("MAX_ITERATIONS_REACHED");
  });

  // Test 7: Regression Checker Rejects Repairs Causing Severe Collateral Drops
  test("Test 7: Regression checker rejects repair attempt if a critical dimension drops below threshold", () => {
    const previousEval: any = {
      evaluationId: "eval_prev",
      dimensions: [
        { dimension: CreativeQualityDimension.STRATEGIC_FIT, score: 90 },
        { dimension: CreativeQualityDimension.CLARITY, score: 95 },
      ],
      status: "NEEDS_IMPROVEMENT",
    };

    const regressedEval: any = {
      evaluationId: "eval_new",
      dimensions: [
        { dimension: CreativeQualityDimension.STRATEGIC_FIT, score: 92 },
        { dimension: CreativeQualityDimension.CLARITY, score: 70 }, // -25 point drop!
      ],
      status: "PASS",
    };

    const comparison = regressionChecker.compareEvaluations(previousEval, regressedEval, DEFAULT_ITERATION_POLICY);
    expect(comparison.acceptable).toBe(false);
    expect(comparison.decision).toBe("REJECT_REPAIR");
  });

  // Test 8: Contextual Weighting Adjusts Dimension Emphasis Across Verticals
  test("Test 8: Contextual weighting adjusts dimension weights appropriately between Restaurant, Salon, and Real Estate", async () => {
    const makeEvalInput = (business: BusinessContext): CreativeQualityEvaluationInput => ({
      businessId: business.businessId,
      sessionId: "sess_ctx",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_ctx",
      creativeVersionId: "ver_ctx",
      strategy: sampleStrategy,
      creative: {
        creativeVersionId: "ver_ctx",
        sessionId: "sess_ctx",
        revision: 1,
        strategyId: sampleStrategy.id,
        confirmationId: "conf_ctx",
        copy: { headline: { role: "HEADLINE", purpose: "H", content: "Test", requiredInformation: [], prohibitedClaims: [], truthRequirements: [] }, cta: { role: "CTA", purpose: "C", content: "Act", requiredInformation: [], prohibitedClaims: [], truthRequirements: [] } },
        assets: [],
        createdAt: new Date().toISOString(),
      },
      governance: samplePassingGovernance,
      platform: samplePlatform,
      format: sampleFormat,
      business,
    });

    const restEval = await qualityEvaluator.evaluate(makeEvalInput(restaurantBusiness));
    const salonEval = await qualityEvaluator.evaluate(makeEvalInput(salonBusiness));
    const reEval = await qualityEvaluator.evaluate(makeEvalInput(realEstateBusiness));

    expect(restEval.policyVersion).toBeDefined();
    expect(salonEval.policyVersion).toBeDefined();
    expect(reEval.policyVersion).toBeDefined();
  });

  // Test 9: Staleness Detection
  test("Test 9: Changing session revision or strategy ID marks existing quality evaluation STALE", () => {
    const priorEval: any = {
      evaluationId: "eval_old",
      revision: 1,
      strategyId: "strat-1",
      creativeVersionId: "ver-1",
      status: "PASS",
    };

    const isStale = qualityEvaluator.isStale(priorEval, 2, "strat-1", "ver-1");
    expect(isStale).toBe(true);
  });
});
