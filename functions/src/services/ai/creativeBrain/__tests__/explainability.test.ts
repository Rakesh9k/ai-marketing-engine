import {
  FirestoreTraceRepository,
  ConfidenceService,
  DecisionTraceService,
  ReasoningGraphService,
  ExplanationService,
  ExplanationValidator,
  UserOverrideService,
  ExplainabilityService,
} from "../explainability";
import type {
  DecisionTrace,
  UserOverrideRecord,
} from "../types/explainability";

describe("Phase 10.30 — Creative Intelligence Explainability System ('Explain Why')", () => {
  let repository: FirestoreTraceRepository;
  let traceService: DecisionTraceService;
  let graphService: ReasoningGraphService;
  let explanationService: ExplanationService;
  let validator: ExplanationValidator;
  let overrideService: UserOverrideService;
  let explainabilityService: ExplainabilityService;

  const TENANT_A = "tenant_restaurant_hyderabad";
  const TENANT_B = "tenant_retail_bangalore";
  const SESSION_1 = "sess_1001";
  const CAMPAIGN_1 = "cmp_5001";

  beforeEach(() => {
    repository = new FirestoreTraceRepository();
    repository.clearInMemoryState();

    traceService = new DecisionTraceService(repository);
    graphService = new ReasoningGraphService();
    explanationService = new ExplanationService(graphService);
    validator = new ExplanationValidator();
    overrideService = new UserOverrideService(repository);

    explainabilityService = new ExplainabilityService(
      repository,
      traceService,
      graphService,
      explanationService,
      validator,
      overrideService
    );
  });

  describe("1. Confidence Engine (ConfidenceService)", () => {
    it("should compute deterministic confidence separating strategic fit, evidence, and empirical lift", () => {
      const conf = ConfidenceService.calculateConfidence(
        [
          { type: "BUSINESS_BRAIN", value: "Dining", importance: 0.9 },
          { type: "AUDIENCE", value: "Families", importance: 0.8 },
        ],
        [{ type: "BUSINESS_FACT", scope: "KNOWN", claim: "Kondapur location", strength: "STRONG", confidence: 0.9 }],
        0.88
      );

      expect(conf.score).toBeGreaterThan(0.7);
      expect(conf.score).toBeLessThanOrEqual(1.0);
      expect(conf.level).toBe("HIGH");
      expect(conf.basis).toContain("Business context alignment");
      expect(conf.basis).toContain("Audience situation fit");
    });
  });

  describe("2. Decision Trace Capture at Decision Time (DecisionTraceService)", () => {
    it("should record decision traces dynamically at decision time with alternatives and rejection reasons", async () => {
      const decision1 = await traceService.recordDecision({
        sessionId: SESSION_1,
        campaignId: CAMPAIGN_1,
        tenantId: TENANT_A,
        decisionType: "AUDIENCE",
        selectedItemId: "tension_dinner_fatigue",
        selectedName: "Weekday Dinner Decision Fatigue",
        primaryReason: "Target working parents experience high cognitive fatigue deciding evening meals after 6 PM.",
        inputs: [{ type: "AUDIENCE", value: "Working Parents in Kondapur", importance: 0.9 }],
        evidence: [
          {
            type: "BUSINESS_FACT",
            scope: "KNOWN",
            claim: "Location Kondapur has 65% IT professional population",
            strength: "STRONG",
            confidence: 0.9,
          },
          {
            type: "PERFORMANCE",
            scope: "LEARNED",
            claim: "Convenience angle holds 8.2% CTR on Instagram Reels in Hyderabad",
            strength: "STRONG",
            confidence: 0.85,
          },
        ],
        constraints: [{ type: "BRAND", description: "Must adhere to family dining tone", isMandatory: true }],
        alternatives: [
          {
            id: "alt_discount_1",
            name: "Flat 20% Discount Offer",
            score: 0.65,
            strengths: ["High initial CTR"],
            weaknesses: ["Margin erosion"],
            rejectionReasons: ["Discount messaging erodes premium brand perception and produced lower hold rate"],
            selected: false,
          },
        ],
      });

      const decision2 = await traceService.recordDecision({
        sessionId: SESSION_1,
        campaignId: CAMPAIGN_1,
        tenantId: TENANT_A,
        decisionType: "PSYCHOLOGY",
        selectedItemId: "psych_relief",
        selectedName: "Emotional Relief / Instant Convenience",
        primaryReason: "Positions ordering from Mitra Restaurant as instant relief from evening decision strain.",
        inputs: [{ type: "CUSTOMER_TENSION", value: "Weekday Dinner Decision Fatigue", importance: 0.85 }],
        evidence: [
          {
            type: "PERFORMANCE",
            scope: "LEARNED",
            claim: "Relief psychology generated 63 WhatsApp conversions in previous test",
            strength: "STRONG",
            confidence: 0.88,
          },
        ],
        alternatives: [
          {
            id: "alt_fomo_1",
            name: "Urgency / FOMO Strikethrough",
            score: 0.58,
            strengths: [],
            weaknesses: [],
            rejectionReasons: ["High bounce rate among family audience segment"],
            selected: false,
          },
        ],
      });

      expect(decision1.id).toBeDefined();
      expect(decision2.id).toBeDefined();

      const trace = await repository.getTraceBySessionId(SESSION_1);
      expect(trace).not.toBeNull();
      expect(trace?.tenantId).toBe(TENANT_A);
      expect(trace?.campaignId).toBe(CAMPAIGN_1);
      expect(trace?.decisions).toHaveLength(2);
    });
  });

  describe("3. Reasoning DAG Construction (ReasoningGraphService)", () => {
    it("should construct DAG nodes and causal edges across hierarchy steps and constraints", async () => {
      await traceService.recordDecision({
        sessionId: SESSION_1,
        campaignId: CAMPAIGN_1,
        tenantId: TENANT_A,
        decisionType: "AUDIENCE",
        selectedName: "Dinner Fatigue",
        primaryReason: "Reasoning T1",
      });

      await traceService.recordDecision({
        sessionId: SESSION_1,
        campaignId: CAMPAIGN_1,
        tenantId: TENANT_A,
        decisionType: "PSYCHOLOGY",
        selectedName: "Convenience Relief",
        primaryReason: "Reasoning P1",
      });

      const trace = (await repository.getTraceBySessionId(SESSION_1))!;
      const graph = graphService.buildReasoningGraph(trace);

      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0].fromDecisionId).toBe(graph.nodes[0].id);
      expect(graph.edges[0].toDecisionId).toBe(graph.nodes[1].id);
      expect(graph.edges[0].relationship).toBe("CAUSED");
    });
  });

  describe("4. Explanation Engine (ExplanationService)", () => {
    let sampleTrace: DecisionTrace;
    let hookDecisionId: string;

    beforeEach(async () => {
      const decision = await traceService.recordDecision({
        sessionId: SESSION_1,
        campaignId: CAMPAIGN_1,
        tenantId: TENANT_A,
        decisionType: "HOOK",
        selectedItemId: "hook_stop_cooking",
        selectedName: "Stop Cooking Tonight - You Deserve A Break",
        primaryReason: "Directly interrupts scroll with relatable weekday evening exhaustion trigger.",
        inputs: [{ type: "AUDIENCE", value: "Kondapur IT Parents", importance: 0.9 }],
        evidence: [
          {
            type: "BUSINESS_FACT",
            scope: "KNOWN",
            claim: "Target audience works late hours in Kondapur tech hub",
            strength: "STRONG",
            confidence: 0.95,
          },
          {
            type: "PERFORMANCE",
            scope: "LEARNED",
            claim: "Exhaustion trigger hook achieved 14.2% initial 3s view rate",
            strength: "STRONG",
            confidence: 0.89,
          },
        ],
        constraints: [{ type: "BRAND", description: "Empathetic, non-judgmental", isMandatory: true }],
        alternatives: [
          {
            id: "alt_hook_cheap",
            name: "Cheapest Biryani in Kondapur!",
            score: 0.55,
            strengths: [],
            weaknesses: [],
            rejectionReasons: ["Erodes perceived food quality and triggers hygiene concern"],
            selected: false,
          },
        ],
      });
      hookDecisionId = decision.id;
      sampleTrace = (await repository.getTraceBySessionId(SESSION_1))!;
    });

    it("should assemble SIMPLE, STRATEGIC, and INTELLIGENCE depth explanations deterministically", () => {
      const expSimple = explanationService.generateExplanation(sampleTrace, hookDecisionId, "SIMPLE");
      const expStrategic = explanationService.generateExplanation(sampleTrace, hookDecisionId, "STRATEGIC");
      const expIntel = explanationService.generateExplanation(sampleTrace, hookDecisionId, "INTELLIGENCE");

      expect(expSimple.summary).toContain("We chose 'Stop Cooking Tonight - You Deserve A Break'");
      expect(expStrategic.summary).toContain("HOOK");
      expect(expIntel.summary).toContain("confidence score");
      expect(expIntel.whyNotAlternatives).toBeDefined();
      expect(expIntel.whyNotAlternatives![0].option).toBe("Cheapest Biryani in Kondapur!");
      expect(expIntel.whyNotAlternatives![0].whyNot).toContain("Erodes perceived food quality");
    });

    it("should generate decision sensitivity ('What Would Change This?') analysis", () => {
      const exp = explanationService.generateExplanation(sampleTrace, hookDecisionId, "INTELLIGENCE");

      expect(exp.whatWouldChangeThis).toBeDefined();
      expect(exp.whatWouldChangeThis!.length).toBeGreaterThan(0);
      expect(exp.whatWouldChangeThis![0].factor).toBe("AUDIENCE");
    });
  });

  describe("5. Validation & Multi-Tenant Security (ExplanationValidator)", () => {
    it("should pass validation when evidence is truthful and tenant ID matches", async () => {
      const decision = await traceService.recordDecision({
        sessionId: SESSION_1,
        campaignId: CAMPAIGN_1,
        tenantId: TENANT_A,
        decisionType: "CTA",
        selectedName: "Order Now on WhatsApp",
        primaryReason: "Reduces friction to single-tap order.",
        evidence: [
          { type: "BUSINESS_FACT", scope: "KNOWN", claim: "WhatsApp primary channel", strength: "STRONG", confidence: 0.9 },
        ],
      });

      const trace = (await repository.getTraceBySessionId(SESSION_1))!;
      const exp = explanationService.generateExplanation(trace, decision.id, "STRATEGIC");

      const result = validator.validateExplanation(exp, trace, TENANT_A);
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should reject explanation with tenant mismatch or cross-tenant leakage", async () => {
      const decision = await traceService.recordDecision({
        sessionId: SESSION_1,
        campaignId: CAMPAIGN_1,
        tenantId: TENANT_A,
        decisionType: "CTA",
        selectedName: "Call Us",
        primaryReason: "Leaked data from tenant_retail_bangalore",
      });

      const trace = (await repository.getTraceBySessionId(SESSION_1))!;
      const exp = explanationService.generateExplanation(trace, decision.id, "STRATEGIC");

      const result = validator.validateExplanation(exp, trace, TENANT_B);
      expect(result.isValid).toBe(false);
      expect(result.violations.some((v) => v.includes("Tenant Isolation Failure"))).toBe(true);
    });

    it("should fail validation if explanation references non-existent hallucinated evidence claims", async () => {
      const decision = await traceService.recordDecision({
        sessionId: SESSION_1,
        campaignId: CAMPAIGN_1,
        tenantId: TENANT_A,
        decisionType: "COPY",
        selectedName: "Standard Copy",
        primaryReason: "Reasoning",
      });

      const trace = (await repository.getTraceBySessionId(SESSION_1))!;
      const exp = explanationService.generateExplanation(trace, decision.id, "STRATEGIC");

      // Inject fake hallucinated claim
      exp.evidenceBreakdown.push({
        scope: "KNOWN",
        claim: "Hallucinated sales spike in 2021",
      });

      const result = validator.validateExplanation(exp, trace, TENANT_A);
      expect(result.isValid).toBe(false);
      expect(result.violations.some((v) => v.includes("Truth Alignment Failure"))).toBe(true);
    });
  });

  describe("6. Human Overrides (UserOverrideService)", () => {
    it("should record user overrides when humans choose alternative directions", async () => {
      const overrideRecord: UserOverrideRecord = {
        id: "ovr_1",
        decisionId: "dec_tension_1",
        tenantId: TENANT_A,
        originalSelection: "Dinner Decision Fatigue",
        userSelection: "Weekend Special Treat",
        reason: "We want to focus marketing on Friday night luxury dining experience.",
        createdAt: new Date().toISOString(),
      };

      await overrideService.recordOverride(overrideRecord);
      const tenantOverrides = await overrideService.getOverridesForTenant(TENANT_A);

      expect(tenantOverrides).toHaveLength(1);
      expect(tenantOverrides[0].userSelection).toBe("Weekend Special Treat");
      expect(tenantOverrides[0].reason).toContain("luxury dining experience");
    });
  });

  describe("7. Explainability Master Facade (ExplainabilityService)", () => {
    let decisionId: string;

    beforeEach(async () => {
      const decision = await traceService.recordDecision({
        sessionId: SESSION_1,
        campaignId: CAMPAIGN_1,
        tenantId: TENANT_A,
        decisionType: "OPPORTUNITY",
        selectedItemId: "opp_dinner_relief",
        selectedName: "Zero-Prep Evening Meal Delivery",
        primaryReason: "Capitalizes on untapped weekday evening delivery demand in IT corridor.",
        inputs: [{ type: "BUSINESS_BRAIN", value: "Hyderabad", importance: 0.9 }],
        evidence: [
          { type: "BUSINESS_FACT", scope: "KNOWN", claim: "Kondapur delivery volume peaks at 8 PM", strength: "STRONG", confidence: 0.9 },
        ],
        alternatives: [
          {
            id: "alt_lunch",
            name: "Corporate Lunch Catering",
            score: 0.62,
            strengths: [],
            weaknesses: [],
            rejectionReasons: ["Requires high upfront B2B sales effort"],
            selected: false,
          },
        ],
      });
      decisionId = decision.id;
    });

    it("should explain decision via facade for authorized tenant", async () => {
      const exp = await explainabilityService.explainDecision(SESSION_1, TENANT_A, decisionId, "STRATEGIC");

      expect(exp.decisionId).toBe(decisionId);
      expect(exp.summary).toContain("Zero-Prep Evening Meal Delivery");
    });

    it("should throw security error when unauthorized tenant attempts to query session trace", async () => {
      await expect(
        explainabilityService.explainDecision(SESSION_1, TENANT_B, decisionId, "STRATEGIC")
      ).rejects.toThrow("Tenant Security Exception");
    });

    it("should explain alternative rejection ('Why Not?') via facade", async () => {
      const rejection = await explainabilityService.explainRejection(
        SESSION_1,
        TENANT_A,
        decisionId,
        "Corporate Lunch Catering"
      );

      expect(rejection).toContain("was rejected in favor of 'Zero-Prep Evening Meal Delivery'");
      expect(rejection).toContain("Requires high upfront B2B sales effort");
    });

    it("should fetch reasoning DAG via facade", async () => {
      const graph = await explainabilityService.getReasoningGraph(SESSION_1, TENANT_A);
      expect(graph.nodes).toHaveLength(1);
      expect(graph.nodes[0].id).toBe(decisionId);
    });
  });
});
