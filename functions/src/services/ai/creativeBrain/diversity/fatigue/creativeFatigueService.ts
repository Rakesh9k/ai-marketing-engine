import type { CreativeFatigueSignal, MechanismSaturation } from "../types";

export interface PerformanceSignalInput {
  mechanismId: string;
  historicalCtr?: number;
  recentCtr?: number;
  historicalConversionRate?: number;
  recentConversionRate?: number;
}

export class CreativeFatigueService {
  /**
   * Evaluates creative fatigue by combining repetition saturation with empirical performance trends.
   */
  public evaluateFatigue(
    saturations: MechanismSaturation[],
    performanceInputs: PerformanceSignalInput[] = []
  ): CreativeFatigueSignal[] {
    const fatigueSignals: CreativeFatigueSignal[] = [];

    for (const sat of saturations) {
      const perf = performanceInputs.find((p) => p.mechanismId === sat.mechanismId);

      let ctrDecline = 0;
      let convDecline = 0;

      if (perf && perf.historicalCtr && perf.recentCtr) {
        if (perf.historicalCtr > 0) {
          ctrDecline = Math.max(0, (perf.historicalCtr - perf.recentCtr) / perf.historicalCtr);
        }
      }

      if (perf && perf.historicalConversionRate && perf.recentConversionRate) {
        if (perf.historicalConversionRate > 0) {
          convDecline = Math.max(
            0,
            (perf.historicalConversionRate - perf.recentConversionRate) / perf.historicalConversionRate
          );
        }
      }

      const performanceDeclineScore = Math.round(Math.max(ctrDecline, convDecline) * 100);
      const repetitionScore = sat.saturationScore;

      let status: CreativeFatigueSignal["status"] = "NO_SIGNAL";

      if (repetitionScore >= 60 && performanceDeclineScore >= 30) {
        status = "STRONG";
      } else if (repetitionScore >= 60 && performanceDeclineScore >= 15) {
        status = "LIKELY";
      } else if (repetitionScore >= 60) {
        status = "POSSIBLE"; // High repetition, but performance still holding strong
      }

      fatigueSignals.push({
        mechanismId: sat.mechanismId,
        familyId: sat.canonicalMechanismId,
        repetitionScore,
        performanceDeclineScore,
        audienceResponseDecline: performanceDeclineScore,
        confidence: perf ? 0.85 : 0.60,
        status,
      });
    }

    return fatigueSignals;
  }
}
