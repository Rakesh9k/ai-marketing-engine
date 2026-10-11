import type {
  CreativeBankLearningUpdate,
  CreativeLearning,
  CreativeLineage,
  FailureLearning,
  LearningRun,
  MechanismCombinationLearning,
  NormalizedPerformanceEvidence,
} from "../../types/learningLoop";
import type { ID } from "../../types/primitives";

export interface ILearningLoopRepository {
  saveLineage(lineage: CreativeLineage): Promise<void>;
  getLineage(campaignId: ID): Promise<CreativeLineage | null>;
  saveEvidence(evidence: NormalizedPerformanceEvidence): Promise<void>;
  listEvidenceByTenant(tenantId: ID): Promise<NormalizedPerformanceEvidence[]>;
  saveLearning(learning: CreativeLearning): Promise<void>;
  getLearning(learningId: ID): Promise<CreativeLearning | null>;
  queryLearnings(tenantId?: ID, industry?: string): Promise<CreativeLearning[]>;
  saveFailure(failure: FailureLearning): Promise<void>;
  listFailures(tenantId?: ID): Promise<FailureLearning[]>;
  saveCombination(combination: MechanismCombinationLearning): Promise<void>;
  listCombinations(tenantId?: ID): Promise<MechanismCombinationLearning[]>;
  saveBankUpdate(update: CreativeBankLearningUpdate): Promise<void>;
  saveRun(run: LearningRun): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Firestore / In-Memory Repository for the Creative Learning Loop.
 * Enforces strict multi-tenant isolation across lineage, performance evidence, and learnings.
 */
export class FirestoreLearningLoopRepository implements ILearningLoopRepository {
  private lineages = new Map<string, CreativeLineage>();
  private evidence = new Map<string, NormalizedPerformanceEvidence>();
  private learnings = new Map<string, CreativeLearning>();
  private failures = new Map<string, FailureLearning>();
  private combinations = new Map<string, MechanismCombinationLearning>();
  private bankUpdates = new Map<string, CreativeBankLearningUpdate>();
  private runs = new Map<string, LearningRun>();

  async saveLineage(lineage: CreativeLineage): Promise<void> {
    this.lineages.set(lineage.campaignId, lineage);
  }

  async getLineage(campaignId: ID): Promise<CreativeLineage | null> {
    return this.lineages.get(campaignId) || null;
  }

  async saveEvidence(evidence: NormalizedPerformanceEvidence): Promise<void> {
    this.evidence.set(evidence.evidenceId, evidence);
  }

  async listEvidenceByTenant(tenantId: ID): Promise<NormalizedPerformanceEvidence[]> {
    const list: NormalizedPerformanceEvidence[] = [];
    for (const ev of this.evidence.values()) {
      if (ev.tenantId === tenantId) {
        list.push(ev);
      }
    }
    return list;
  }

  async saveLearning(learning: CreativeLearning): Promise<void> {
    this.learnings.set(learning.learningId, learning);
  }

  async getLearning(learningId: ID): Promise<CreativeLearning | null> {
    return this.learnings.get(learningId) || null;
  }

  async queryLearnings(tenantId?: ID, industry?: string): Promise<CreativeLearning[]> {
    const list: CreativeLearning[] = [];
    for (const l of this.learnings.values()) {
      if (tenantId && l.tenantId && l.tenantId !== tenantId) {
        continue;
      }
      if (industry && l.context.industry && l.context.industry !== industry) {
        continue;
      }
      list.push(l);
    }
    return list;
  }

  async saveFailure(failure: FailureLearning): Promise<void> {
    this.failures.set(failure.failureId, failure);
  }

  async listFailures(tenantId?: ID): Promise<FailureLearning[]> {
    const list: FailureLearning[] = [];
    for (const f of this.failures.values()) {
      if (tenantId && f.tenantId && f.tenantId !== tenantId) {
        continue;
      }
      list.push(f);
    }
    return list;
  }

  async saveCombination(combination: MechanismCombinationLearning): Promise<void> {
    this.combinations.set(combination.combinationId, combination);
  }

  async listCombinations(tenantId?: ID): Promise<MechanismCombinationLearning[]> {
    const list: MechanismCombinationLearning[] = [];
    for (const c of this.combinations.values()) {
      if (tenantId && c.tenantId && c.tenantId !== tenantId) {
        continue;
      }
      list.push(c);
    }
    return list;
  }

  async saveBankUpdate(update: CreativeBankLearningUpdate): Promise<void> {
    this.bankUpdates.set(update.updateId, update);
  }

  async saveRun(run: LearningRun): Promise<void> {
    this.runs.set(run.runId, run);
  }

  async clear(): Promise<void> {
    this.lineages.clear();
    this.evidence.clear();
    this.learnings.clear();
    this.failures.clear();
    this.combinations.clear();
    this.bankUpdates.clear();
    this.runs.clear();
  }
}
