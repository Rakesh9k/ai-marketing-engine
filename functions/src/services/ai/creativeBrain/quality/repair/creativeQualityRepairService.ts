import type {
  CreativeQualityRepairInput,
  CreativeQualityRepairResult,
  QualityIterationPolicy,
} from "../../types";
import {
  DEFAULT_ITERATION_POLICY,
  DEFAULT_QUALITY_POLICY,
  DEFAULT_ACCEPTANCE_POLICY,
} from "../scoring/qualityScoringPolicy";
import { SelectiveRegenerator } from "./selectiveRegenerator";
import { QualityRegressionChecker } from "./regressionChecker";
import { CreativeQualityEvaluatorService } from "../evaluator/creativeQualityEvaluator";
import { FinalCreativeGovernanceService } from "../../governance/governance/finalGovernanceService";

export class CreativeQualityRepairService {
  private selectiveRegenerator = new SelectiveRegenerator();
  private regressionChecker = new QualityRegressionChecker();
  private evaluator = new CreativeQualityEvaluatorService();
  private governanceService = new FinalCreativeGovernanceService();

  /**
   * Executes a single quality repair iteration.
   */
  public async repair(
    input: CreativeQualityRepairInput,
    iterationPolicy: QualityIterationPolicy = DEFAULT_ITERATION_POLICY
  ): Promise<CreativeQualityRepairResult> {
    if (input.iterationCount >= iterationPolicy.maxIterations) {
      return {
        status: "MAX_ITERATIONS_REACHED",
        iterationCount: input.iterationCount,
        explanation: `Quality repair terminated: Exceeded maximum allowed repair iterations (${iterationPolicy.maxIterations})`,
      };
    }

    if (!input.currentEvaluation.repairPlan) {
      return {
        status: "FAILED",
        iterationCount: input.iterationCount,
        explanation: "Cannot execute repair: current evaluation contains no repair plan",
      };
    }

    // 1. Regenerate affected components selectively
    const repairedCreative = this.selectiveRegenerator.regenerateSelective(
      input.currentCreative,
      input.currentEvaluation.repairPlan,
      input.strategy
    );

    // 2. Re-run Governance on repaired creative
    const newGovernanceInput: any = {
      tenantId: input.tenantId,
      businessId: input.businessId,
      sessionId: input.sessionId,
      revision: repairedCreative.revision,
      strategyId: input.strategy.id,
      confirmationId: repairedCreative.confirmationId,
      creativeVersionId: repairedCreative.creativeVersionId,
      businessContext: input.business,
      strategy: input.strategy,
      copy: repairedCreative.copy,
      assets: repairedCreative.assets,
      offer: input.offer,
      platform: input.platform,
      format: input.format,
    };

    const newGovernance = await this.governanceService.evaluate(newGovernanceInput);

    // 3. Re-evaluate Quality on repaired creative
    const newEvalInput: any = {
      tenantId: input.tenantId,
      businessId: input.businessId,
      sessionId: input.sessionId,
      revision: repairedCreative.revision,
      strategyId: input.strategy.id,
      confirmationId: repairedCreative.confirmationId,
      creativeVersionId: repairedCreative.creativeVersionId,
      strategy: input.strategy,
      creative: repairedCreative,
      governance: newGovernance,
      platform: input.platform,
      format: input.format,
      business: input.business,
      offer: input.offer,
    };

    const newEvaluation = await this.evaluator.evaluate(newEvalInput, DEFAULT_QUALITY_POLICY, DEFAULT_ACCEPTANCE_POLICY);

    // 4. Compare post-repair vs pre-repair evaluation for regression
    const comparison = this.regressionChecker.compareEvaluations(
      input.currentEvaluation,
      newEvaluation,
      iterationPolicy
    );

    if (!comparison.acceptable) {
      return {
        status: "REJECTED_REGRESSION",
        repairedCreative,
        newEvaluation,
        comparison,
        iterationCount: input.iterationCount + 1,
        explanation: `Selective repair rejected: ${comparison.reason}`,
      };
    }

    return {
      status: "SUCCESS",
      repairedCreative,
      newEvaluation,
      comparison,
      iterationCount: input.iterationCount + 1,
      explanation: `Selective repair succeeded: ${comparison.reason}`,
    };
  }
}
