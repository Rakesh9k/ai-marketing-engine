import type { ConfidenceLevel } from "../../types/enums";
import type {
  CreativePerformance,
  CreativePerformanceMetrics,
  PerformanceIngestionInput,
  RelativePerformance,
} from "../../types/memory";
import type { ID, ISODateTime } from "../../types/primitives";
import { calculateDerivedMetrics } from "./derivedMetricCalculator";
import { evaluatePerformanceScore } from "./objectivePerformancePolicy";

/**
 * Ingests raw performance data into a canonical immutable CreativePerformance record.
 * Ensures undefined metrics remain undefined, calculates derived metrics,
 * scores overall performance against marketing objective, and evaluates evidence quality.
 */
export function ingestCreativePerformance(input: PerformanceIngestionInput): CreativePerformance {
  const now: ISODateTime = new Date().toISOString();
  const performanceId: ID = `perf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Calculate derived metrics while preserving undefined !== 0 invariant
  const derivedMetrics = calculateDerivedMetrics(input.metrics);

  const metrics: CreativePerformanceMetrics = {
    ...input.metrics,
    derived: derivedMetrics,
    measurementWindow: input.measurementWindow,
  };

  // 2. Evaluate performance score based on marketing objective
  const performanceScore = evaluatePerformanceScore(metrics, input.objective);

  // 3. Compute relative performance lift against contextual benchmarks
  const relativePerformance: RelativePerformance[] = [];
  for (const dm of derivedMetrics) {
    // Benchmarks per metric for relative lift calculation
    const benchmarkValues: Record<string, number> = {
      threeSecondHoldRate: 0.25,
      completionRate: 0.15,
      saveRate: 0.01,
      shareRate: 0.005,
      clickThroughRate: 0.015,
      whatsappConversionRate: 0.05,
      leadConversionRate: 0.03,
      bookingConversionRate: 0.02,
      revenuePerImpression: 0.25,
    };

    const benchmark = benchmarkValues[dm.metric] || 0.1;
    const lift = (dm.value - benchmark) / benchmark;

    relativePerformance.push({
      metric: dm.metric,
      observedValue: dm.value,
      benchmarkValue: benchmark,
      relativeLift: Number(lift.toFixed(4)),
      benchmarkGroup: `${input.business.industry}_${input.platform}_${input.format}`,
      confidence: (input.metrics.impressions && input.metrics.impressions > 1000 ? "HIGH" : "MEDIUM") as ConfidenceLevel,
    });
  }

  // 4. Compute evidence quality
  const warnings: string[] = [];
  let completeness = 0.5;
  const rawMetricKeys = Object.keys(input.metrics).filter(
    (k) => (input.metrics as Record<string, unknown>)[k] !== undefined
  );
  if (rawMetricKeys.length >= 6) completeness = 0.9;
  else if (rawMetricKeys.length >= 3) completeness = 0.7;

  if (input.metrics.impressions === undefined) {
    warnings.push("Missing impressions count");
  }

  const freshness = 1.0; // Newly ingested
  const sourceReliability = input.source === "PLATFORM_API" ? 0.95 : 0.75;
  const consistency = 0.85;
  const overallQuality = Number(
    ((completeness + freshness + sourceReliability + consistency) / 4).toFixed(4)
  );

  let learningConfidence: ConfidenceLevel = "MEDIUM";
  if (overallQuality > 0.8 && (input.metrics.impressions || 0) >= 1000) {
    learningConfidence = "HIGH";
  } else if (overallQuality < 0.6 || (input.metrics.impressions || 0) < 100) {
    learningConfidence = "LOW";
  }

  return {
    performanceId,
    tenantId: input.tenantId,
    businessId: input.businessId,
    creativeId: input.creativeId,
    creativeVersionId: input.creativeVersionId,
    campaignId: input.campaignId,
    recipeId: input.attribution.recipeId,
    mechanismIds: input.attribution.mechanismIds,
    psychologyIds: input.attribution.psychologyIds,
    hookId: input.attribution.hookId,
    storyId: input.attribution.storyId,
    visualId: input.attribution.visualId,
    styleId: input.attribution.styleId,
    offerMechanismId: input.attribution.offerMechanismId,
    ctaId: input.attribution.ctaId,
    industry: input.business.industry,
    location: input.business.location,
    platform: input.platform,
    format: input.format,
    objective: input.objective,
    metrics,
    performanceScore,
    relativePerformance,
    evidenceQuality: {
      completeness,
      consistency,
      freshness,
      sourceReliability,
      overall: overallQuality,
      warnings,
    },
    learningConfidence,
    measurementWindow: input.measurementWindow,
    createdAt: now,
    updatedAt: now,
  };
}
