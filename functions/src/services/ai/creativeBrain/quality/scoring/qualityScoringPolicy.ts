import type {
  CreativeQualityPolicy,
  CreativeQualityScore,
  QualityAcceptancePolicy,
  QualityIterationPolicy,
  CreativeQualityEvaluationInput,
  Score} from "../../types";
import {
  CreativeQualityDimension
} from "../../types";

export const CURRENT_QUALITY_POLICY_VERSION = "2026.10.07-quality-v1";

export const DEFAULT_QUALITY_POLICY: CreativeQualityPolicy = {
  policyVersion: CURRENT_QUALITY_POLICY_VERSION,
  defaultWeights: {
    [CreativeQualityDimension.STRATEGIC_FIT]: 0.15,
    [CreativeQualityDimension.AUDIENCE_RELEVANCE]: 0.12,
    [CreativeQualityDimension.CLARITY]: 0.12,
    [CreativeQualityDimension.ATTENTION]: 0.10,
    [CreativeQualityDimension.EMOTIONAL_RESONANCE]: 0.08,
    [CreativeQualityDimension.DIFFERENTIATION]: 0.10,
    [CreativeQualityDimension.BRAND_FIT]: 0.08,
    [CreativeQualityDimension.OFFER_CLARITY]: 0.08,
    [CreativeQualityDimension.CTA_STRENGTH]: 0.06,
    [CreativeQualityDimension.VISUAL_HIERARCHY]: 0.05,
    [CreativeQualityDimension.PLATFORM_FIT]: 0.04,
    [CreativeQualityDimension.TRUTHFULNESS]: 0.02,
  },
  contextualWeightRules: [
    {
      ruleId: "ctx_rule_restaurant",
      name: "Restaurant Vertical Emphasis",
      condition: { industry: "RESTAURANT" },
      weights: {
        [CreativeQualityDimension.OFFER_CLARITY]: 0.14,
        [CreativeQualityDimension.CTA_STRENGTH]: 0.08,
        [CreativeQualityDimension.ATTENTION]: 0.12,
        [CreativeQualityDimension.AUDIENCE_RELEVANCE]: 0.12,
        [CreativeQualityDimension.STRATEGIC_FIT]: 0.14,
      },
    },
    {
      ruleId: "ctx_rule_salon",
      name: "Salon Transformation Emphasis",
      condition: { industry: "SALON" },
      weights: {
        [CreativeQualityDimension.EMOTIONAL_RESONANCE]: 0.14,
        [CreativeQualityDimension.DIFFERENTIATION]: 0.14,
        [CreativeQualityDimension.AUDIENCE_RELEVANCE]: 0.14,
        [CreativeQualityDimension.STRATEGIC_FIT]: 0.14,
      },
    },
    {
      ruleId: "ctx_rule_real_estate",
      name: "Real Estate Property Emphasis",
      condition: { industry: "REAL_ESTATE" },
      weights: {
        [CreativeQualityDimension.CLARITY]: 0.16,
        [CreativeQualityDimension.OFFER_CLARITY]: 0.14,
        [CreativeQualityDimension.DIFFERENTIATION]: 0.12,
        [CreativeQualityDimension.STRATEGIC_FIT]: 0.14,
      },
    },
  ],
  minimumScores: {
    [CreativeQualityDimension.STRATEGIC_FIT]: 75,
    [CreativeQualityDimension.AUDIENCE_RELEVANCE]: 70,
    [CreativeQualityDimension.CLARITY]: 70,
    [CreativeQualityDimension.OFFER_CLARITY]: 70,
    [CreativeQualityDimension.CTA_STRENGTH]: 70,
    [CreativeQualityDimension.PLATFORM_FIT]: 65,
    [CreativeQualityDimension.TRUTHFULNESS]: 100, // Truthfulness hard gate
  },
  hardGates: [CreativeQualityDimension.TRUTHFULNESS],
  overallThreshold: 85,
};

export const DEFAULT_ACCEPTANCE_POLICY: QualityAcceptancePolicy = {
  publishThreshold: 85,
  minimumDimensionScores: DEFAULT_QUALITY_POLICY.minimumScores,
  requiredGovernanceStatus: "PASS",
  maxRepairIterations: 3,
};

export const DEFAULT_ITERATION_POLICY: QualityIterationPolicy = {
  maxIterations: 3,
  maxComponentRepairs: 4,
  minimumImprovement: 2,
  maxRegression: 5,
  stopAfterNoImprovement: 2,
};

export class QualityScoringEngine {
  /**
   * Computes the weighted overall score and applies contextual adjustments.
   */
  public calculateOverallScore(
    scores: CreativeQualityScore[],
    input: CreativeQualityEvaluationInput,
    policy: CreativeQualityPolicy = DEFAULT_QUALITY_POLICY
  ): { overallScore: Score; effectiveWeights: Record<CreativeQualityDimension, number> } {
    const weights: Record<CreativeQualityDimension, number> = { ...policy.defaultWeights };

    const industry = input.business.industry?.toUpperCase();
    const matchingRule = policy.contextualWeightRules.find(
      (r) => r.condition.industry && r.condition.industry.toUpperCase() === industry
    );

    if (matchingRule) {
      Object.assign(weights, matchingRule.weights);
    }

    // Normalize weights to sum to 1.0
    const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
    const normalizedWeights: Record<CreativeQualityDimension, number> = { ...weights };
    for (const key of Object.keys(normalizedWeights) as CreativeQualityDimension[]) {
      normalizedWeights[key] = normalizedWeights[key] / weightSum;
    }

    let weightedSum = 0;
    for (const scoreObj of scores) {
      const w = normalizedWeights[scoreObj.dimension] || 0.05;
      weightedSum += scoreObj.score * w;
    }

    const overallScore = Math.round(weightedSum);

    return {
      overallScore,
      effectiveWeights: normalizedWeights,
    };
  }
}
