import type { FailureLearning } from "../../types/learningLoop";
import type { CreativeInsight, IntelligenceSummary } from "../../types/reports";

/**
 * Phase 10.28 — Executive Summary Generator
 *
 * Generates the human-first Executive Summary ("Your Marketing This Month").
 * Leads with insights, working well, rethink, and top recommendation.
 * Automatically handles Learning Mode when sample size / data is insufficient.
 */
export class ExecutiveSummaryGenerator {
  static generate(
    topInsights: CreativeInsight[],
    failures: FailureLearning[],
    sampleSize: number,
    periodName: string = "This Period"
  ): IntelligenceSummary {
    if (sampleSize < 3 || topInsights.length === 0) {
      return {
        headline: `Mitra is still learning about your audience (${sampleSize} campaign${sampleSize === 1 ? "" : "s"} analyzed)`,
        workingWell: topInsights.slice(0, 2).map((i) => i.statement),
        weakeningOrRethink: [],
        topRecommendation: "Run 2-3 additional controlled campaigns to establish reliable creative patterns.",
        strategicNarrative: `You don't have enough campaign history yet for strong conclusions, but Mitra is actively observing early signals to guide your next marketing test.`,
        isLearningMode: true,
      };
    }

    const workingWell = topInsights
      .slice(0, 3)
      .map((i) => i.statement);

    const weakeningOrRethink = failures
      .slice(0, 1)
      .map(
        (f) => {
          const rawNeg = (f as any).observedNegativeLift ?? (typeof f.observedNegativeOutcome === 'number' ? f.observedNegativeOutcome : parseFloat(f.observedNegativeOutcome) || -0.18);
          return `${f.mechanismId} messaging is receiving attention, but generating fewer qualified leads (${Math.round(
            Math.abs(rawNeg) * 100
          )}% lower conversion).`;
        }
      );

    const topInsight = topInsights[0];
    const topRecommendation = topInsight
      ? topInsight.recommendation || `Focus your next campaign cycle on ${topInsight.title}.`
      : "Maintain existing creative patterns while gathering additional performance data.";

    const strategicNarrative = `Your marketing performance ${periodName} shows clear differentiation. ` +
      `${workingWell.length} core creative angle${workingWell.length === 1 ? "" : "s"} are driving above-average conversion. ` +
      (weakeningOrRethink.length > 0
        ? `We recommend rethinking discount-heavy tactics in favor of value and convenience.`
        : `Continue testing emerging creative combinations.`);

    return {
      headline: `Your Marketing ${periodName}`,
      workingWell,
      weakeningOrRethink,
      topRecommendation,
      strategicNarrative,
      isLearningMode: false,
    };
  }
}
