/**
 * PHASE 24 — Master Confidence Engine
 * Central orchestrator managing Creative Confidence State, Evidence Ingestion, Idempotency,
 * Contradictions, Propagation, Readiness Checks, Question Ranking, Diagnostic Tooling, and History.
 */

import type {
  CreativeConfidenceDimension,
  CreativeConfidence,
  CreativeConfidenceState,
  CreativeConfidenceContext,
  ConfidenceUpdateRequest,
  ConfidenceUpdateResult,
  ConfidenceEvidence,
  ConfidenceHistoryEntry,
  DiagnosticConfidenceReport,
  QuestionValue,
} from './confidence.types';
import { ConfidenceScoring } from './confidenceScoring';
import { ConfidenceReadinessEvaluator } from './confidenceReadiness';
import { ConfidencePropagation } from './confidencePropagation';
import { ConfidenceContradictions } from './confidenceContradictions';
import type { CandidateQuestion } from './questionEvaluator';
import { QuestionEvaluator } from './questionEvaluator';

export class ConfidenceEngine {
  private states: Map<string, CreativeConfidenceState> = new Map();
  private processedEvents: Set<string> = new Set();

  private readonly ALL_DIMENSIONS: CreativeConfidenceDimension[] = [
    'AUDIENCE',
    'OBJECTIVE',
    'PRODUCT',
    'OFFER',
    'CUSTOMER_INSIGHT',
    'DIFFERENTIATOR',
    'EMOTIONAL_DIRECTION',
    'PROOF',
    'CTA',
    'PLATFORM',
    'FORMAT',
  ];

