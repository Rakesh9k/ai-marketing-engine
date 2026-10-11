import { FinalCreativeGovernanceService } from "../governance/governance/finalGovernanceService";
import { PublicationAuthorizationService } from "../governance/authorization/publicationAuthorization";
import { GovernanceReviewService } from "../governance/review/governanceReviewService";
import { CreativeBrainOrchestrator } from "../orchestrator/creativeBrainOrchestrator";
import type { BusinessContext, CreativeGovernanceInput } from "../types";

describe("Phase 10.23 — Truth, Safety & Ethical Intelligence Integration Tests", () => {
  let governanceService: FinalCreativeGovernanceService;
  let authService: PublicationAuthorizationService;
  let reviewService: GovernanceReviewService;
  let _orchestrator: CreativeBrainOrchestrator;

  const validRestaurantBusiness: BusinessContext = {
    businessId: "biz-restaurant-1023",
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
      {
        id: "fact-102",
        statement: "Weekend special offer valid until Sunday 11 PM",
        category: "OFFER",
        source: "Owner Setting",
        verified: true,
      },
    ],
    restrictions: [
      {
        id: "rest-1",
        type: "BRAND",
        rule: "never claim to be cheap food",
        severity: "HARD",
        source: "Brand Guide",
      },
    ],
    status: "ACTIVE",
  };

  const sampleStrategy: any = {
    id: "strat-1023",
    name: "Weekend Special Family Combo",
    hook: { id: "hk-1", text: "Treat your family this weekend" },
    mechanism: { id: "mech_convenience", name: "Convenience" },
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

  beforeEach(() => {
    governanceService = new FinalCreativeGovernanceService();
    authService = new PublicationAuthorizationService();
    reviewService = new GovernanceReviewService();
    _orchestrator = new CreativeBrainOrchestrator();
  });

  function makeCopyPlan(
    headlineText: string,
    bodyText?: string,
    ctaText?: string,
    offerText?: string
  ): any {
    return {
      headline: {
        role: "HEADLINE",
        purpose: "Hook audience",
        content: headlineText,
        requiredInformation: [],
        prohibitedClaims: [],
        truthRequirements: [],
      },
      supportingCopy: bodyText
        ? {
            role: "SUPPORT",
            purpose: "Body description",
            content: bodyText,
            requiredInformation: [],
            prohibitedClaims: [],
            truthRequirements: [],
          }
        : undefined,
      cta: {
        role: "CTA",
        purpose: "Primary Call to Action",
        content: ctaText || "Order Now",
        requiredInformation: [],
        prohibitedClaims: [],
        truthRequirements: [],
      },
      offerCopy: offerText
        ? {
            role: "OFFER",
            purpose: "Offer description",
            content: offerText,
            requiredInformation: [],
            prohibitedClaims: [],
            truthRequirements: [],
          }
        : undefined,
      bodyText,
      primaryCta: ctaText || "Order Now",
      offerText,
    };
  }

  // Test 1: Verified Safe Creative PASSES Governance
  test("Test 1: Safe, verified creative passes Truth, Safety, and Brand governance", async () => {
    const input: CreativeGovernanceInput = {
      businessId: validRestaurantBusiness.businessId,
      sessionId: "sess_1023_1",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1023_1",
      creativeVersionId: "ver_1023_1",
      businessContext: validRestaurantBusiness,
      strategy: sampleStrategy,
      copy: makeCopyPlan(
        "Bawarchi Biryani Kondapur: Treat your family to Authentic Dum Biryani for ₹799",
        "Freshly prepared daily in Kondapur.",
        "Order Now",
        "Weekend Special Combo at ₹799"
      ),
      platform: samplePlatform,
      format: sampleFormat,
    };

    const govResult = await governanceService.evaluate(input);
    expect(govResult.status).toBe("PASS");
    expect(govResult.truth.status).toBe("PASS");
    expect(govResult.safety.status).toBe("PASS");
    expect(govResult.brand.status).toBe("PASS");
    expect(govResult.blockingIssues.length).toBe(0);

    // Publication Authorization
    const authResult = authService.authorizePublication({
      businessId: input.businessId,
      sessionId: input.sessionId,
      revision: input.revision,
      governanceResult: govResult,
    });

    expect(authResult.authorized).toBe(true);
    expect(authResult.authorization?.authorizationHash).toBeDefined();
  });

  // Test 2: Unverified Price & Fake Discount BLOCKS Publication
  test("Test 2: Unverified price or false discount claim BLOCKS Truth Check and publication", async () => {
    const input: CreativeGovernanceInput = {
      businessId: validRestaurantBusiness.businessId,
      sessionId: "sess_1023_2",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1023_2",
      creativeVersionId: "ver_1023_2",
      businessContext: validRestaurantBusiness,
      strategy: sampleStrategy,
      copy: makeCopyPlan(
        "Huge discount! Get Biryani for ₹499 (was ₹999)",
        "50% OFF today only!",
        "Order Now"
      ),
      platform: samplePlatform,
      format: sampleFormat,
    };

    const govResult = await governanceService.evaluate(input);
    expect(govResult.status).toBe("FAIL");
    expect(govResult.truth.status).toBe("FAIL");
    expect(govResult.blockingIssues.length).toBeGreaterThan(0);

    const authResult = authService.authorizePublication({
      businessId: input.businessId,
      sessionId: input.sessionId,
      revision: input.revision,
      governanceResult: govResult,
    });

    expect(authResult.authorized).toBe(false);
    expect(authResult.rejectionReasons).toContain("Truth Check governance failed with status 'FAIL'");
  });

  // Test 3: Fabricated Social Proof / Fake Rating BLOCKS Governance
  test("Test 3: Fake ratings and fabricated customer counts BLOCK publication", async () => {
    const input: CreativeGovernanceInput = {
      businessId: validRestaurantBusiness.businessId,
      sessionId: "sess_1023_3",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1023_3",
      creativeVersionId: "ver_1023_3",
      businessContext: validRestaurantBusiness,
      strategy: sampleStrategy,
      copy: makeCopyPlan(
        "Rated 4.9/5 by 50,000 satisfied customers in Kondapur!",
        "India's #1 rated biryani.",
        "Order Now"
      ),
      platform: samplePlatform,
      format: sampleFormat,
    };

    const govResult = await governanceService.evaluate(input);
    expect(govResult.status).toBe("FAIL");
    expect(govResult.truth.status).toBe("FAIL");

    const explanation = governanceService.explain(govResult);
    expect(explanation.truthExplanation).toBeDefined();
    expect(explanation.actionableCorrections.length).toBeGreaterThan(0);
  });

  // Test 4: Manufactured False Scarcity BLOCKS Governance
  test("Test 4: Manufactured scarcity ('Only 2 left!') without inventory proof BLOCKS governance", async () => {
    const input: CreativeGovernanceInput = {
      businessId: validRestaurantBusiness.businessId,
      sessionId: "sess_1023_4",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1023_4",
      creativeVersionId: "ver_1023_4",
      businessContext: validRestaurantBusiness,
      strategy: sampleStrategy,
      copy: makeCopyPlan(
        "Hurry! Only 2 Biryani boxes left in stock!",
        "Selling out fast!",
        "Order Now"
      ),
      platform: samplePlatform,
      format: sampleFormat,
    };

    const govResult = await governanceService.evaluate(input);
    expect(govResult.status).toBe("FAIL");
  });

  // Test 5: Unsafe Psychological Mechanisms (Coercion, Body Shaming) BLOCK Governance
  test("Test 5: Coercive threats and body shaming trigger CRITICAL safety failure", async () => {
    const input: CreativeGovernanceInput = {
      businessId: validRestaurantBusiness.businessId,
      sessionId: "sess_1023_5",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1023_5",
      creativeVersionId: "ver_1023_5",
      businessContext: validRestaurantBusiness,
      strategy: sampleStrategy,
      copy: makeCopyPlan(
        "Don't look ugly and embarrassing at the party",
        "If you don't order now, your family will suffer a total dinner disaster!",
        "Order Now"
      ),
      platform: samplePlatform,
      format: sampleFormat,
    };

    const govResult = await governanceService.evaluate(input);
    expect(govResult.status).toBe("FAIL");
    expect(govResult.safety.status).toBe("FAIL");
    expect(govResult.safety.risks.some((r) => r.type === "BODY_SHAMING")).toBe(true);
    expect(govResult.safety.risks.some((r) => r.type === "FEAR_EXPLOITATION")).toBe(true);
  });

  // Test 6: High-Risk Verticals (Medical & Financial Claims) BLOCK Governance
  test("Test 6: High-risk medical and financial claims require verified evidence", async () => {
    const input: CreativeGovernanceInput = {
      businessId: validRestaurantBusiness.businessId,
      sessionId: "sess_1023_6",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1023_6",
      creativeVersionId: "ver_1023_6",
      businessContext: validRestaurantBusiness,
      strategy: sampleStrategy,
      copy: makeCopyPlan(
        "Guaranteed to cure chronic fatigue and double your money in 30 days!",
        "Doctor recommended medical solution.",
        "Invest Now"
      ),
      platform: samplePlatform,
      format: sampleFormat,
    };

    const govResult = await governanceService.evaluate(input);
    expect(govResult.status).toBe("FAIL");
    expect(govResult.truth.status).toBe("FAIL");
    expect(govResult.blockingIssues.some((i) => i.message.includes("Medical claim"))).toBe(true);
  });

  // Test 7: Brand Restriction Violation BLOCKS Governance
  test("Test 7: Prohibited brand treatments or brand restriction rules BLOCK governance", async () => {
    const input: CreativeGovernanceInput = {
      businessId: validRestaurantBusiness.businessId,
      sessionId: "sess_1023_7",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1023_7",
      creativeVersionId: "ver_1023_7",
      businessContext: validRestaurantBusiness,
      strategy: sampleStrategy,
      copy: makeCopyPlan(
        "Get cheap food at Bawarchi Biryani",
        "Cheap food for everyone",
        "Order Now"
      ),
      platform: samplePlatform,
      format: sampleFormat,
    };

    const govResult = await governanceService.evaluate(input);
    expect(govResult.status).toBe("FAIL");
    expect(govResult.brand.status).toBe("FAIL");
  });

  // Test 8: Psychological Mechanism Drift Detection
  test("Test 8: Detecting psychological mechanism drift (planned Convenience -> mutated False Urgency)", async () => {
    const input: CreativeGovernanceInput = {
      businessId: validRestaurantBusiness.businessId,
      sessionId: "sess_1023_8",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1023_8",
      creativeVersionId: "ver_1023_8",
      businessContext: validRestaurantBusiness,
      strategy: {
        ...sampleStrategy,
        mechanism: { id: "mech_convenience", name: "Convenience" },
      },
      copy: makeCopyPlan(
        "Book now or your family misses out! Only 2 left!",
        "Hurry before disaster strikes!",
        "Order Now"
      ),
      platform: samplePlatform,
      format: sampleFormat,
    };

    const govResult = await governanceService.evaluate(input);
    expect(govResult.status).toBe("FAIL");
    expect(govResult.blockingIssues.some((i) => i.code === "PSYCHOLOGICAL_MECHANISM_DRIFT")).toBe(true);
  });

  // Test 9: Stale Governance State Invalidation on Revision Change
  test("Test 9: Changing session revision invalidates prior PASS governance result (STALE state)", () => {
    const priorResult: any = {
      evaluationId: "eval_old",
      revision: 1,
      strategyId: "strat-1",
      creativeVersionId: "ver-1",
      status: "PASS",
    };

    const isStale = governanceService.isStale(priorResult, 2, "strat-1", "ver-1");
    expect(isStale).toBe(true);
  });

  // Test 10: Human Review Authorizes Specific Creative Version Only
  test("Test 10: Human review authorizes ONLY current creative version without mutating Creative Bank", async () => {
    const input: CreativeGovernanceInput = {
      businessId: validRestaurantBusiness.businessId,
      sessionId: "sess_1023_10",
      revision: 1,
      strategyId: sampleStrategy.id,
      confirmationId: "conf_1023_10",
      creativeVersionId: "ver_1023_10",
      businessContext: validRestaurantBusiness,
      strategy: sampleStrategy,
      copy: makeCopyPlan(
        "Bawarchi Biryani Kondapur: Weekend family biryani feast",
        "Urgent offer ending soon",
        "Order Now"
      ),
      platform: samplePlatform,
      format: sampleFormat,
    };

    const govResult = await governanceService.evaluate(input);
    expect(govResult.status).toBe("REVIEW");

    const reviewRes = reviewService.processHumanReview(
      govResult,
      "APPROVE",
      "admin@brainwise.ai",
      "Manually verified weekend deadline with store manager"
    );

    expect(reviewRes.review.decision).toBe("APPROVE");
    expect(reviewRes.updatedGovernanceResult.status).toBe("PASS");

    // Server publication authorization now passes for version 10
    const authResult = authService.authorizePublication({
      businessId: input.businessId,
      sessionId: input.sessionId,
      revision: input.revision,
      governanceResult: reviewRes.updatedGovernanceResult,
    });

    expect(authResult.authorized).toBe(true);
  });
});
