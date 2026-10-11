import type {
  CreativeLearning,
  FailureLearning,
  MechanismCombinationLearning,
} from "../../types/learningLoop";
import type {
  CreativeIntelligenceReport,
  ReportPeriod,
  ReportType,
  ReportStatus,
  CreativeDNA,
  EvidenceSummary,
  ConfidenceOverview,
} from "../../types/reports";
import { InsightExtractor } from "../sections/insightExtractor";
import { ExecutiveSummaryGenerator } from "../sections/executiveSummaryGenerator";
import { SectionBuilder } from "../sections/sectionBuilder";
import { CreativeDnaBuilder } from "../sections/creativeDnaBuilder";
import { ReportClaimValidator } from "../validation/reportClaimValidator";
import { FirestoreReportRepository } from "../persistence/firestoreReportRepository";

export interface GenerateReportOptions {
  tenantId: string;
  period?: ReportPeriod;
  reportType?: ReportType;
  learnings?: CreativeLearning[];
  failures?: FailureLearning[];
  combinations?: MechanismCombinationLearning[];
  sampleSize?: number;
}

/**
 * Phase 10.28 — Creative Intelligence Report Service
 *
 * Master orchestrator that consumes Phase 10.27 validated learnings and produces
 * clear, actionable, confidence-aware Creative Intelligence Reports.
 */
export class CreativeIntelligenceReportService {
  constructor(private repository: FirestoreReportRepository = new FirestoreReportRepository()) {}

  /**
   * Generates a Creative Intelligence Report from validated learnings.
   */
  async generateReport(options: GenerateReportOptions): Promise<CreativeIntelligenceReport> {
    const tenantId = options.tenantId;
    const period = options.period || "MONTHLY";
    const reportType = options.reportType || "MONTHLY";

    const learnings = options.learnings || [];
    const failures = options.failures || [];
    const combinations = options.combinations || [];
    const sampleSize = options.sampleSize !== undefined ? options.sampleSize : learnings.length;

    const reportId = `report_${tenantId}_${Date.now()}`;
    const now = new Date().toISOString();

    // 1. Extract Insights from validated learnings
    const validatedLearnings = learnings.filter((l) => l.status === "VALIDATED");
    const topInsights = validatedLearnings.slice(0, 5).map((l) => InsightExtractor.fromLearning(l, "MECHANISM"));

    const failureInsights = SectionBuilder.buildFailureInsights(failures);
    const winningMechanisms = SectionBuilder.buildWinningMechanisms(validatedLearnings);
    const audienceInsights = SectionBuilder.buildAudienceInsights(validatedLearnings);
    const formatInsights = SectionBuilder.buildFormatInsights(validatedLearnings);
    const offerInsights = SectionBuilder.buildOfferInsights(validatedLearnings);
    const platformInsights = SectionBuilder.buildPlatformInsights(validatedLearnings);
    const emergingPatterns = SectionBuilder.buildEmergingPatterns(learnings);
    const fatigueAlerts = SectionBuilder.buildCreativeFatigueAlerts(learnings);
    const newDiscoveries = SectionBuilder.buildNewDiscoveries(combinations);

    // 2. Build Recommendations (3-5 items)
    const recommendations = SectionBuilder.buildRecommendations(winningMechanisms, failureInsights, combinations);

    // 3. Generate Executive Summary
    const executiveSummary = ExecutiveSummaryGenerator.generate(
      topInsights,
      failures,
      sampleSize,
      period === "MONTHLY" ? "This Month" : "This Period"
    );

    // 4. Build Evidence Summary & Confidence Overview
    const evidenceSummary: EvidenceSummary = {
      totalCampaignsAnalyzed: sampleSize,
      totalLearningsAnalyzed: learnings.length,
      validatedLearningsCount: validatedLearnings.length,
      emergingLearningsCount: emergingPatterns.length,
      decayingLearningsCount: fatigueAlerts.length,
      sampleSizeRange: { min: Math.min(sampleSize, 1), max: Math.max(sampleSize, 12) },
      timeRange: { start: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), end: now },
    };

    const avgConf = validatedLearnings.length > 0
      ? validatedLearnings.reduce((sum, l) => sum + l.confidenceScore, 0) / validatedLearnings.length
      : 0.5;

    const confidenceOverview: ConfidenceOverview = {
      overallConfidence: Number(avgConf.toFixed(4)),
      confidenceBreakdown: {
        MECHANISM: avgConf,
        AUDIENCE: 0.8,
        FORMAT: 0.75,
      },
      dataSufficiency: sampleSize < 3 ? "INSUFFICIENT" : sampleSize < 8 ? "MODERATE" : "HIGH",
    };

    // 5. Build Creative DNA
    const creativeDNA = CreativeDnaBuilder.build(tenantId, learnings, combinations);

    const status: ReportStatus = executiveSummary.isLearningMode ? "LEARNING_MODE" : "READY";

    const report: CreativeIntelligenceReport = {
      id: reportId,
      tenantId,
      period,
      periodRange: { start: evidenceSummary.timeRange.start, end: now },
      reportType,
      status,
      executiveSummary,
      topInsights,
      winningMechanisms,
      audienceInsights,
      formatInsights,
      offerInsights,
      platformInsights,
      failureInsights,
      emergingPatterns,
      creativeFatigueAlerts: fatigueAlerts,
      newDiscoveries,
      recommendations,
      experiments: [],
      creativeDNA,
      confidenceOverview,
      evidenceSummary,
      sourceLearningIds: learnings.map((l) => l.learningId),
      generatedAt: now,
      version: 1,
    };

    // 6. Validate report claims deterministically
    const validation = ReportClaimValidator.validate(report, learnings);

    if (!validation.isValid && status !== "LEARNING_MODE") {
      report.status = "PARTIAL";
    }

    // 7. Store report & DNA
    await this.repository.saveReport(report);
    await this.repository.saveCreativeDNA(creativeDNA);

    return report;
  }

  /**
   * Retrieves the latest report for a tenant
   */
  async getLatestReport(tenantId: string): Promise<CreativeIntelligenceReport | null> {
    return this.repository.getLatestReport(tenantId);
  }

  /**
   * Retrieves report by ID
   */
  async getReportById(tenantId: string, reportId: string): Promise<CreativeIntelligenceReport | null> {
    return this.repository.getReportById(tenantId, reportId);
  }

  /**
   * Retrieves Creative DNA for a tenant
   */
  async getCreativeDNA(tenantId: string): Promise<CreativeDNA | null> {
    return this.repository.getCreativeDNA(tenantId);
  }
}
