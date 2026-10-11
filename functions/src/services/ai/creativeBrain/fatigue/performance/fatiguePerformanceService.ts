import type { MechanismPerformanceTrend } from "../fatigue.types";

export interface EmpiricalPerformanceInput {
  entityId: string;
  metric: string;
  historicalValue?: number;
  recentValue?: number;
  sampleSize?: number;
}

export class FatiguePerformanceService {
  /**
   * Analyzes empirical performance trends relative to business & entity baselines.
   */
  public analyzePerformanceTrend(
    input: EmpiricalPerformanceInput
  ): MechanismPerformanceTrend {
    const hist = input.historicalValue;
    const rec = input.recentValue;
    const sample = input.sampleSize || 0;

    if (hist === undefined || rec === undefined || sample < 3) {
      return {
        mechanismId: input.entityId,
        campaignCount: sample,
        historicalPerformance: hist || 0,
        recentPerformance: rec || 0,
        delta: 0,
        trend: "STABLE",
        confidence: 0.30, // Low confidence due to small sample or missing data
      };
    }

    const delta = hist > 0 ? Number(((rec - hist) / hist).toFixed(2)) : 0;
    const confidence = Math.min(0.95, 0.50 + sample * 0.05);

    let trend: MechanismPerformanceTrend["trend"] = "STABLE";
    if (delta <= -0.15) {
      trend = "DECLINING";
    } else if (delta >= 0.15) {
      trend = "IMPROVING";
    } else if (Math.abs(delta) > 0.35) {
      trend = "VOLATILE";
    }

    return {
      mechanismId: input.entityId,
      campaignCount: sample,
      historicalPerformance: hist,
      recentPerformance: rec,
      delta,
      trend,
      confidence,
    };
  }
}
