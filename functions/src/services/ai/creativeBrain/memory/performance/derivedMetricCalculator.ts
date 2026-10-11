import type { CreativePerformanceMetrics, DerivedPerformanceMetric } from "../../types/memory";

export const DERIVED_METRIC_FORMULA_VERSION = "1.0.0";

/**
 * Calculates deterministic derived metrics from raw metrics.
 * 
 * CRITICAL INVARIANT: undefined !== 0.
 * If raw metric values are undefined (missing), derived metrics must NOT treat them as 0.
 * Derived metrics are calculated ONLY when both numerator and denominator exist and denominator > 0.
 */
export function calculateDerivedMetrics(
  rawMetrics: Omit<CreativePerformanceMetrics, "derived" | "measurementWindow">
): DerivedPerformanceMetric[] {
  const derived: DerivedPerformanceMetric[] = [];

  // 1. threeSecondHoldRate = threeSecondViews / impressions
  if (
    rawMetrics.threeSecondViews !== undefined &&
    rawMetrics.impressions !== undefined &&
    rawMetrics.impressions > 0
  ) {
    derived.push({
      metric: "threeSecondHoldRate",
      value: rawMetrics.threeSecondViews / rawMetrics.impressions,
      formulaVersion: DERIVED_METRIC_FORMULA_VERSION,
    });
  }

  // 2. completionRate = completionCount / views
  if (
    rawMetrics.completionCount !== undefined &&
    rawMetrics.views !== undefined &&
    rawMetrics.views > 0
  ) {
    derived.push({
      metric: "completionRate",
      value: rawMetrics.completionCount / rawMetrics.views,
      formulaVersion: DERIVED_METRIC_FORMULA_VERSION,
    });
  }

  // 3. saveRate = saves / impressions
  if (
    rawMetrics.saves !== undefined &&
    rawMetrics.impressions !== undefined &&
    rawMetrics.impressions > 0
  ) {
    derived.push({
      metric: "saveRate",
      value: rawMetrics.saves / rawMetrics.impressions,
      formulaVersion: DERIVED_METRIC_FORMULA_VERSION,
    });
  }

  // 4. shareRate = shares / impressions
  if (
    rawMetrics.shares !== undefined &&
    rawMetrics.impressions !== undefined &&
    rawMetrics.impressions > 0
  ) {
    derived.push({
      metric: "shareRate",
      value: rawMetrics.shares / rawMetrics.impressions,
      formulaVersion: DERIVED_METRIC_FORMULA_VERSION,
    });
  }

  // 5. clickThroughRate = clicks / impressions
  if (
    rawMetrics.clicks !== undefined &&
    rawMetrics.impressions !== undefined &&
    rawMetrics.impressions > 0
  ) {
    derived.push({
      metric: "clickThroughRate",
      value: rawMetrics.clicks / rawMetrics.impressions,
      formulaVersion: DERIVED_METRIC_FORMULA_VERSION,
    });
  }

  // 6. whatsappConversionRate = whatsappConversations / clicks
  if (
    rawMetrics.whatsappConversations !== undefined &&
    rawMetrics.clicks !== undefined &&
    rawMetrics.clicks > 0
  ) {
    derived.push({
      metric: "whatsappConversionRate",
      value: rawMetrics.whatsappConversations / rawMetrics.clicks,
      formulaVersion: DERIVED_METRIC_FORMULA_VERSION,
    });
  }

  // 7. leadConversionRate = leads / clicks
  if (
    rawMetrics.leads !== undefined &&
    rawMetrics.clicks !== undefined &&
    rawMetrics.clicks > 0
  ) {
    derived.push({
      metric: "leadConversionRate",
      value: rawMetrics.leads / rawMetrics.clicks,
      formulaVersion: DERIVED_METRIC_FORMULA_VERSION,
    });
  }

  // 8. bookingConversionRate = bookings / clicks
  if (
    rawMetrics.bookings !== undefined &&
    rawMetrics.clicks !== undefined &&
    rawMetrics.clicks > 0
  ) {
    derived.push({
      metric: "bookingConversionRate",
      value: rawMetrics.bookings / rawMetrics.clicks,
      formulaVersion: DERIVED_METRIC_FORMULA_VERSION,
    });
  }

  // 9. revenuePerImpression = revenue / impressions
  if (
    rawMetrics.revenue !== undefined &&
    rawMetrics.impressions !== undefined &&
    rawMetrics.impressions > 0
  ) {
    derived.push({
      metric: "revenuePerImpression",
      value: rawMetrics.revenue / rawMetrics.impressions,
      formulaVersion: DERIVED_METRIC_FORMULA_VERSION,
    });
  }

  return derived;
}
