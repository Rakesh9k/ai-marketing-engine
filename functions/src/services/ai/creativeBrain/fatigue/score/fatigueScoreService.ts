import type {
  CreativeFrequencyRecord,
  MechanismPerformanceTrend,
  CreativeFatigueSignal,
  FatigueSignalStatus,
  FatigueContext,
} from "../fatigue.types";

export interface CalculateSignalInput {
  record: CreativeFrequencyRecord;
  similarityScore: number;
  diversityPressureScore: number;
  performanceTrend?: MechanismPerformanceTrend;
  context?: FatigueContext;
}

export class FatigueScoreService {
  /**
   * Calculates deterministic composite fatigue score and status.
   */
  public calculateFatigueSignal(input: CalculateSignalInput): CreativeFatigueSignal {
    const { record, similarityScore, diversityPressureScore, performanceTrend, context } = input;

    // 1. Frequency Score (0 to 100)
    const frequencyScore = Math.min(100, Math.round(record.usageRate * 100));

    // 2. Recency Score (0 to 100)
    const recencyScore = Math.min(100, Math.round(record.weightedUsage * 100));

    // 3. Consecutive Repetition Score (0 to 100)
    const repetitionScore = Math.min(100, Math.round((record.consecutiveUses / 5) * 100));

    // 4. Performance Decline Score (0 to 100)
    let performanceDeclineScore = 0;
    if (performanceTrend && performanceTrend.trend === "DECLINING") {
      performanceDeclineScore = Math.min(100, Math.round(Math.abs(performanceTrend.delta) * 100));
    }

    // 5. Composite Weighted Score
    // Frequency 20%, Recency 15%, Consecutive Repetition 15%, Similarity 15%, Performance Decline 25%, Diversity Pressure 10%
    let rawFatigueScore =
      frequencyScore * 0.20 +
      recencyScore * 0.15 +
      repetitionScore * 0.15 +
      similarityScore * 0.15 +
      performanceDeclineScore * 0.25 +
      diversityPressureScore * 0.10;

    // 6. Contextual Adjustments
    if (context?.isSeasonalCampaign || context?.currentSeason) {
      rawFatigueScore *= 0.70; // 30% reduction during legitimate seasonal bursts
    }
    if (context?.currentObjective && context.currentObjective.toUpperCase().includes("CLEARANCE")) {
      rawFatigueScore *= 0.60; // 40% reduction for inventory clearance
    }

    const finalFatigueScore = Math.max(0, Math.min(100, Math.round(rawFatigueScore)));

    // 7. Determine Status with Performance Safeguard
    let status: FatigueSignalStatus = "NO_SIGNAL";

    if (finalFatigueScore >= 75 && performanceDeclineScore >= 20) {
      status = "STRONG";
    } else if (finalFatigueScore >= 60 && performanceDeclineScore >= 10) {
      status = "LIKELY";
    } else if (finalFatigueScore >= 45 || repetitionScore >= 60) {
      status = "POSSIBLE"; // High repetition, but performance holding
    } else if (finalFatigueScore >= 30 || record.usageCount >= 2) {
      status = "REPETITION";
    }

    // Performance Capping Safeguard: Strong performance prevents false STRONG fatigue flag
    if (performanceTrend && performanceTrend.trend === "IMPROVING" && status === "STRONG") {
      status = "POSSIBLE";
    }

    const confidence = performanceTrend ? performanceTrend.confidence : 0.65;
    const explanation = this.assembleExplanation(record.entityName, status, record.usageCount, performanceDeclineScore);

    return {
      id: `sig_${record.entityType}_${record.entityId}_${Date.now()}`,
      entityType: record.entityType,
      entityId: record.entityId,
      entityName: record.entityName,
      frequencyScore,
      recencyScore,
      repetitionScore,
      similarityScore,
      performanceDeclineScore,
      audienceResponseDeclineScore: performanceDeclineScore,
      diversityPressureScore,
      confidence,
      fatigueScore: finalFatigueScore,
      status,
      explanation,
      recommendation: status === "STRONG" || status === "LIKELY"
        ? `Consider rotating '${record.entityName}' to a fresh strategic alternative.`
        : undefined,
      generatedAt: new Date().toISOString(),
    };
  }

  private assembleExplanation(
    name: string,
    status: FatigueSignalStatus,
    usageCount: number,
    decline: number
  ): string {
    if (status === "STRONG") {
      return `'${name}' has been used ${usageCount} times recently and shows empirical performance decline of ${decline}%. Strong fatigue signal.`;
    }
    if (status === "LIKELY") {
      return `'${name}' has high recent repetition (${usageCount} uses) with early indicators of performance saturation.`;
    }
    if (status === "POSSIBLE") {
      return `'${name}' is being used frequently (${usageCount} uses). Performance remains viable, but strategic repetition is increasing.`;
    }
    if (status === "REPETITION") {
      return `'${name}' has appeared ${usageCount} times in recent campaigns.`;
    }
    return `'${name}' shows no signs of creative fatigue.`;
  }
}
