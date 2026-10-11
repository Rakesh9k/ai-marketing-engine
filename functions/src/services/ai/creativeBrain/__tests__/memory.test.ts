import {
  calculateDerivedMetrics,
  evaluatePerformanceScore,
  getObjectivePolicy,
  ingestCreativePerformance,
} from "../memory/performance";
import {
  buildCreativeMemory,
  calculateGeneralization,
  evaluateLearningCandidates,
} from "../memory/engine";
import {
  calculateNoveltySignal,
  explainCreativeMemory,
  extractHistoricalSignals,
  scoreContextualPerformance,
} from "../memory/retrieval";
import { FirestoreCreativeMemoryRepository } from "../memory/persistence";
import type { PerformanceIngestionInput } from "../types/memory";

describe("Phase 10.26 — Creative Memory & Learning Layer", () => {
  const sampleInput: PerformanceIngestionInput = {
    tenantId: "tenant_123",
    businessId: "biz_456",
    creativeId: "cr_789",
    creativeVersionId: "v1.0",
    platform: "INSTAGRAM" as any,
    format: "REEL" as any,
    objective: "LEAD_GENERATION" as any,
    business: {
      industry: "RESTAURANT",
      location: { city: "Kondapur", region: "Hyderabad" },
    } as any,
    attribution: {
      recipeId: "rec_family_dinner",
      mechanismIds: ["mech_convenience"],
      psychologyIds: ["psych_emotion"],
      hookId: "hook_tired_cooking",
      storyId: "story_weekend_dinner",
      visualId: "vis_warm_lighting",
      styleId: "style_authentic",
      ctaId: "cta_whatsapp_now",
    },
    metrics: {
      impressions: 10000,
      views: 8000,
      threeSecondViews: 5000,
      saves: 200,
      shares: 100,
      clicks: 400,
      whatsappConversations: 80,
      leads: 40,
    },
    measurementWindow: {
      start: "2026-10-01T00:00:00Z",
      end: "2026-10-07T00:00:00Z",
      durationHours: 144,
    },
    source: "PLATFORM_API",
  };


  test("1. Invariant: undefined !== 0 in raw & derived metrics", () => {
    const rawMetricsWithoutRevenue = {
      impressions: 1000,
      clicks: 50,
      revenue: undefined, // Explicitly missing
    };

    const derived = calculateDerivedMetrics(rawMetricsWithoutRevenue);

    // Derived metric for revenuePerImpression should NOT exist (omitted, not 0)
    const revPerImp = derived.find((d) => d.metric === "revenuePerImpression");
    expect(revPerImp).toBeUndefined();

    // CTR should be calculated correctly
    const ctr = derived.find((d) => d.metric === "clickThroughRate");
    expect(ctr).toBeDefined();
    expect(ctr?.value).toBe(0.05);
  });

  test("2. Deterministic derived metric calculation", () => {
    const derived = calculateDerivedMetrics(sampleInput.metrics);

    const holdRate = derived.find((d) => d.metric === "threeSecondHoldRate");
    const ctr = derived.find((d) => d.metric === "clickThroughRate");
    const waRate = derived.find((d) => d.metric === "whatsappConversionRate");

    expect(holdRate?.value).toBe(0.5); // 5000 / 10000
    expect(ctr?.value).toBe(0.04); // 400 / 10000
    expect(waRate?.value).toBe(0.2); // 80 / 400
  });

  test("3. Immutable attribution & performance ingestion", () => {
    const perf = ingestCreativePerformance(sampleInput);

    expect(perf.performanceId).toBeDefined();
    expect(perf.tenantId).toBe("tenant_123");
    expect(perf.recipeId).toBe("rec_family_dinner");
    expect(perf.mechanismIds).toContain("mech_convenience");
    expect(perf.industry).toBe("RESTAURANT");
    expect(perf.performanceScore).toBeGreaterThan(0);
    expect(perf.learningConfidence).toBe("HIGH");
  });

  test("4. Objective-aware performance scoring", () => {
    const metricsContainer = {
      derived: calculateDerivedMetrics(sampleInput.metrics),
      measurementWindow: sampleInput.measurementWindow,
    };

    const leadGenPolicy = getObjectivePolicy("LEAD_GENERATION" as any);
    expect(leadGenPolicy.primaryMetrics[0].metric).toBe("leadConversionRate");

    const scoreLeadGen = evaluatePerformanceScore(metricsContainer, "LEAD_GENERATION" as any);
    const scoreAwareness = evaluatePerformanceScore(metricsContainer, "AWARENESS" as any);

    expect(scoreLeadGen).toBeGreaterThan(0);
    expect(scoreAwareness).toBeGreaterThan(0);
  });

  test("5. Creative memory interpretation (ASSOCIATED invariant)", () => {
    const perf = ingestCreativePerformance(sampleInput);
    const memory = buildCreativeMemory([perf], "MECHANISM", ["mech_convenience"]);

    expect(memory.memoryId).toBeDefined();
    expect(memory.subjectType).toBe("MECHANISM");
    expect(memory.subjectIds).toContain("mech_convenience");
    expect(memory.relationship).toBe("ASSOCIATED"); // Hard invariant: ASSOCIATED, not CAUSAL
    expect(memory.observation).toContain("mech_convenience");
  });

  test("6. Generalization scoring across contexts", () => {
    const perf1 = ingestCreativePerformance(sampleInput);
    const perf2 = ingestCreativePerformance({
      ...sampleInput,
      businessId: "biz_999",
      business: { industry: "RESTAURANT", location: { city: "Gachibowli" } } as any,
      platform: "FACEBOOK" as any,
    });

    const generalization = calculateGeneralization([perf1, perf2]);

    expect(generalization.businessDiversity).toBeGreaterThan(0.2);
    expect(generalization.platformDiversity).toBeGreaterThan(0.25);
    expect(generalization.overall).toBeGreaterThan(0);
  });

  test("7. Retrieval & historical performance signal extraction", () => {
    const perf = ingestCreativePerformance(sampleInput);
    const memory = buildCreativeMemory([perf], "MECHANISM", ["mech_convenience"]);

    const signals = extractHistoricalSignals([memory], {
      industry: "RESTAURANT",
      objective: "LEAD_GENERATION" as any,
    });

    expect(signals.length).toBe(1);
    expect(signals[0].componentId).toBe("mech_convenience");
    expect(signals[0].recency).toBeGreaterThan(0);
  });

  test("8. Novelty & fatigue signal calculation", () => {
    const freshSignal = calculateNoveltySignal("comp_fresh", { totalCount: 1, recent14DayCount: 0 });
    const fatiguedSignal = calculateNoveltySignal("comp_fatigued", { totalCount: 15, recent14DayCount: 5 });

    expect(freshSignal.noveltyScore).toBe(1.0);
    expect(fatiguedSignal.noveltyScore).toBeLessThan(0.3);
    expect(fatiguedSignal.performanceDecay).toBeGreaterThan(0.7);
  });

  test("9. Creative Bank protection invariant (Candidate status)", () => {
    const perf = ingestCreativePerformance(sampleInput);
    const memory = buildCreativeMemory([perf, perf, perf, perf, perf], "RECIPE", ["rec_family_dinner"]);
    memory.confidence = "HIGH" as any;
    memory.generalization.overall = 0.8;


    const candidates = evaluateLearningCandidates([memory]);

    expect(candidates.length).toBe(1);
    expect(candidates[0].status).toBe("CANDIDATE"); // Never directly modifies Bank!
    expect(candidates[0].subjectIds).toContain("rec_family_dinner");
  });

  test("10. Governance hard gate invariant overrides performance score", () => {
    const perf = ingestCreativePerformance(sampleInput);
    const memory = buildCreativeMemory([perf], "MECHANISM", ["mech_convenience"]);
    const signals = extractHistoricalSignals([memory], { industry: "RESTAURANT" });
    const novelty = calculateNoveltySignal("mech_convenience", { totalCount: 1, recent14DayCount: 0 });

    // When governance passes
    const scorePass = scoreContextualPerformance(signals[0], novelty, 0.9, true);
    expect(scorePass.finalSignal).toBeGreaterThan(0);

    // When governance FAILS
    const scoreFail = scoreContextualPerformance(signals[0], novelty, 0.9, false);
    expect(scoreFail.finalSignal).toBe(0.0); // Hard 0.0 lock!
  });

  test("11. Repository tenant isolation", async () => {
    const repo = new FirestoreCreativeMemoryRepository();
    const perf = ingestCreativePerformance(sampleInput);

    await repo.savePerformance(perf);
    const retrieved = await repo.getPerformance("tenant_123", perf.performanceId);
    const otherTenant = await repo.getPerformance("tenant_other", perf.performanceId);

    expect(retrieved).not.toBeNull();
    expect(otherTenant).toBeNull();
  });

  test("12. Structured explanation generation", () => {
    const perf = ingestCreativePerformance(sampleInput);
    const memory = buildCreativeMemory([perf], "MECHANISM", ["mech_convenience"]);
    const explanation = explainCreativeMemory(memory);

    expect(explanation.memoryId).toBe(memory.memoryId);
    expect(explanation.conclusion).toBeDefined();
    expect(explanation.recommendation).toBeDefined();
  });
});
