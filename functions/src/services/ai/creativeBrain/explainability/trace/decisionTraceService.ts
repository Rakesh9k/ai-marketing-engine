import type {
  CreativeDecision,
  DecisionTrace,
  DecisionType,
  DecisionAlternative,
  DecisionInput,
  DecisionEvidence,
  DecisionConstraint,
} from "../../types/explainability";
import { ConfidenceService } from "../confidence/confidenceService";
import { FirestoreTraceRepository } from "../persistence/firestoreTraceRepository";

export interface RecordDecisionInput {
  sessionId: string;
  campaignId?: string;
  tenantId?: string;
  decisionType: DecisionType;
  selectedItemId?: string;
  selectedValue?: unknown;
  selectedName: string;
  alternatives?: DecisionAlternative[];
  inputs?: DecisionInput[];
  evidence?: DecisionEvidence[];
  constraints?: DecisionConstraint[];
  primaryReason: string;
  supportingReasons?: string[];
  tradeoffs?: string[];
  rejectionReasons?: string[];
  compatibilityScore?: number;
}

/**
 * Phase 10.30 — Decision Trace Service
 *
 * Instruments Creative Brain to capture Decision Traces AT DECISION TIME.
 * CRITICAL RULE: Explanations MUST originate from structured traces recorded at decision time,
 * NEVER from post-hoc LLM rationalization.
 */
export class DecisionTraceService {
  constructor(private repository: FirestoreTraceRepository = new FirestoreTraceRepository()) {}

  /**
   * Initializes or retrieves an active Decision Trace for a session
   */
  async getOrCreateTrace(sessionId: string, campaignId?: string, tenantId?: string): Promise<DecisionTrace> {
    let trace = await this.repository.getTraceBySessionId(sessionId);
    if (!trace) {
      trace = {
        id: `trace_${sessionId}`,
        sessionId,
        campaignId,
        tenantId,
        contextSnapshot: {
          businessBrainVersion: "v1.0",
          campaignIntentVersion: "v1.0",
          creativeOpportunityVersion: "v1.0",
        },
        decisions: [],
        createdAt: new Date().toISOString(),
        version: 1,
      };
      await this.repository.saveTrace(trace);
    }
    return trace;
  }

  /**
   * Records a CreativeDecision into the active trace at decision time
   */
  async recordDecision(input: RecordDecisionInput): Promise<CreativeDecision> {
    const trace = await this.getOrCreateTrace(input.sessionId, input.campaignId, input.tenantId);

    const decisionId = `dec_${input.sessionId}_${input.decisionType}_${Date.now()}`;
    const inputs = input.inputs || [];
    const evidence = input.evidence || [];
    const confidence = ConfidenceService.calculateConfidence(inputs, evidence, input.compatibilityScore || 0.85);

    const decision: CreativeDecision = {
      id: decisionId,
      sessionId: input.sessionId,
      campaignId: input.campaignId,
      tenantId: input.tenantId,
      decisionType: input.decisionType,
      selectedItemId: input.selectedItemId,
      selectedValue: input.selectedValue,
      selectedName: input.selectedName,
      alternatives: input.alternatives || [],
      inputs,
      evidence,
      constraints: input.constraints || [],
      compatibility: [],
      reasoning: {
        primaryReason: input.primaryReason,
        supportingReasons: input.supportingReasons || [],
        tradeoffs: input.tradeoffs || [],
        rejectionReasons: input.rejectionReasons || [],
      },
      confidence,
      createdAt: new Date().toISOString(),
    };

    trace.decisions.push(decision);
    trace.version += 1;
    await this.repository.saveTrace(trace);

    return decision;
  }
}
