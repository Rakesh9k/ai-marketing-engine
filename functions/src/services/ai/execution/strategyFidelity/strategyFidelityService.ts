/**
 * PHASE 17 — Strategy Fidelity Service (Master Facade)
 * Coordinates Strategy Locking, Strategy Manifest Derivation, Execution Request Packaging,
 * and Strategy Fidelity Evaluation.
 */

import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import type {
  ExecutionCandidateOutput,
  ExecutionRequest,
  StrategyFidelityResult,
  StrategyLock,
} from './strategyFidelity.types';
import { StrategyFidelityValidator } from './strategyFidelityValidator';
import { StrategyLockService } from './strategyLockService';
import { StrategyManifestService } from './strategyManifestService';

export class StrategyFidelityService {
  private readonly lockService: StrategyLockService;
  private readonly manifestService: StrategyManifestService;
  private readonly validator: StrategyFidelityValidator;

  constructor(
    lockService?: StrategyLockService,
    manifestService?: StrategyManifestService,
    validator?: StrategyFidelityValidator
  ) {
    this.lockService = lockService || new StrategyLockService();
    this.manifestService = manifestService || new StrategyManifestService();
    this.validator = validator || new StrategyFidelityValidator();
  }

  /**
   * Freezes an approved CreativeBlueprint into a StrategyLock, derives the StrategyManifest,
   * and packages an ExecutionRequest for the execution compiler.
   */
  public prepareExecutionRequest(
    blueprint: CreativeBlueprint,
    existingLock?: StrategyLock,
    promptOverrides?: Record<string, unknown>
  ): ExecutionRequest {
    const lock = existingLock || this.lockService.createLock(blueprint);
    const manifest = this.manifestService.deriveManifest(blueprint, lock);
    const requestId = `exec_req_${blueprint.id}_${Date.now()}`;

    return {
      requestId,
      blueprint,
      lock,
      manifest,
      promptOverrides,
    };
  }

  /**
   * Verifies lock integrity and evaluates execution candidate output against approved strategy.
   */
  public verifyFidelity(
    request: ExecutionRequest,
    candidateOutput: ExecutionCandidateOutput
  ): StrategyFidelityResult {
    // 1. Verify Strategy Lock Integrity
    const isLockValid = this.lockService.verifyLock(request.lock, request.blueprint);
    if (!isLockValid) {
      return {
        isFitted: false,
        score: {
          overallScore: 0,
          breakdown: {
            coreConcept: 0,
            creativeMechanism: 0,
            audienceTension: 0,
            messageHierarchy: 0,
            emotionalDirection: 0,
            visualDirection: 0,
            offerRole: 0,
            tone: 0,
            ctaIntent: 0,
          },
          passesThreshold: false,
        },
        drift: {
          hasDrift: true,
          driftScore: 100,
          driftFactors: ['LOCK_HASH_MISMATCH'],
          violations: ['Strategy Lock Tampering Detected: Blueprint strategic fields do not match lock hash.'],
          offerDominanceDetected: false,
        },
        manifest: request.manifest,
        approved: false,
        reason: 'Rejected due to Strategy Lock Tampering: Blueprint strategic fields do not match frozen lock hash.',
      };
    }

    // 2. Evaluate Strategic Fidelity
    return this.validator.evaluateFidelity(
      request.blueprint,
      request.lock,
      request.manifest,
      candidateOutput
    );
  }
}
