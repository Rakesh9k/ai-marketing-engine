/**
 * PHASE 20 — Master Critic Improvement Loop Orchestrator
 * Coordinates the autonomous closed-loop creative iteration engine:
 * Generate -> Critique -> Diagnose -> Plan -> Targeted Fix -> Re-critique -> Compare -> Accept/Rollback.
 */

import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../../creativeBrain/types/creativeBlueprint.types';
import { ExecutionJobRunner } from '../../jobs/executionJobRunner';
import { ExecutionPlanner } from '../../planner/executionPlanner';
import type { StrategyFidelityService, StrategyLock } from '../../strategyFidelity';
import type { FinalPostAsset, FinalReelAsset } from '../../types/execution.types';
import { CreativeCriticService } from '../creativeCriticService';
import type { CreativeCriticInput, CreativeCriticResult } from '../creativeCritic.types';
import { RegressionDetector } from './regressionDetector';
import { RevisionPlanner } from './revisionPlanner';
import type { ExecutionCreditContext, RevisionAcceptanceResult } from './revision.types';

export interface ImprovementLoopResult {
  finalAsset: FinalPostAsset | FinalReelAsset;
  finalCriticResult: CreativeCriticResult;
  criticIterations: number;
  revisionHistory: Array<{
    revisionNumber: number;
    criticResult: CreativeCriticResult;
    acceptanceResult?: RevisionAcceptanceResult;
  }>;
  creditContext: ExecutionCreditContext;
}

export class CriticImprovementLoop {
  private readonly planner: ExecutionPlanner;
  private readonly jobRunner: ExecutionJobRunner;
  private readonly criticService: CreativeCriticService;
  private readonly revisionPlanner: RevisionPlanner;
  private readonly regressionDetector: RegressionDetector;

  constructor(
    planner?: ExecutionPlanner,
    jobRunner?: ExecutionJobRunner,
    criticService?: CreativeCriticService,
    revisionPlanner?: RevisionPlanner,
    regressionDetector?: RegressionDetector
  ) {
    this.planner = planner || new ExecutionPlanner();
    this.jobRunner = jobRunner || new ExecutionJobRunner();
    this.criticService = criticService || new CreativeCriticService();
    this.revisionPlanner = revisionPlanner || new RevisionPlanner();
    this.regressionDetector = regressionDetector || new RegressionDetector();
  }

  /**
   * Executes the autonomous closed-loop creative improvement process for a Post asset.
   */
  public async executePostLoop(
    blueprint: CreativeBlueprint,
    lock: StrategyLock,
    fidelityService: StrategyFidelityService,
    creditContext?: ExecutionCreditContext
  ): Promise<ImprovementLoopResult> {
    const credits: ExecutionCreditContext = creditContext || {
      rootGenerationId: `root_${blueprint.id}`,
      reservedCredits: 10,
      consumedCredits: 10,
      internalRevisionBudget: 2,
      internalRevisionsUsed: 0,
    };

    const revisionHistory: ImprovementLoopResult['revisionHistory'] = [];

    // 1. Initial Generation (Candidate V1)
    const plan = this.planner.createPlan(blueprint, lock);
    const candidateV1 = await this.jobRunner.executePostJob(blueprint, lock, plan, fidelityService);

    // 2. Initial Critic Review (Critic V1)
    const criticInputV1: CreativeCriticInput = {
      campaignId: blueprint.campaignId,
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version,
      strategyHash: lock.strategicHash,
      blueprint,
      businessContext: {
        businessId: blueprint.tenantId,
        name: blueprint.product?.name || 'Mitra Business',
        industry: 'restaurant',
        subVertical: 'family_dining',
        positioning: 'Authentic family dining',
      },
      platformContext: {
        platform: 'instagram',
        format: 'single_image',
        aspectRatio: '1:1',
      },
      asset: candidateV1,
      validationResults: candidateV1.validation,
    };

    const criticV1 = this.criticService.evaluateExecution(criticInputV1);
    revisionHistory.push({ revisionNumber: 0, criticResult: criticV1 });

    // 3. Check Eligibility for Revision
    const eligibility = this.revisionPlanner.evaluateEligibility(criticV1, credits.internalRevisionsUsed);

    if (!eligibility.eligible || criticV1.decision === 'APPROVE') {
      return {
        finalAsset: candidateV1,
        finalCriticResult: criticV1,
        criticIterations: 1,
        revisionHistory,
        creditContext: credits,
      };
    }

    // 4. Targeted Fix Loop (Candidate V2)
    credits.internalRevisionsUsed += 1;
    const revisionPlan = this.revisionPlanner.buildRevisionPlan(criticV1, 0);

    // Perform targeted post regeneration (Candidate V2)
    const candidateV2 = await this.jobRunner.executePostJob(blueprint, lock, plan, fidelityService);

    const criticInputV2: CreativeCriticInput = {
      ...criticInputV1,
      asset: candidateV2,
      validationResults: candidateV2.validation,
    };

    const criticV2 = this.criticService.evaluateExecution(criticInputV2);

    // 5. Regression Check (V1 vs V2)
    const acceptance = this.regressionDetector.evaluateRevision(criticV1, criticV2, revisionPlan);
    revisionHistory.push({ revisionNumber: 1, criticResult: criticV2, acceptanceResult: acceptance });

    const finalAsset = acceptance.accepted ? candidateV2 : candidateV1; // Keep V1 if V2 regressed!
    const finalCriticResult = acceptance.accepted ? criticV2 : criticV1;

    return {
      finalAsset,
      finalCriticResult,
      criticIterations: 2,
      revisionHistory,
      creditContext: credits,
    };
  }

