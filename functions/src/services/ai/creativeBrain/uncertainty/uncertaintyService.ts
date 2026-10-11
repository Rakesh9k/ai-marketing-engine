/**
 * PHASE 25 — Uncertainty Master Service Facade
 * Connects user uncertainty interactions ("I'm not sure", "Let Mitra decide", "None of these")
 * with candidate generation, strategy resolution, and the Master Confidence Engine.
 */

import type { CreativeConfidenceDimension } from '../confidence/confidence.types';
import { ConfidenceEngine } from '../confidence/confidenceEngine';
import { UncertaintyResolver } from './uncertaintyResolver';
import type { BusinessBrainContextPayload } from './candidateGenerator';
import type {
  UncertaintyResolutionResult,
  CreativeCandidate,
  CreativeUncertaintySignal,
} from './uncertainty.types';

export class UncertaintyService {
  private resolver: UncertaintyResolver = new UncertaintyResolver();
  private signals: Map<string, CreativeUncertaintySignal[]> = new Map();
  private attemptCounts: Map<string, number> = new Map();

  constructor(private confidenceEngine?: ConfidenceEngine) {
    if (!this.confidenceEngine) {
      this.confidenceEngine = new ConfidenceEngine();
    }
  }

  /**
   * Main entry point when user clicks "I'm not sure".
   */
  public handleUserUncertainty(
    sessionId: string,
    campaignId: string,
    questionId: string,
    dimension: CreativeConfidenceDimension,
    context: BusinessBrainContextPayload
  ): UncertaintyResolutionResult {
    const key = `${sessionId}_${dimension}`;
    const currentAttempt = (this.attemptCounts.get(key) || 0) + 1;
    this.attemptCounts.set(key, currentAttempt);

    // Record uncertainty signal
    const signal: CreativeUncertaintySignal = {
      id: `unc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: 'tenant_default',
      businessId: context.businessId,
      campaignId,
      sessionId,
      questionId,
      dimension,
      type: 'USER_UNCERTAIN',
      createdAt: new Date().toISOString(),
      resolved: false,
    };

    const sessionSignals = this.signals.get(sessionId) || [];
    sessionSignals.push(signal);
    this.signals.set(sessionId, sessionSignals);

    return this.resolver.resolveUncertainty(
      sessionId,
      campaignId,
      dimension,
      currentAttempt,
      context
    );
  }

  /**
   * Entry point when user selects "Let Mitra decide".
   */
  public handleUserDelegation(
    sessionId: string,
    campaignId: string,
    questionId: string,
    dimension: CreativeConfidenceDimension,
    context: BusinessBrainContextPayload
  ): UncertaintyResolutionResult {
    const result = this.resolver.handleUserDelegation(
      sessionId,
      campaignId,
      dimension,
      context
    );

    // Update confidence engine with provisional recommendation
    if (result.provisionalRecommendation && this.confidenceEngine) {
      this.confidenceEngine.updateConfidence({
        campaignId,
        tenantId: 'tenant_default',
        businessId: context.businessId,
        sourceEventId: `evt_delegation_${Date.now()}`,
        evidence: [
          {
            dimension,
            source: 'SYSTEM_DERIVATION',
            strength: result.provisionalRecommendation.confidence,
            explanation: `Provisional recommendation: ${result.provisionalRecommendation.label}`,
          },
        ],
      });
    }

    return result;
  }

  /**
   * Entry point when user selects "None of these".
   */
  public handleNoneOfThese(
    sessionId: string,
    campaignId: string,
    questionId: string,
    dimension: CreativeConfidenceDimension,
    context: BusinessBrainContextPayload
  ): UncertaintyResolutionResult {
    return this.resolver.handleNoneOfThese(
      sessionId,
      campaignId,
      dimension,
      context
    );
  }

  /**
   * Completes uncertainty resolution when user picks a candidate from grounded options.
   */
  public resolveCandidateSelection(
    sessionId: string,
    campaignId: string,
    dimension: CreativeConfidenceDimension,
    candidate: CreativeCandidate,
    context: BusinessBrainContextPayload
  ): void {
    if (this.confidenceEngine) {
      this.confidenceEngine.updateConfidence({
        campaignId,
        tenantId: 'tenant_default',
        businessId: context.businessId,
        sourceEventId: `evt_cand_select_${Date.now()}`,
        evidence: [
          {
            dimension,
            source: 'USER_SELECTION',
            strength: 0.88,
            explanation: `User selected candidate: "${candidate.label}" from grounded choices`,
          },
        ],
      });
    }

    // Mark signals as resolved
    const sessionSignals = this.signals.get(sessionId) || [];
    sessionSignals.forEach((sig) => {
      if (sig.dimension === dimension && !sig.resolved) {
        sig.resolved = true;
        sig.resolutionMethod = 'USER_SELECTION';
      }
    });
  }

  /**
   * Retrieves logged uncertainty signals for a session.
   */
  public getSessionUncertaintySignals(sessionId: string): CreativeUncertaintySignal[] {
    return this.signals.get(sessionId) || [];
  }
}
