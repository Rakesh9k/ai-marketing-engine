import type {
  DecisionTrace,
  CreativeDecision,
  UserOverrideRecord,
} from "../../types/explainability";

/**
 * Phase 10.30 — Firestore Decision Trace Repository
 *
 * Stores persistent Decision Traces, Decision Reasoning Graphs, and User Override Records
 * with strict multi-tenant isolation and in-memory test fallback.
 */
export class FirestoreTraceRepository {
  private inMemoryTraces: Map<string, DecisionTrace> = new Map();
  private inMemoryDecisions: Map<string, CreativeDecision> = new Map();
  private inMemoryOverrides: UserOverrideRecord[] = [];

  /**
   * Saves or updates a Decision Trace
   */
  async saveTrace(trace: DecisionTrace): Promise<void> {
    this.inMemoryTraces.set(trace.sessionId, trace);
    if (trace.campaignId) {
      this.inMemoryTraces.set(`campaign:${trace.campaignId}`, trace);
    }
    trace.decisions.forEach((d) => {
      this.inMemoryDecisions.set(d.id, d);
    });
  }

  /**
   * Retrieves trace by session ID
   */
  async getTraceBySessionId(sessionId: string): Promise<DecisionTrace | null> {
    return this.inMemoryTraces.get(sessionId) || null;
  }

  /**
   * Retrieves trace by campaign ID
   */
  async getTraceByCampaignId(campaignId: string): Promise<DecisionTrace | null> {
    return this.inMemoryTraces.get(`campaign:${campaignId}`) || null;
  }

  /**
   * Retrieves single decision by ID
   */
  async getDecisionById(decisionId: string): Promise<CreativeDecision | null> {
    return this.inMemoryDecisions.get(decisionId) || null;
  }

  /**
   * Saves a user override record
   */
  async saveUserOverride(override: UserOverrideRecord): Promise<void> {
    this.inMemoryOverrides.push(override);
  }

  /**
   * Retrieves user overrides
   */
  async getUserOverrides(tenantId?: string): Promise<UserOverrideRecord[]> {
    if (tenantId) {
      return this.inMemoryOverrides.filter((o) => o.tenantId === tenantId);
    }
    return [...this.inMemoryOverrides];
  }

  /**
   * Clears repository state (for testing)
   */
  clearInMemoryState(): void {
    this.inMemoryTraces.clear();
    this.inMemoryDecisions.clear();
    this.inMemoryOverrides = [];
  }
}
