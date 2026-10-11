import { createCreativeLineage } from "../learningLoop/lineage";
import { normalizePerformanceEvidence, type RawPerformanceInput } from "../learningLoop/evidence";
import { ContextualBaselineService, CreativePerformanceAnalyzer } from "../learningLoop/analysis";
import { LearningValidationEngine } from "../learningLoop/validation";
import { buildBankUpdate } from "../learningLoop/bank";
import { CreativeLearningService } from "../learningLoop/retrieval";
import { ActiveLearningEngine } from "../learningLoop/activeLearning";
import { PeriodicLearningJob } from "../learningLoop/jobs";
import { FirestoreLearningLoopRepository } from "../learningLoop/persistence";
import type { CreativeLineage, NormalizedPerformanceEvidence } from "../types/learningLoop";


describe("Phase 10.27 — Creative Learning Loop", () => {
  const sampleLineageInput = {
    campaignId: "camp_101",
    tenantId: "tenant_salon_a",
    businessId: "biz_salon_a",
    conceptId: "concept_trans_proof",
    mechanismIds: ["mech_transformation_proof", "mech_uncertainty_reduction"],
    psychologicalPrincipleIds: ["psych_social_proof"],
    objective: "CONVERSION" as any,
    executionFormat: "REEL" as any,
    platform: "INSTAGRAM" as any,
    industry: "SALON",
  };

  const sampleRawEvidence: RawPerformanceInput = {
    campaignId: "camp_101",
    tenantId: "tenant_salon_a",
    businessId: "biz_salon_a",
    mechanismIds: ["mech_transformation_proof", "mech_uncertainty_reduction"],
    platform: "INSTAGRAM" as any,
    format: "REEL" as any,
    objective: "CONVERSION" as any,
    industry: "SALON",
    impressions: 10000,
    clicks: 400,
    conversions: 40,
    spend: 200,
    revenue: 1000,
    saves: 150,
    shares: 80,
    source: "PLATFORM_API",
    periodStart: "2026-10-01T00:00:00Z",
    periodEnd: "2026-10-07T00:00:00Z",
  };

  test("1. Lineage Tracing & Attribution", () => {
    const lineage = createCreativeLineage(sampleLineageInput);

    expect(lineage.lineageId).toBeDefined();
    expect(lineage.campaignId).toBe("camp_101");
    expect(lineage.mechanismIds).toContain("mech_transformation_proof");
    expect(lineage.industry).toBe("SALON");
    expect(lineage.generatedAt).toBeDefined();
  });

  test("2. Metric Normalization & Invariant (undefined !== 0)", () => {
    const rawWithoutLeads: RawPerformanceInput = {
      ...sampleRawEvidence,
      leads: undefined, // Explicitly missing
    };

    const norm = normalizePerformanceEvidence(rawWithoutLeads);

    expect(norm.ctr).toBe(0.04); // 400 / 10000
    expect(norm.conversionRate).toBe(0.1); // 40 / 400
    expect(norm.revenuePerSpend).toBe(5.0); // 1000 / 200
    expect(norm.costPerLead).toBeUndefined(); // Missing metric remains undefined!
  });

  test("3. Contextual Baseline & Relative Lift Calculation", () => {
    const norm = normalizePerformanceEvidence(sampleRawEvidence);
    const baselineService = new ContextualBaselineService();

    const baseline = baselineService.calculateBaseline([norm], "ctr", {
      industry: "SALON",
      objective: "CONVERSION",
    });

    expect(baseline.baselineValue).toBe(0.04);

    const lift = baselineService.calculateRelativeLift(0.06, 0.04);
    expect(lift).toBe(0.5); // +50% lift
  });

  test("4. Positive Mechanism Pattern Detection", () => {
    const analyzer = new CreativePerformanceAnalyzer();
    const lineageList: CreativeLineage[] = [];
    const evidenceList: NormalizedPerformanceEvidence[] = [];

    // Baseline evidence (standard conversionRate = 0.05)
    for (let b = 1; b <= 5; b++) {
      const bId = `camp_base_${b}`;
      evidenceList.push(
        normalizePerformanceEvidence({
          ...sampleRawEvidence,
          campaignId: bId,
          mechanismIds: ["mech_baseline"],
          clicks: 400,
          conversions: 20,
        })
      );
    }

    // High performance test evidence (conversionRate = 0.15, +200% lift)
    for (let i = 1; i <= 6; i++) {
      const campId = `camp_pos_${i}`;
      lineageList.push(createCreativeLineage({ ...sampleLineageInput, campaignId: campId }));
      evidenceList.push(
        normalizePerformanceEvidence({
          ...sampleRawEvidence,
          campaignId: campId,
          clicks: 400,
          conversions: 60,
        })
      );
    }

    const output = analyzer.analyze({ lineageRecords: lineageList, evidenceRecords: evidenceList });

    expect(output.learnings.length).toBeGreaterThan(0);
    const positiveLearning = output.learnings.find((l) => l.mechanismId === "mech_transformation_proof");
    expect(positiveLearning).toBeDefined();
    expect(positiveLearning?.sampleSize).toBe(6);
    expect(positiveLearning?.confidenceScore).toBeGreaterThan(0.6);
  });

  test("5. Negative Failure Pattern Detection", () => {
    const analyzer = new CreativePerformanceAnalyzer();
    const lineageList: CreativeLineage[] = [];
    const evidenceList: NormalizedPerformanceEvidence[] = [];

    // Baseline evidence (standard conversionRate = 0.10)
    for (let b = 1; b <= 5; b++) {
      evidenceList.push(
        normalizePerformanceEvidence({
          ...sampleRawEvidence,
          campaignId: `camp_base_${b}`,
          mechanismIds: ["mech_baseline"],
          clicks: 400,
          conversions: 40,
        })
      );
    }

    // Low performance test evidence (conversions = 2, conversionRate = 0.005, -95% lift)
    for (let i = 1; i <= 4; i++) {
      const campId = `camp_fail_${i}`;
      lineageList.push(
        createCreativeLineage({
          ...sampleLineageInput,
          campaignId: campId,
          mechanismIds: ["mech_discount_urgency"],
        })
      );
      evidenceList.push(
        normalizePerformanceEvidence({
          ...sampleRawEvidence,
          campaignId: campId,
          mechanismIds: ["mech_discount_urgency"],
          clicks: 400,
          conversions: 2,
        })
      );
    }


    const output = analyzer.analyze({ lineageRecords: lineageList, evidenceRecords: evidenceList });

    expect(output.failures.length).toBeGreaterThan(0);
    expect(output.failures[0].mechanismId).toBe("mech_discount_urgency");
    expect(output.failures[0].avoidContext.industry).toBe("SALON");
  });

  test("6. Combination Mechanism Effect Detection", () => {
    const analyzer = new CreativePerformanceAnalyzer();
    const lineageList: CreativeLineage[] = [];
    const evidenceList: NormalizedPerformanceEvidence[] = [];

    // Baseline evidence (standard CTR = 0.04)
    for (let b = 1; b <= 5; b++) {
      evidenceList.push(
        normalizePerformanceEvidence({
          ...sampleRawEvidence,
          campaignId: `camp_base_${b}`,
          mechanismIds: ["mech_baseline"],
          clicks: 400,
        })
      );
    }

    // Combo high performance evidence (CTR = 0.08, +100% lift)
    for (let i = 1; i <= 3; i++) {
      const campId = `camp_combo_${i}`;
      lineageList.push(
        createCreativeLineage({
          ...sampleLineageInput,
          campaignId: campId,
          mechanismIds: ["mech_trans_proof", "mech_social_proof"],
        })
      );
      evidenceList.push(
        normalizePerformanceEvidence({
          ...sampleRawEvidence,
          campaignId: campId,
          mechanismIds: ["mech_trans_proof", "mech_social_proof"],
          clicks: 800,
        })
      );
    }

    const output = analyzer.analyze({ lineageRecords: lineageList, evidenceRecords: evidenceList });

    expect(output.combinations.length).toBeGreaterThan(0);
    expect(output.combinations[0].primaryMechanismId).toBeDefined();
    expect(output.combinations[0].secondaryMechanismId).toBeDefined();
    expect(output.combinations[0].combinedLift).toBeGreaterThan(0);
  });


  test("7. Deterministic Confidence Score Calculation", () => {
    const analyzer = new CreativePerformanceAnalyzer();
    const conf = analyzer.calculateConfidence(10, 0.4, 0.9, 0.9, 0.85, 0.95);

    expect(conf).toBeGreaterThan(0.75);
    expect(conf).toBeLessThanOrEqual(1.0);
  });

  test("8. Validation Lifecycle Engine", () => {
    const validationEngine = new LearningValidationEngine();
    const now = new Date().toISOString();

    const initialLearning = {
      learningId: "learn_1",
      scope: "INDUSTRY" as any,
      mechanismId: "mech_transformation_proof",
      learningType: "PERFORMANCE_PATTERN" as any,
      observation: "Observed high lift",
      hypothesis: "Hypothesis statement",
      insight: "Insight statement",
      recommendation: "Recommendation statement",
      supportingEvidence: [],
      sampleSize: 6,
      confidenceScore: 0.85,
      evidenceStrength: "STRONG" as any,
      relativeLift: 0.35,
      status: "EMERGING" as any,
      context: { industry: "SALON", objective: "CONVERSION" as any },
      firstObservedAt: now,
      lastObservedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const evaluated = validationEngine.evaluateLifecycle(initialLearning);
    expect(evaluated.status).toBe("VALIDATED");
    expect(evaluated.lastValidatedAt).toBeDefined();
  });

  test("9. Creative Bank Update Contract Building", () => {
    const now = new Date().toISOString();
    const validatedLearning = {
      learningId: "learn_val_1",
      scope: "INDUSTRY" as any,
      mechanismId: "mech_transformation_proof",
      learningType: "PERFORMANCE_PATTERN" as any,
      observation: "Observed lift",
      hypothesis: "Hypothesis",
      insight: "Insight",
      recommendation: "Recommendation",
      supportingEvidence: [{ evidenceId: "ev_1", campaignId: "c1", observedLift: 0.3, metric: "ctr", confidence: "HIGH" as any, collectedAt: now }],
      sampleSize: 6,
      confidenceScore: 0.85,
      evidenceStrength: "STRONG" as any,
      relativeLift: 0.35,
      status: "VALIDATED" as any,
      context: { industry: "SALON" },
      firstObservedAt: now,
      lastObservedAt: now,
      lastValidatedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const update = buildBankUpdate(validatedLearning);

    expect(update).not.toBeNull();
    expect(update?.mechanismId).toBe("mech_transformation_proof");
    expect(update?.updateType).toBe("INCREASE_CONFIDENCE");
    expect(update?.evidenceIds).toContain("ev_1");
  });

  test("10. Learning Retrieval & Priority Ranking", () => {
    const retrievalService = new CreativeLearningService();
    const now = new Date().toISOString();

    const learningA = {
      learningId: "l_a",
      scope: "INDUSTRY" as any,
      mechanismId: "mech_a",
      learningType: "PERFORMANCE_PATTERN" as any,
      observation: "Strong obs",
      hypothesis: "Hyp",
      insight: "Ins",
      recommendation: "Rec",
      supportingEvidence: [],
      sampleSize: 8,
      confidenceScore: 0.9,
      evidenceStrength: "STRONG" as any,
      relativeLift: 0.4,
      status: "VALIDATED" as any,
      context: { industry: "SALON", objective: "CONVERSION" as any },
      firstObservedAt: now,
      lastObservedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const intelContext = retrievalService.getCreativeIntelligenceContext([learningA], [], {
      industry: "SALON",
      objective: "CONVERSION",
    });

    expect(intelContext.relevantLearnings.length).toBe(1);
    expect(intelContext.strongMechanisms.length).toBe(1);
    expect(intelContext.strongMechanisms[0].mechanismId).toBe("mech_a");
  });

  test("11. Active Learning Experiment Suggestion", () => {
    const activeEngine = new ActiveLearningEngine();
    const now = new Date().toISOString();

    const validatedLearning = {
      learningId: "l_val",
      scope: "INDUSTRY" as any,
      mechanismId: "mech_val",
      learningType: "PERFORMANCE_PATTERN" as any,
      observation: "Obs",
      hypothesis: "Hyp",
      insight: "Ins",
      recommendation: "Rec",
      supportingEvidence: [],
      sampleSize: 8,
      confidenceScore: 0.9,
      evidenceStrength: "STRONG" as any,
      status: "VALIDATED" as any,
      context: { industry: "SALON" },
      firstObservedAt: now,
      lastObservedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const emergingLearning = {
      ...validatedLearning,
      learningId: "l_emg",
      mechanismId: "mech_emg",
      status: "EMERGING" as any,
    };

    const suggestions = activeEngine.generateExperimentSuggestions(
      [validatedLearning, emergingLearning],
      ["mech_val", "mech_emg"]
    );

    expect(suggestions.length).toBe(1);
    expect(suggestions[0].targetMechanismA).toBe("mech_val");
    expect(suggestions[0].targetMechanismB).toBe("mech_emg");
  });

  test("12. Periodic Learning Job Runner & Multi-Tenant Isolation", async () => {
    const job = new PeriodicLearningJob();
    const repo = new FirestoreLearningLoopRepository();

    const lineage = createCreativeLineage(sampleLineageInput);
    const evidence = normalizePerformanceEvidence(sampleRawEvidence);

    await repo.saveLineage(lineage);
    await repo.saveEvidence(evidence);

    const result = job.runJob([lineage], [evidence]);

    expect(result.run.status).toBe("COMPLETED");
    expect(result.run.campaignsAnalyzed).toBe(1);
    expect(result.run.performanceRecordsAnalyzed).toBe(1);

    // Multi-Tenant Isolation Test
    const tenantAEvidence = await repo.listEvidenceByTenant("tenant_salon_a");
    const tenantBEvidence = await repo.listEvidenceByTenant("tenant_other");

    expect(tenantAEvidence.length).toBe(1);
    expect(tenantBEvidence.length).toBe(0); // Tenant isolation preserved!
  });
});
