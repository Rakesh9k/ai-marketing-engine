import type { CreativeExperimentSuggestion } from "../../types/learningLoop";
import type { CreativeInsight, EmergingPattern, StrategicDirectionContext } from "../../types/reports";

/**
 * Phase 10.28 — Report Action Bridge
 *
 * Connects report insights and emerging signals directly into Creative Brain and active learning.
 *
 * Loops implemented:
 * 1. [Use this insight] -> Creative Brain campaign generation
 * 2. [Test this] -> Creative A/B Experiment suggestion
 */
export class ReportActionBridge {
  /**
   * Generates a StrategicDirectionContext for Creative Brain when user clicks [Use this insight]
   */
  static buildCampaignContextFromInsight(insight: CreativeInsight): StrategicDirectionContext {
    return {
      strategicDirection: insight.statement,
      supportingLearningId: insight.learningId,
      recommendedMechanisms: [insight.title.replace(" Strategy", "").toLowerCase()],
      avoidMechanisms: [],
      targetAudience: insight.category === "AUDIENCE" ? insight.statement : undefined,
    };
  }

  /**
   * Generates a CreativeExperimentSuggestion when user clicks [Test this] on an emerging signal
   */
  static buildExperimentFromEmergingPattern(pattern: EmergingPattern): CreativeExperimentSuggestion {
    return {
      experimentId: `exp_${pattern.patternId}`,
      hypothesis: `Testing ${pattern.title} will confirm whether early +${Math.round(pattern.earlySignalLift * 100)}% lift holds.`,
      targetMechanismA: pattern.title.toLowerCase(),
      targetMechanismB: "baseline_control",
      context: {},
      rationale: `Emerging signal detected across ${pattern.sampleSize} test campaigns.`,
      expectedInsight: pattern.recommendedTest,
      createdAt: new Date().toISOString(),
    };
  }
}