  /**
   * Initializes confidence state for a campaign with baseline dimensions and optional evidence.
   */
  public initializeConfidenceState(
    tenantId: string,
    businessId: string,
    campaignId: string,
    initialEvidence: Array<{
      dimension: CreativeConfidenceDimension;
      source: any;
      strength: number;
      explanation: string;
      referenceId?: string;
    }> = [],
    context?: Partial<CreativeConfidenceContext>
  ): CreativeConfidenceState {
    const fullContext: CreativeConfidenceContext = {
      tenantId,
      businessId,
      campaignId,
      ...context,
    };

    const dimensions = {} as Record<CreativeConfidenceDimension, CreativeConfidence>;

    for (const dim of this.ALL_DIMENSIONS) {
      dimensions[dim] = {
        dimension: dim,
        score: 0.0,
        status: 'UNKNOWN',
        evidence: [],
        sourceTypes: [],
        lastUpdatedAt: new Date().toISOString(),
        blocking: ConfidenceScoring.isDimensionBlocking(dim, fullContext.stage),
        requiredForCurrentStage: ConfidenceScoring.isDimensionBlocking(dim, fullContext.stage),
        uncertaintyReason: `No evidence gathered yet for ${dim}`,
      };
    }

    // Process initial evidence items
    for (const evItem of initialEvidence) {
      const dimState = dimensions[evItem.dimension];
      if (dimState) {
        const ev: ConfidenceEvidence = {
          id: `ev_init_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          source: evItem.source,
          strength: evItem.strength,
          explanation: evItem.explanation,
          referenceId: evItem.referenceId,
          createdAt: new Date().toISOString(),
        };
        dimState.evidence.push(ev);
        if (!dimState.sourceTypes.includes(ev.source)) {
          dimState.sourceTypes.push(ev.source);
        }
        dimState.score = ConfidenceScoring.calculateCombinedScore(dimState.evidence);
        dimState.status = ConfidenceScoring.getStatusForScore(dimState.score);
        dimState.uncertaintyReason = dimState.score >= 0.75 ? undefined : `Confidence score ${dimState.score} below threshold`;
      }
    }

    // Run propagation across initial evidence
    ConfidencePropagation.propagate(dimensions, this.ALL_DIMENSIONS);

    // Evaluate initial readiness
    const overallReadiness = ConfidenceReadinessEvaluator.evaluateReadiness(
      dimensions,
      fullContext.stage
    );

    const state: CreativeConfidenceState = {
      campaignId,
      tenantId,
      businessId,
      context: fullContext,
      dimensions,
      overallReadiness,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.states.set(campaignId, state);
    return state;
  }

  /**
   * Retrieves active confidence state for a campaign.
   */
  public getConfidenceState(campaignId: string): CreativeConfidenceState | undefined {
    return this.states.get(campaignId);
  }

  /**
   * Ingests new evidence, resolves contradictions, propagates confidence, and reassesses readiness.
   */
  public updateConfidence(request: ConfidenceUpdateRequest): ConfidenceUpdateResult {
    let state = this.states.get(request.campaignId);
    if (!state) {
      state = this.initializeConfidenceState(
        request.tenantId,
        request.businessId,
        request.campaignId
      );
    }

    const previousState = JSON.parse(JSON.stringify(state)) as CreativeConfidenceState;
    const changedDimensions: Set<CreativeConfidenceDimension> = new Set();
    const newlyReadyDimensions: Set<CreativeConfidenceDimension> = new Set();
    const newlyBlockingDimensions: Set<CreativeConfidenceDimension> = new Set();

    for (const evInput of request.evidence) {
      const dim = evInput.dimension;
      const dimState = state.dimensions[dim];
      if (!dimState) continue;

      // Idempotency check: eventId + campaignId + dimension
      const idempotencyKey = `${request.sourceEventId || 'evt'}_${request.campaignId}_${dim}_${evInput.explanation}`;
      if (this.processedEvents.has(idempotencyKey)) {
        continue; // Skip duplicate processing
      }
      this.processedEvents.add(idempotencyKey);

      // Check for contradictions against historical context
      const contradiction = ConfidenceContradictions.detectContradiction(
        dim,
        dimState.evidence,
        evInput.userContent || evInput.explanation
      );

      if (contradiction && contradiction.resolutionStrategy === 'CURRENT_CAMPAIGN_OVERRIDE') {
        // Current campaign user instruction overrides historical Business Brain for this campaign
        dimState.evidence = dimState.evidence.filter((e) => e.source !== 'BUSINESS_BRAIN');
      }

      const newEv: ConfidenceEvidence = {
        id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        source: evInput.source,
        strength: evInput.strength,
        explanation: evInput.explanation,
        referenceId: evInput.referenceId,
        eventId: request.sourceEventId,
        createdAt: new Date().toISOString(),
      };

      dimState.evidence.push(newEv);
      if (!dimState.sourceTypes.includes(newEv.source)) {
        dimState.sourceTypes.push(newEv.source);
      }

      const prevScore = dimState.score;
      dimState.score = ConfidenceScoring.calculateCombinedScore(dimState.evidence);
      dimState.status = ConfidenceScoring.getStatusForScore(dimState.score);
      dimState.lastUpdatedAt = new Date().toISOString();
      dimState.uncertaintyReason = dimState.score >= 0.75 ? undefined : `Score ${dimState.score} below threshold`;

      if (prevScore !== dimState.score) {
        changedDimensions.add(dim);

        // Record in history
        const historyEntry: ConfidenceHistoryEntry = {
          id: `hist_${Date.now()}_${dim}`,
          campaignId: request.campaignId,
          dimension: dim,
          previousScore: prevScore,
          newScore: dimState.score,
          reason: evInput.explanation,
          evidenceIds: [newEv.id],
          createdAt: new Date().toISOString(),
        };
        state.history.push(historyEntry);

        if (prevScore < 0.75 && dimState.score >= 0.75) {
          newlyReadyDimensions.add(dim);
        } else if (prevScore >= 0.75 && dimState.score < 0.75 && dimState.blocking) {
          newlyBlockingDimensions.add(dim);
        }
      }
    }

    // Propagate confidence updates along dependency graph
    if (changedDimensions.size > 0) {
      const propagated = ConfidencePropagation.propagate(
        state.dimensions,
        Array.from(changedDimensions)
      );
      propagated.forEach((d) => changedDimensions.add(d));
    }

    // Re-evaluate overall readiness
    state.overallReadiness = ConfidenceReadinessEvaluator.evaluateReadiness(
      state.dimensions,
      state.context.stage
    );
    state.updatedAt = new Date().toISOString();

    return {
      previousState,
      currentState: state,
      changedDimensions: Array.from(changedDimensions),
      newlyReadyDimensions: Array.from(newlyReadyDimensions),
      newlyBlockingDimensions: Array.from(newlyBlockingDimensions),
      readyForOpportunity: state.overallReadiness.ready,
    };
  }

  /**
   * Selects the highest-value candidate question targeting weak confidence dimensions.
   * Returns undefined if readiness is achieved or no question provides meaningful information gain.
   */
  public selectNextQuestion(
    campaignId: string,
    candidateQuestions: CandidateQuestion[]
  ): QuestionValue | undefined {
    const state = this.states.get(campaignId);
    if (!state) return undefined;

    const bestQuestion = QuestionEvaluator.selectBestQuestion(
      candidateQuestions,
      state.dimensions,
      state.overallReadiness
    );

    if (bestQuestion) {
      state.lastQuestionId = bestQuestion.questionId;
    }

    return bestQuestion;
  }

  /**
   * Generates a diagnostic report for developer/admin inspection.
   */
  public getDiagnosticReport(campaignId: string): DiagnosticConfidenceReport {
    const state = this.states.get(campaignId);
    if (!state) {
      throw new Error(`Campaign ${campaignId} not found in Confidence Engine`);
    }

    const dimensionSummary = Object.values(state.dimensions).map((d) => ({
      dimension: d.dimension,
      score: d.score,
      status: d.status,
      blocking: d.blocking,
      evidenceCount: d.evidence.length,
      topSource: d.sourceTypes[0] || 'NONE',
    }));

    return {
      campaignId,
      readinessStatus: state.overallReadiness.ready ? 'READY' : 'NOT_READY',
      overallScore: state.overallReadiness.overallScore,
      blockingDimensions: state.overallReadiness.blockingDimensions,
      dimensionSummary,
      currentBlocker: state.overallReadiness.blockingDimensions[0],
    };
  }
}
