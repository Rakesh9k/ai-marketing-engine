import type { MarketingObjective } from "../../types/enums";
import type { CreativePerformanceMetrics, PerformanceObjectivePolicy } from "../../types/memory";
import type { Score } from "../../types/primitives";

export const DEFAULT_OBJECTIVE_POLICIES: Record<string, PerformanceObjectivePolicy> = {
  AWARENESS: {
    objective: "AWARENESS" as MarketingObjective,
    primaryMetrics: [
      { metric: "threeSecondHoldRate", weight: 0.5 },
      { metric: "completionRate", weight: 0.5 },
    ],
    secondaryMetrics: [
      { metric: "shareRate", weight: 0.6 },
      { metric: "saveRate", weight: 0.4 },
    ],
    diagnosticMetrics: [{ metric: "impressions", weight: 1.0 }],
  },
  ENGAGEMENT: {
    objective: "ENGAGEMENT" as MarketingObjective,
    primaryMetrics: [
      { metric: "saveRate", weight: 0.5 },
      { metric: "shareRate", weight: 0.5 },
    ],
    secondaryMetrics: [
      { metric: "clickThroughRate", weight: 0.6 },
      { metric: "completionRate", weight: 0.4 },
    ],
    diagnosticMetrics: [{ metric: "views", weight: 1.0 }],
  },
  LEAD_GENERATION: {
    objective: "LEAD_GENERATION" as MarketingObjective,
    primaryMetrics: [
      { metric: "leadConversionRate", weight: 0.5 },
      { metric: "whatsappConversionRate", weight: 0.5 },
    ],
    secondaryMetrics: [
      { metric: "clickThroughRate", weight: 0.7 },
      { metric: "threeSecondHoldRate", weight: 0.3 },
    ],
    diagnosticMetrics: [{ metric: "clicks", weight: 1.0 }],
  },
  SALES: {
    objective: "SALES" as MarketingObjective,
    primaryMetrics: [
      { metric: "bookingConversionRate", weight: 0.5 },
      { metric: "revenuePerImpression", weight: 0.5 },
    ],
    secondaryMetrics: [
      { metric: "clickThroughRate", weight: 0.6 },
      { metric: "leadConversionRate", weight: 0.4 },
    ],
    diagnosticMetrics: [{ metric: "conversions", weight: 1.0 }],
  },
  CONVERSION: {
    objective: "CONVERSION" as MarketingObjective,
    primaryMetrics: [
      { metric: "bookingConversionRate", weight: 0.5 },
      { metric: "revenuePerImpression", weight: 0.5 },
    ],
    secondaryMetrics: [
      { metric: "clickThroughRate", weight: 0.6 },
      { metric: "leadConversionRate", weight: 0.4 },
    ],
    diagnosticMetrics: [{ metric: "conversions", weight: 1.0 }],
  },
  BRAND_BUILDING: {
    objective: "BRAND_BUILDING" as MarketingObjective,
    primaryMetrics: [
      { metric: "completionRate", weight: 0.5 },
      { metric: "shareRate", weight: 0.5 },
    ],
    secondaryMetrics: [
      { metric: "saveRate", weight: 0.5 },
      { metric: "threeSecondHoldRate", weight: 0.5 },
    ],
    diagnosticMetrics: [{ metric: "impressions", weight: 1.0 }],
  },
};

/**
 * Retrieves objective-specific policy configuration.
 */
export function getObjectivePolicy(objective: MarketingObjective): PerformanceObjectivePolicy {
  return (
    DEFAULT_OBJECTIVE_POLICIES[objective] ||
    DEFAULT_OBJECTIVE_POLICIES.AWARENESS
  );
}

/**
 * Helper to extract metric value from metrics container (raw or derived).
 */
function getMetricValue(metrics: CreativePerformanceMetrics, metricName: string): number | undefined {
  // Check derived metrics first
  const derived = metrics.derived.find((d) => d.metric === metricName);
  if (derived !== undefined) {
    return derived.value;
  }
  // Fall back to raw metrics
  const rawVal = (metrics as unknown as Record<string, number | undefined>)[metricName];
  if (typeof rawVal === "number") {
    return rawVal;
  }
  return undefined;
}

/**
 * Normalizes a metric value to a 0-1 score scale based on benchmarks.
 */
function normalizeMetricToScore(metricName: string, value: number): Score {
  // Realistic benchmarks for digital marketing ratios
  const benchmarks: Record<string, { min: number; max: number }> = {
    threeSecondHoldRate: { min: 0.1, max: 0.6 },
    completionRate: { min: 0.05, max: 0.4 },
    saveRate: { min: 0.005, max: 0.05 },
    shareRate: { min: 0.002, max: 0.03 },
    clickThroughRate: { min: 0.005, max: 0.05 },
    whatsappConversionRate: { min: 0.02, max: 0.25 },
    leadConversionRate: { min: 0.01, max: 0.15 },
    bookingConversionRate: { min: 0.01, max: 0.1 },
    revenuePerImpression: { min: 0.05, max: 2.0 },
  };

  const bm = benchmarks[metricName] || { min: 0, max: 1 };
  if (value <= bm.min) return 0.1;
  if (value >= bm.max) return 1.0;
  return 0.1 + 0.9 * ((value - bm.min) / (bm.max - bm.min));
}

/**
 * Evaluates performance score (0..1) weighted by objective policy.
 */
export function evaluatePerformanceScore(
  metrics: CreativePerformanceMetrics,
  objective: MarketingObjective
): Score {
  const policy = getObjectivePolicy(objective);
  let totalScore = 0;
  let totalWeight = 0;

  // Primary metrics contribute 70% of total score
  for (const item of policy.primaryMetrics) {
    const val = getMetricValue(metrics, item.metric);
    if (val !== undefined) {
      const score = normalizeMetricToScore(item.metric, val);
      totalScore += score * item.weight * 0.7;
      totalWeight += item.weight * 0.7;
    }
  }

  // Secondary metrics contribute 30% of total score
  for (const item of policy.secondaryMetrics) {
    const val = getMetricValue(metrics, item.metric);
    if (val !== undefined) {
      const score = normalizeMetricToScore(item.metric, val);
      totalScore += score * item.weight * 0.3;
      totalWeight += item.weight * 0.3;
    }
  }

  if (totalWeight === 0) {
    return 0.5; // Default score if no objective metrics are available
  }

  const finalScore = Math.min(1.0, Math.max(0.0, totalScore / totalWeight));
  return Number(finalScore.toFixed(4));
}
