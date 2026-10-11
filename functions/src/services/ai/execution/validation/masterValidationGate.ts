/**
 * PHASE 18 — Master Validation Gate
 * Coordinates all validation gates in strict sequential order:
 * Technical -> Truth -> Brand -> Quality -> Platform -> Strategy Fidelity.
 */

import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import type { ExecutionCandidateOutput, StrategyFidelityService, StrategyLock } from '../strategyFidelity';
import type { CombinedValidationResults } from '../types/execution.types';
import { CreativeQualityEvaluator } from './creativeQualityEvaluator';
import { PlatformValidator } from './platformValidator';
import { TechnicalValidator } from './technicalValidator';
import { TruthBrandValidator } from './truthBrandValidator';

export class MasterValidationGate {
  private readonly technicalValidator: TechnicalValidator;
  private readonly truthBrandValidator: TruthBrandValidator;
  private readonly qualityEvaluator: CreativeQualityEvaluator;
  private readonly platformValidator: PlatformValidator;

  constructor(
    technicalValidator?: TechnicalValidator,
    truthBrandValidator?: TruthBrandValidator,
    qualityEvaluator?: CreativeQualityEvaluator,
    platformValidator?: PlatformValidator
  ) {
    this.technicalValidator = technicalValidator || new TechnicalValidator();
    this.truthBrandValidator = truthBrandValidator || new TruthBrandValidator();
    this.qualityEvaluator = qualityEvaluator || new CreativeQualityEvaluator();
    this.platformValidator = platformValidator || new PlatformValidator();
  }

  /**
   * Validates final post asset deliverables against all blocking and advisory gates.
   */
  public validatePostAsset(
    blueprint: CreativeBlueprint,
    lock: StrategyLock,
    fidelityService: StrategyFidelityService,
    assetData: {
      width: number;
      height: number;
      aspectRatio: string;
      sizeBytes: number;
      buffer?: Buffer;
      headline?: string;
      copy?: string;
      visualConcept?: string;
      offerProminence?: number;
      tone?: string;
      cta?: string;
      hasLogo?: boolean;
    }
  ): CombinedValidationResults {
    // 1. Technical Check
    const technicalCheck = this.technicalValidator.validateRaster(
      assetData.width,
      assetData.height,
      assetData.sizeBytes,
      assetData.buffer
    );

    // 2. Truth Check
    const truthCheck = this.truthBrandValidator.evaluateTruth(
      blueprint,
      assetData.headline,
      assetData.copy
    );

    // 3. Brand Check
    const brandCheck = this.truthBrandValidator.evaluateBrand(
      blueprint,
      assetData.headline,
      assetData.hasLogo !== false
    );

    // 4. Creative Quality Evaluation
    const creativeQualityCheck = this.qualityEvaluator.evaluateQuality(
      assetData.headline,
      assetData.visualConcept,
      assetData.cta
    );

    // 5. Platform Check
    const platformCheck = this.platformValidator.validatePlatformConstraints(
      assetData.aspectRatio,
      assetData.width,
      assetData.height,
      undefined,
      assetData.sizeBytes
    );

    // 6. Strategy Fidelity Check (Phase 17)
    const candidateOutput: ExecutionCandidateOutput = {
      headline: assetData.headline,
      copy: assetData.copy,
      visualConcept: assetData.visualConcept,
      offerProminence: assetData.offerProminence ?? 40,
      tone: assetData.tone || blueprint.tone?.primary,
      cta: assetData.cta || blueprint.cta?.action,
    };

    const execRequest = fidelityService.prepareExecutionRequest(blueprint, lock);
    const strategyFidelity = fidelityService.verifyFidelity(execRequest, candidateOutput);

    // Combine All Gates
    const blockingPass =
      technicalCheck.passed &&
      truthCheck.passed &&
      brandCheck.passed &&
      platformCheck.passed &&
      strategyFidelity.approved;

    let blockingFailure: string | undefined;
    if (!blockingPass) {
      if (!technicalCheck.passed) blockingFailure = technicalCheck.details.join('; ');
      else if (!truthCheck.passed) blockingFailure = truthCheck.details.join('; ');
      else if (!brandCheck.passed) blockingFailure = brandCheck.details.join('; ');
      else if (!platformCheck.passed) blockingFailure = platformCheck.details.join('; ');
      else if (!strategyFidelity.approved) blockingFailure = strategyFidelity.reason || 'Strategy Fidelity Failed';
    }

    return {
      technicalCheck,
      truthCheck,
      brandCheck,
      creativeQualityCheck,
      platformCheck,
      strategyFidelity,
      allPassed: blockingPass,
      blockingFailure,
    };
  }

  /**
   * Validates final rendered reel MP4 deliverables against all blocking and advisory gates.
   */
  public validateReelAsset(
    blueprint: CreativeBlueprint,
    lock: StrategyLock,
    fidelityService: StrategyFidelityService,
    reelData: {
      storagePath: string;
      width: number;
      height: number;
      durationMs: number;
      headline?: string;
      copy?: string;
      visualConcept?: string;
      tone?: string;
      cta?: string;
    }
  ): CombinedValidationResults {
    // 1. Technical MP4 Check
    const technicalCheck = this.technicalValidator.validateMP4(
      reelData.storagePath,
      reelData.durationMs
    );

    // 2. Truth Check
    const truthCheck = this.truthBrandValidator.evaluateTruth(
      blueprint,
      reelData.headline,
      reelData.copy
    );

    // 3. Brand Check
    const brandCheck = this.truthBrandValidator.evaluateBrand(
      blueprint,
      reelData.headline,
      true
    );

    // 4. Creative Quality Evaluation
    const creativeQualityCheck = this.qualityEvaluator.evaluateQuality(
      reelData.headline,
      reelData.visualConcept,
      reelData.cta
    );

    // 5. Platform Check
    const platformCheck = this.platformValidator.validatePlatformConstraints(
      '9:16',
      reelData.width,
      reelData.height,
      reelData.durationMs
    );

    // 6. Strategy Fidelity Check
    const candidateOutput: ExecutionCandidateOutput = {
      headline: reelData.headline || blueprint.messageHierarchy?.primaryMessage,
      copy: reelData.copy,
      visualConcept: reelData.visualConcept || blueprint.visualDirection?.visualConcept,
      offerProminence: 40,
      tone: reelData.tone || blueprint.tone?.primary,
      cta: reelData.cta || blueprint.cta?.action,
    };

    const execRequest = fidelityService.prepareExecutionRequest(blueprint, lock);
    const strategyFidelity = fidelityService.verifyFidelity(execRequest, candidateOutput);

    const blockingPass =
      technicalCheck.passed &&
      truthCheck.passed &&
      brandCheck.passed &&
      platformCheck.passed &&
      strategyFidelity.approved;

    let blockingFailure: string | undefined;
    if (!blockingPass) {
      if (!technicalCheck.passed) blockingFailure = technicalCheck.details.join('; ');
      else if (!truthCheck.passed) blockingFailure = truthCheck.details.join('; ');
      else if (!brandCheck.passed) blockingFailure = brandCheck.details.join('; ');
      else if (!platformCheck.passed) blockingFailure = platformCheck.details.join('; ');
      else if (!strategyFidelity.approved) blockingFailure = strategyFidelity.reason || 'Strategy Fidelity Failed';
    }

    return {
      technicalCheck,
      truthCheck,
      brandCheck,
      creativeQualityCheck,
      platformCheck,
      strategyFidelity,
      allPassed: blockingPass,
      blockingFailure,
    };
  }
}
