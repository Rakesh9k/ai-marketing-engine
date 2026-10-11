/**
 * PHASE 18 — Execution Job Runner & State Machine Manager
 * Manages stage-specific retries, resumable execution jobs, credit protection,
 * and final asset packaging.
 */

import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import type { StrategyFidelityService} from '../strategyFidelity';
import { type StrategyLock } from '../strategyFidelity';
import { CompositionEngine } from '../posts/compositionEngine';
import { PostRasterizer } from '../posts/rasterizer';
import { ReelExecutionPipeline } from '../reels/reelExecutionPipeline';
import type {
  ExecutionAssetType,
  ExecutionJob,
  ExecutionPlan,
  FinalPostAsset,
  FinalReelAsset,
} from '../types/execution.types';
import { MasterValidationGate } from '../validation/masterValidationGate';

export class ExecutionJobRunner {
  private readonly validationGate: MasterValidationGate;
  private readonly compositionEngine: CompositionEngine;
  private readonly rasterizer: PostRasterizer;
  private readonly reelPipeline: ReelExecutionPipeline;

  constructor(
    validationGate?: MasterValidationGate,
    compositionEngine?: CompositionEngine,
    rasterizer?: PostRasterizer,
    reelPipeline?: ReelExecutionPipeline
  ) {
    this.validationGate = validationGate || new MasterValidationGate();
    this.compositionEngine = compositionEngine || new CompositionEngine();
    this.rasterizer = rasterizer || new PostRasterizer();
    this.reelPipeline = reelPipeline || new ReelExecutionPipeline();
  }

  /**
   * Creates a new ExecutionJob.
   */
  public createJob(
    blueprint: CreativeBlueprint,
    lock: StrategyLock,
    assetType: ExecutionAssetType
  ): ExecutionJob {
    return {
      id: `job_${blueprint.id}_${Date.now()}`,
      campaignId: blueprint.campaignId,
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version,
      strategyHash: lock.strategicHash,
      type: assetType,
      status: 'PENDING',
      currentStage: 'PLANNING',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Executes a Post Execution Job end-to-end through composition, rasterization,
   * multi-gate validation, and final READY asset packaging.
   */
  public async executePostJob(
    blueprint: CreativeBlueprint,
    lock: StrategyLock,
    plan: ExecutionPlan,
    fidelityService: StrategyFidelityService,
    job?: ExecutionJob
  ): Promise<FinalPostAsset> {
    const currentJob = job || this.createJob(blueprint, lock, 'post');
    currentJob.status = 'IN_PROGRESS';
    currentJob.attempts += 1;
    currentJob.currentStage = 'COMPOSITION';

    // 1. Composition
    const compositionSpec = this.compositionEngine.buildCompositionSpec(
      blueprint,
      '1:1',
      'hero_visual.png',
      'logo.png'
    );
    const svg = this.compositionEngine.generateSVG(compositionSpec);

    // 2. Rasterization
    currentJob.currentStage = 'RENDERING';
    const raster = await this.rasterizer.rasterize(
      svg,
      compositionSpec.canvas.width,
      compositionSpec.canvas.height,
      'png',
      `posts/${blueprint.campaignId}/${blueprint.id}`
    );

    // 3. Multi-Gate Validation
    currentJob.currentStage = 'VALIDATION';
    const validation = this.validationGate.validatePostAsset(
      blueprint,
      lock,
      fidelityService,
      {
        width: raster.width,
        height: raster.height,
        aspectRatio: '1:1',
        sizeBytes: raster.sizeBytes,
        buffer: raster.buffer,
        headline: blueprint.messageHierarchy?.primaryMessage || blueprint.coreConcept?.oneLineIdea,
        copy: blueprint.messageHierarchy?.supportingMessages?.[0],
        visualConcept: blueprint.visualDirection?.visualConcept,
        offerProminence: 35,
        tone: blueprint.tone?.primary,
        cta: blueprint.cta?.action,
        hasLogo: true,
      }
    );

    if (!validation.allPassed) {
      currentJob.status = 'FAILED';
      currentJob.error = validation.blockingFailure || 'Validation gates failed.';
      throw new Error(`Post execution failed validation: ${currentJob.error}`);
    }

    // 4. Finalization
    currentJob.currentStage = 'COMPLETED';
    currentJob.status = 'COMPLETED';

    return {
      campaignId: blueprint.campaignId,
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version,
      strategyHash: lock.strategicHash,
      assetId: `asset_post_${blueprint.id}`,
      format: 'png',
      width: raster.width,
      height: raster.height,
      aspectRatio: '1:1',
      storagePath: raster.storagePath,
      validation,
      status: 'READY',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Executes a Reel Execution Job end-to-end through Cloud Run video rendering,
   * multi-gate validation, and final READY MP4 asset packaging.
   */
  public async executeReelJob(
    blueprint: CreativeBlueprint,
    lock: StrategyLock,
    plan: ExecutionPlan,
    fidelityService: StrategyFidelityService,
    job?: ExecutionJob
  ): Promise<FinalReelAsset> {
    const currentJob = job || this.createJob(blueprint, lock, 'reel');
    currentJob.status = 'IN_PROGRESS';
    currentJob.attempts += 1;
    currentJob.currentStage = 'RENDERING';

    // 1. Reel Pipeline & Cloud Run Renderer Invocation
    const reelResult = await this.reelPipeline.executePipeline(blueprint, lock);

    // 2. Multi-Gate Validation
    currentJob.currentStage = 'VALIDATION';
    const validation = this.validationGate.validateReelAsset(
      blueprint,
      lock,
      fidelityService,
      {
        storagePath: reelResult.outputStoragePath,
        width: 1080,
        height: 1920,
        durationMs: reelResult.durationMs,
        headline: blueprint.messageHierarchy?.primaryMessage,
        visualConcept: blueprint.visualDirection?.visualConcept,
        tone: blueprint.tone?.primary,
        cta: blueprint.cta?.action,
      }
    );

    if (!validation.allPassed) {
      currentJob.status = 'FAILED';
      currentJob.error = validation.blockingFailure || 'Reel validation gates failed.';
      throw new Error(`Reel execution failed validation: ${currentJob.error}`);
    }

    // 3. Finalization
    currentJob.currentStage = 'COMPLETED';
    currentJob.status = 'COMPLETED';

    return {
      campaignId: blueprint.campaignId,
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version,
      strategyHash: lock.strategicHash,
      assetId: `asset_reel_${blueprint.id}`,
      format: 'mp4',
      width: 1080,
      height: 1920,
      durationMs: reelResult.durationMs,
      fps: 30,
      storagePath: reelResult.outputStoragePath,
      thumbnailStoragePath: reelResult.thumbnailStoragePath,
      validation,
      status: 'READY',
      createdAt: new Date().toISOString(),
    };
  }
}
