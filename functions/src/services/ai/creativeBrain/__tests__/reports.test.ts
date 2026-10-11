import { ConfidenceLanguageEngine } from "../reporting/narrative/confidenceLanguage";
import { AiReportNarrator } from "../reporting/narrative/aiReportNarrator";
import { InsightExtractor } from "../reporting/sections/insightExtractor";
import { ExecutiveSummaryGenerator } from "../reporting/sections/executiveSummaryGenerator";
import { SectionBuilder } from "../reporting/sections/sectionBuilder";
import { CreativeDnaBuilder } from "../reporting/sections/creativeDnaBuilder";
import { ReportClaimValidator } from "../reporting/validation/reportClaimValidator";
import { ReportActionBridge } from "../reporting/service/reportActionBridge";
import { FirestoreReportRepository } from "../reporting/persistence/firestoreReportRepository";
import { CreativeIntelligenceReportService } from "../reporting/service/creativeIntelligenceReportService";
import type { CreativeLearning, FailureLearning, MechanismCombinationLearning } from "../types/learningLoop";

describe("Phase 10.28 — Creative Intelligence Reports", () => {
  let repository: FirestoreReportRepository;
  let reportService: CreativeIntelligenceReportService;

  beforeEach(() => {
    repository = new FirestoreReportRepository();
    reportService = new CreativeIntelligenceReportService(repository);
  });

  const mockValidatedLearning: CreativeLearning = {
    learningId: "learn_convenience_01",
    mechanismId: "convenience",
    scope: "TENANT",
    learningType: "PERFORMANCE_PATTERN",
    observation: "Convenience-led positioning generated high conversion.",
    hypothesis: "Convenience positioning reduces decision friction.",
    insight: "Families value decision simplification.",
    recommendation: "Scale convenience messaging.",
    supportingEvidence: [],
    sampleSize: 12,
    confidenceScore: 0.88,
    evidenceStrength: "VERY_STRONG",
    status: "VALIDATED",
    relativeLift: 0.41,
    recencyScore: 0.95,
    context: { industry: "restaurant", objective: "CONVERSION", audienceId: "families" },
    firstObservedAt: new Date().toISOString(),
    lastObservedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockLocalIdentityLearning: CreativeLearning = {
    learningId: "learn_local_02",
    mechanismId: "local_identity",
    scope: "TENANT",
    learningType: "PERFORMANCE_PATTERN",
    observation: "Local references increased engagement.",
    hypothesis: "Local references build trust.",
    insight: "Local identity resonates strongly.",
    recommendation: "Use local landmarks and references.",
    supportingEvidence: [],
    sampleSize: 8,
    confidenceScore: 0.81,
    evidenceStrength: "STRONG",
    status: "VALIDATED",
    relativeLift: 0.29,
    recencyScore: 0.90,
    context: { industry: "restaurant", objective: "CONVERSION" },
    firstObservedAt: new Date().toISOString(),
    lastObservedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockFailureLearning: FailureLearning = {
    failureId: "fail_discount_01",
    scope: "TENANT",
    mechanismId: "discount_promotion",
    observedNegativeOutcome: "-18% conversion",
    reason: "Discount-led creatives generate attention but not qualified leads.",
    recommendedAlternatives: ["convenience", "proof"],
    evidenceCount: 7,
    confidenceScore: 0.78,
    avoidContext: { industry: "restaurant", objective: "CONVERSION" },
    createdAt: new Date().toISOString(),
  };

  const mockCombinationLearning: MechanismCombinationLearning = {
    combinationId: "combo_local_demo_01",
    scope: "TENANT",
    primaryMechanismId: "local_identity",
    secondaryMechanismId: "product_demonstration",
    combinedLift: 0.35,
    individualLifts: { local_identity: 0.20, product_demonstration: 0.15 },
    synergyMultiplier: 1.25,
    context: { industry: "restaurant", objective: "CONVERSION" },
    sampleSize: 6,
    confidenceScore: 0.83,
    status: "VALIDATED",
    createdAt: new Date().toISOString(),
  };

  test("1. Confidence Language Engine maps levels and rejects forbidden words", () => {
    expect(ConfidenceLanguageEngine.getConfidenceLevel(0.88)).toBe("VERY_STRONG");
    expect(ConfidenceLanguageEngine.getConfidenceLevel(0.75)).toBe("STRONG");
    expect(ConfidenceLanguageEngine.getConfidenceLevel(0.60)).toBe("MODERATE");
    expect(ConfidenceLanguageEngine.getConfidenceLevel(0.45)).toBe("WEAK");
    expect(ConfidenceLanguageEngine.getConfidenceLevel(0.20)).toBe("INSUFFICIENT");

    const forbidden = ConfidenceLanguageEngine.checkForbiddenWords("This strategy will always guaranteed work.");
    expect(forbidden).toContain("always");
    expect(forbidden).toContain("guaranteed");

    const sanitized = ConfidenceLanguageEngine.sanitizeText("Discount campaigns always fail.", 0.88);
    expect(sanitized).not.toContain("always");
    expect(sanitized).toContain("consistently");
  });

  test("2. AI Report Narrator formats structured intelligence without metric alteration", () => {
    const narrative = AiReportNarrator.generateWinningNarrative({
      mechanismOrPatternName: "Convenience",
      relativeLift: 0.41,
      sampleSize: 12,
      confidence: 0.88,
      audience: "families",
    });

    expect(narrative.statement).toContain("+41%");
    expect(narrative.statement).toContain("12 campaigns");
    expect(narrative.confidenceLanguage).toBe("VERY_STRONG");
    expect(narrative.recommendation).toContain("convenience");
  });

  test("3. Insight Extractor converts Phase 10.27 learnings into CreativeInsight objects", () => {
    const insight = InsightExtractor.fromLearning(mockValidatedLearning, "MECHANISM");
    expect(insight.id).toBe("insight_learn_convenience_01");
    expect(insight.category).toBe("MECHANISM");
    expect(insight.confidence).toBe(0.88);
    expect(insight.relativeLift).toBe(0.41);

    const failInsight = InsightExtractor.fromFailure(mockFailureLearning);
    expect(failInsight.category).toBe("FAILURE");
    expect(failInsight.relativeLift).toBe(-0.18);
  });

  test("4. Executive Summary Generator handles mature business report", () => {
    const topInsight = InsightExtractor.fromLearning(mockValidatedLearning, "MECHANISM");
    const summary = ExecutiveSummaryGenerator.generate([topInsight], [mockFailureLearning], 12, "This Month");

    expect(summary.isLearningMode).toBe(false);
    expect(summary.headline).toBe("Your Marketing This Month");
    expect(summary.workingWell.length).toBeGreaterThan(0);
    expect(summary.weakeningOrRethink.length).toBeGreaterThan(0);
    expect(summary.topRecommendation).toBeDefined();
  });

  test("5. Executive Summary Generator handles Low Data / Learning Mode (< 3 campaigns)", () => {
    const summary = ExecutiveSummaryGenerator.generate([], [], 2, "This Month");

    expect(summary.isLearningMode).toBe(true);
    expect(summary.headline).toContain("Mitra is still learning");
    expect(summary.topRecommendation).toContain("additional controlled campaigns");
  });

  test("6. Section Builder constructs Winning Mechanisms and Audience Insights", () => {
    const winning = SectionBuilder.buildWinningMechanisms([mockValidatedLearning, mockLocalIdentityLearning]);
    expect(winning.length).toBe(2);
    expect(winning[0].mechanismId).toBe("convenience");
    expect(winning[0].relativeLift).toBe(0.41);

    const audience = SectionBuilder.buildAudienceInsights([mockValidatedLearning]);
    expect(audience.length).toBe(1);
    expect(audience[0].audienceSegment).toBe("families");
  });

  test("7. Section Builder constructs Format Insights (Format x Mechanism)", () => {
    const formats = SectionBuilder.buildFormatInsights([mockValidatedLearning]);
    expect(formats.length).toBeGreaterThan(0);
    expect(formats[0].statement).toContain("Reels");
    expect(formats[0].winningMechanismId).toBe("convenience");
  });

  test("8. Section Builder constructs Prioritized Recommendations (3-5 items)", () => {
    const winning = SectionBuilder.buildWinningMechanisms([mockValidatedLearning]);
    const failures = SectionBuilder.buildFailureInsights([mockFailureLearning]);
    const recs = SectionBuilder.buildRecommendations(winning, failures, [mockCombinationLearning]);

    expect(recs.length).toBeGreaterThanOrEqual(3);
    expect(recs[0].priority).toBe(1);
    expect(recs[0].actionTitle.toLowerCase()).toContain("convenience");
    expect(recs[0].actionableContext.supportingLearningId).toBe("convenience");
  });

  test("9. Creative DNA Builder synthesizes Business Creative Profile", () => {
    const dna = CreativeDnaBuilder.build("tenant_123", [mockValidatedLearning, mockLocalIdentityLearning], [mockCombinationLearning]);

    expect(dna.tenantId).toBe("tenant_123");
    expect(dna.definingMechanisms).toContain("convenience");
    expect(dna.topCombinations.length).toBe(1);
    expect(dna.overallConfidence).toBeGreaterThan(0.80);
  });

  test("10. Deterministic Report Claim Validator validates good report and flags invalid claims", async () => {
    const report = await reportService.generateReport({
      tenantId: "tenant_123",
      period: "MONTHLY",
      learnings: [mockValidatedLearning, mockLocalIdentityLearning],
      failures: [mockFailureLearning],
      combinations: [mockCombinationLearning],
      sampleSize: 12,
    });

    const validation = ReportClaimValidator.validate(report, [mockValidatedLearning, mockLocalIdentityLearning]);
    expect(validation.isValid).toBe(true);
    expect(validation.invalidClaimsCount).toBe(0);
  });

  test("11. Report Claim Validator catches illegal causal language or missing evidence", () => {
    const badReport: any = {
      topInsights: [
        {
          statement: "Convenience caused 100% guaranteed growth.",
          evidenceCount: 1,
          confidence: 0.99,
          learningId: "non_existent_id",
        },
      ],
      recommendations: [],
    };

    const validation = ReportClaimValidator.validate(badReport, [mockValidatedLearning]);
    expect(validation.isValid).toBe(false);
    expect(validation.invalidClaimsCount).toBeGreaterThan(0);
  });

  test("12. Report Action Bridge connects [Use this insight] to Creative Brain context", () => {
    const insight = InsightExtractor.fromLearning(mockValidatedLearning, "MECHANISM");
    const directionContext = ReportActionBridge.buildCampaignContextFromInsight(insight);

    expect(directionContext.supportingLearningId).toBe("learn_convenience_01");
    expect(directionContext.recommendedMechanisms).toContain("convenience");
  });

  test("13. Report Action Bridge connects [Test this] to Active Learning Experiment", () => {
    const emerging = SectionBuilder.buildEmergingPatterns([
      { ...mockValidatedLearning, status: "EMERGING", confidenceScore: 0.55 },
    ])[0];

    const exp = ReportActionBridge.buildExperimentFromEmergingPattern(emerging);
    expect(exp.experimentId).toBe(`exp_${emerging.patternId}`);
    expect(exp.hypothesis).toContain("Testing");
  });

  test("14. End-to-End Report Service generates full report and persists to repository", async () => {
    const report = await reportService.generateReport({
      tenantId: "tenant_456",
      period: "MONTHLY",
      learnings: [mockValidatedLearning, mockLocalIdentityLearning],
      failures: [mockFailureLearning],
      combinations: [mockCombinationLearning],
      sampleSize: 15,
    });

    expect(report.id).toBeDefined();
    expect(report.tenantId).toBe("tenant_456");
    expect(report.status).toBe("READY");
    expect(report.winningMechanisms.length).toBe(2);
    expect(report.failureInsights.length).toBe(1);

    const retrieved = await reportService.getLatestReport("tenant_456");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(report.id);
  });

  test("15. Multi-Tenant Repository Isolation prevents cross-tenant data access", async () => {
    await reportService.generateReport({
      tenantId: "tenant_A",
      period: "MONTHLY",
      learnings: [mockValidatedLearning],
      sampleSize: 5,
    });

    const reportA = await reportService.getLatestReport("tenant_A");
    const reportB = await reportService.getLatestReport("tenant_B");

    expect(reportA).not.toBeNull();
    expect(reportB).toBeNull();
  });
});
