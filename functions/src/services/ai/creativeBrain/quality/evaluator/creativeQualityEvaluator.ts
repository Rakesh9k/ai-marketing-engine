import type {
  CreativeQualityEvaluationInput,
  CreativeQualityEvaluation,
  CreativeQualityScore,
  CreativeQualityPolicy,
  QualityAcceptancePolicy} from "../../types";
import {
  CreativeQualityStatus,
  CreativeQualityDimension,
} from "../../types";
import {
  DEFAULT_QUALITY_POLICY,
  DEFAULT_ACCEPTANCE_POLICY,
  CURRENT_QUALITY_POLICY_VERSION,
  QualityScoringEngine,
} from "../scoring/qualityScoringPolicy";

import { StrategicFitEvaluator } from "./dimensionEvaluators/strategicFitEvaluator";
import { AudienceEvaluator } from "./dimensionEvaluators/audienceEvaluator";
import { ClarityEvaluator } from "./dimensionEvaluators/clarityEvaluator";
import { AttentionEvaluator } from "./dimensionEvaluators/attentionEvaluator";
import { EmotionalResonanceEvaluator } from "./dimensionEvaluators/emotionalResonanceEvaluator";
import { DifferentiationEvaluator } from "./dimensionEvaluators/differentiationEvaluator";
import { BrandFitEvaluator } from "./dimensionEvaluators/brandFitEvaluator";
import { OfferClarityEvaluator } from "./dimensionEvaluators/offerClarityEvaluator";
import { CTAEvaluator } from "./dimensionEvaluators/ctaEvaluator";
import { VisualHierarchyEvaluator } from "./dimensionEvaluators/visualHierarchyEvaluator";
import { PlatformFitEvaluator } from "./dimensionEvaluators/platformFitEvaluator";
import { TruthfulnessEvaluator } from "./dimensionEvaluators/truthfulnessEvaluator";

import { QualityWeaknessDetector } from "../diagnosis/weaknessDetector";
import { QualityRepairPlanner } from "../repair/repairPlanner";

export class CreativeQualityEvaluatorService {
  private strategicFitEval = new StrategicFitEvaluator();
  private audienceEval = new AudienceEvaluator();
  private clarityEval = new ClarityEvaluator();
  private attentionEval = new AttentionEvaluator();
  private emotionalEval = new EmotionalResonanceEvaluator();
  private differentiationEval = new DifferentiationEvaluator();
  private brandFitEval = new BrandFitEvaluator();
  private offerClarityEval = new OfferClarityEvaluator();
  private ctaEval = new CTAEvaluator();
  private visualHierarchyEval = new VisualHierarchyEvaluator();
  private platformFitEval = new PlatformFitEvaluator();
  private truthfulnessEval = new TruthfulnessEvaluator();

  private scoringEngine = new QualityScoringEngine();
  private weaknessDetector = new QualityWeaknessDetector();
  private repairPlanner = new QualityRepairPlanner();

  /**
   * Main entrypoint: Evaluates creative quality across all 12 dimensions, calculates contextual overall score,
   * enforces hard gates, and produces diagnosis + repair plan if required.
   */
  public async evaluate(
    input: CreativeQualityEvaluationInput,
    policy: CreativeQualityPolicy = DEFAULT_QUALITY_POLICY,
    acceptancePolicy: QualityAcceptancePolicy = DEFAULT_ACCEPTANCE_POLICY
  ): Promise<CreativeQualityEvaluation> {
    const policyVersion = policy.policyVersion || CURRENT_QUALITY_POLICY_VERSION;

    // 1. Evaluate all 12 dimensions independently
    const dimensionScores: CreativeQualityScore[] = [
      this.strategicFitEval.evaluate(input, policyVersion),
      this.audienceEval.evaluate(input, policyVersion),
      this.clarityEval.evaluate(input, policyVersion),
      this.attentionEval.evaluate(input, policyVersion),
      this.emotionalEval.evaluate(input, policyVersion),
      this.differentiationEval.evaluate(input, policyVersion),
      this.brandFitEval.evaluate(input, policyVersion),
      this.offerClarityEval.evaluate(input, policyVersion),
      this.ctaEval.evaluate(input, policyVersion),
      this.visualHierarchyEval.evaluate(input, policyVersion),
      this.platformFitEval.evaluate(input, policyVersion),
      this.truthfulnessEval.evaluate(input, policyVersion),
    ];

    // 2. Calculate Contextual Overall Score
    const { overallScore } = this.scoringEngine.calculateOverallScore(dimensionScores, input, policy);

    // 3. Evaluate Hard Gates & Governance PASS Requirement
    const truthScoreObj = dimensionScores.find((d) => d.dimension === CreativeQualityDimension.TRUTHFULNESS);
    const truthCheckPassed = input.governance.truth.status === "PASS";
    const governancePassed = input.governance.status === "PASS";

    let status: CreativeQualityStatus = CreativeQualityStatus.PASS;

    if (!governancePassed || !truthCheckPassed || (truthScoreObj && truthScoreObj.score < 100)) {
      status = CreativeQualityStatus.BLOCKED;
    } else {
      // 4. Check minimum dimension thresholds
      let failsThresholds = false;
      for (const scoreObj of dimensionScores) {
        const minVal = acceptancePolicy.minimumDimensionScores[scoreObj.dimension];
        if (minVal != null && scoreObj.score < minVal) {
          failsThresholds = true;
          break;
        }
      }

      if (overallScore < acceptancePolicy.publishThreshold || failsThresholds) {
        status = CreativeQualityStatus.NEEDS_IMPROVEMENT;
      }
    }

    // 5. Diagnose Strengths & Weaknesses
    const { strengths, weaknesses } = this.weaknessDetector.diagnose(dimensionScores, policy);

    // 6. Generate Repair Plan if repair is needed
    let repairPlan;
    if (status === CreativeQualityStatus.NEEDS_IMPROVEMENT && weaknesses.length > 0) {
      repairPlan = this.repairPlanner.createRepairPlan(weaknesses, policyVersion);
    }

    const evaluationId = `eval_qual_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    return {
      evaluationId,
      tenantId: input.tenantId,
      businessId: input.businessId,
      sessionId: input.sessionId,
      revision: input.revision,
      strategyId: input.strategyId,
      creativeVersionId: input.creativeVersionId,
      dimensions: dimensionScores,
      overallScore,
      status,
      strengths,
      weaknesses,
      repairPlan,
      policyVersion,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Staleness Detector
   */
  public isStale(
    evaluation: CreativeQualityEvaluation,
    currentRevision: number,
    currentStrategyId: string,
    currentVersionId: string
  ): boolean {
    return (
      evaluation.revision !== currentRevision ||
      evaluation.strategyId !== currentStrategyId ||
      evaluation.creativeVersionId !== currentVersionId
    );
  }
}
