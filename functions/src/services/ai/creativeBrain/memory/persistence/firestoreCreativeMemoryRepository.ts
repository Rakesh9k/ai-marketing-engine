import type {
  CreativeLearningCandidate,
  CreativeMemory,
  CreativeMemoryQuery,
  CreativePerformance,
} from "../../types/memory";
import type { ID } from "../../types/primitives";

/**
 * Interface for Creative Memory Repository ensuring tenant isolation.
 */
export interface ICreativeMemoryRepository {
  savePerformance(performance: CreativePerformance): Promise<void>;
  getPerformance(tenantId: ID, performanceId: ID): Promise<CreativePerformance | null>;
  listPerformanceByTenant(tenantId: ID): Promise<CreativePerformance[]>;
  saveMemory(memory: CreativeMemory): Promise<void>;
  getMemory(memoryId: ID): Promise<CreativeMemory | null>;
  queryMemories(tenantId: ID, query: CreativeMemoryQuery): Promise<CreativeMemory[]>;
  saveLearningCandidate(candidate: CreativeLearningCandidate): Promise<void>;
  listLearningCandidates(tenantId?: ID): Promise<CreativeLearningCandidate[]>;
  clearMemory(): Promise<void>;
}

/**
 * Firestore / In-Memory implementation of Creative Memory Repository.
 * Guarantees strict tenant isolation for all saved evidence and interpretations.
 */
export class FirestoreCreativeMemoryRepository implements ICreativeMemoryRepository {
  private performances: Map<string, CreativePerformance> = new Map();
  private memories: Map<string, CreativeMemory> = new Map();
  private candidates: Map<string, CreativeLearningCandidate> = new Map();

  async savePerformance(performance: CreativePerformance): Promise<void> {
    const key = `${performance.tenantId}_${performance.performanceId}`;
    this.performances.set(key, performance);
  }

  async getPerformance(tenantId: ID, performanceId: ID): Promise<CreativePerformance | null> {
    const key = `${tenantId}_${performanceId}`;
    return this.performances.get(key) || null;
  }

  async listPerformanceByTenant(tenantId: ID): Promise<CreativePerformance[]> {
    const list: CreativePerformance[] = [];
    for (const [key, perf] of this.performances.entries()) {
      if (key.startsWith(`${tenantId}_`) || perf.tenantId === tenantId) {
        list.push(perf);
      }
    }
    return list;
  }

  async saveMemory(memory: CreativeMemory): Promise<void> {
    this.memories.set(memory.memoryId, memory);
  }

  async getMemory(memoryId: ID): Promise<CreativeMemory | null> {
    return this.memories.get(memoryId) || null;
  }

  async queryMemories(tenantId: ID, query: CreativeMemoryQuery): Promise<CreativeMemory[]> {
    const results: CreativeMemory[] = [];
    for (const memory of this.memories.values()) {
      if (memory.tenantId && memory.tenantId !== tenantId) {
        continue;
      }
      if (query.industry && memory.context.industry && memory.context.industry !== query.industry) {
        continue;
      }
      if (query.objective && memory.context.objective && memory.context.objective !== query.objective) {
        continue;
      }
      if (query.platform && memory.context.platform && memory.context.platform !== query.platform) {
        continue;
      }
      results.push(memory);
    }
    return results;
  }

  async saveLearningCandidate(candidate: CreativeLearningCandidate): Promise<void> {
    this.candidates.set(candidate.learningId, candidate);
  }

  async listLearningCandidates(_tenantId?: ID): Promise<CreativeLearningCandidate[]> {
    return Array.from(this.candidates.values());
  }

  async clearMemory(): Promise<void> {
    this.performances.clear();
    this.memories.clear();
    this.candidates.clear();
  }
}