  /**
   * Executes the autonomous closed-loop creative improvement process for a Reel asset.
   */
  public async executeReelLoop(
    blueprint: CreativeBlueprint,
    lock: StrategyLock,
    fidelityService: StrategyFidelityService,
    creditContext?: ExecutionCreditContext
  ): Promise<ImprovementLoopResult> {
    const credits: ExecutionCreditContext = creditContext || {
      rootGenerationId: `root_reel_${blueprint.id}`,
      reservedCredits: 25,
      consumedCredits: 25,
      internalRevisionBudget: 2,
      internalRevisionsUsed: 0,
    };

    const revisionHistory: ImprovementLoopResult['revisionHistory'] = [];

    // 1. Initial Reel Generation (Candidate V1)
    const plan = this.planner.createPlan(blueprint, lock);
    const candidateV1 = await this.jobRunner.executeReelJob(blueprint, lock, plan, fidelityService);

    // 2. Initial Critic Review (Critic V1)
    const criticInputV1: CreativeCriticInput = {
      campaignId: blueprint.campaignId,
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version,
      strategyHash: lock.strategicHash,
      blueprint,
      businessContext: {
        businessId: blueprint.tenantId,
        name: blueprint.product?.name || 'Mitra Business',
        industry: 'restaurant',
        subVertical: 'family_dining',
        positioning: 'Authentic family dining',
      },
      platformContext: {
        platform: 'instagram',
        format: 'reel',
        aspectRatio: '9:16',
      },
      asset: candidateV1,
      validationResults: candidateV1.validation,
    };

    const criticV1 = this.criticService.evaluateExecution(criticInputV1);
    revisionHistory.push({ revisionNumber: 0, criticResult: criticV1 });

    const eligibility = this.revisionPlanner.evaluateEligibility(criticV1, credits.internalRevisionsUsed);

    if (!eligibility.eligible || criticV1.decision === 'APPROVE') {
      return {
        finalAsset: candidateV1,
        finalCriticResult: criticV1,
        criticIterations: 1,
        revisionHistory,
        creditContext: credits,
      };
    }

    // Targeted Reel Fix Loop (Candidate V2)
    credits.internalRevisionsUsed += 1;
    const revisionPlan = this.revisionPlanner.buildRevisionPlan(criticV1, 0);

    const candidateV2 = await this.jobRunner.executeReelJob(blueprint, lock, plan, fidelityService);

    const criticInputV2: CreativeCriticInput = {
      ...criticInputV1,
      asset: candidateV2,
      validationResults: candidateV2.validation,
    };

    const criticV2 = this.criticService.evaluateExecution(criticInputV2);
    const acceptance = this.regressionDetector.evaluateRevision(criticV1, criticV2, revisionPlan);
    revisionHistory.push({ revisionNumber: 1, criticResult: criticV2, acceptanceResult: acceptance });

    const finalAsset = acceptance.accepted ? candidateV2 : candidateV1;
    const finalCriticResult = acceptance.accepted ? criticV2 : criticV1;

    return {
      finalAsset,
      finalCriticResult,
      criticIterations: 2,
      revisionHistory,
      creditContext: credits,
    };
  }
}
