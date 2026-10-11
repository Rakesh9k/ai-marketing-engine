import type { NormalizedPerformanceEvidence } from "../../types/learningLoop";

export interface ContextQuery {
  industry?: string;
  objective?: string;
  platform?: string;
  tenantId?: string;
}

export interface MetricBaseline {
  metric: string;
  baselineValue: number;
  sampleSize: number;
  context: ContextQuery;
}

/**
 * Calculates contextual performance baselines and relative lifts.
 * 
 * CRITICAL INVARIANT: Multi-tenant safety.
 * Raw tenant evidence is NEVER exposed across tenant boundaries. Baseline statistics are aggregated.
 */
export class ContextualBaselineService {
  /**
   * Calculates baseline value for a target metric within a comparable context.
   */
  calculateBaseline(
    allEvidence: NormalizedPerformanceEvidence[],
    metricName: keyof NormalizedPerformanceEvidence,
    context: ContextQuery
  ): MetricBaseline {
    // Filter evidence by comparable context
    const filtered = allEvidence.filter((e) => {
      if (context.industry && (e.industry as unknown as string) !== context.industry) return false;
      if (context.objective && (e.objective as unknown as string) !== context.objective) return false;
      if (context.platform && (e.platform as unknown as string) !== context.platform) return false;
      return true;
    });



    const values = filtered
      .map((e) => e[metricName])
      .filter((v): v is number => typeof v === "number" && !isNaN(v));

    if (values.length === 0) {
      // Industry defaults if no exact matching context exists
      const defaults: Record<string, number> = {
        ctr: 0.015,
        engagementRate: 0.03,
        conversionRate: 0.02,
        saveRate: 0.01,
        shareRate: 0.005,
      };

      return {
        metric: metricName as string,
        baselineValue: defaults[metricName as string] || 0.01,
        sampleSize: 0,
        context,
      };
    }

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

    return {
      metric: metricName as string,
      baselineValue: Number(avg.toFixed(6)),
      sampleSize: values.length,
      context,
    };
  }

  /**
   * Calculates percentage relative lift of observed value against baseline.
   */
  calculateRelativeLift(observedValue: number, baselineValue: number): number {
    if (baselineValue <= 0) return 0.0;
    const lift = (observedValue - baselineValue) / baselineValue;
    return Number(lift.toFixed(4));
  }
}
