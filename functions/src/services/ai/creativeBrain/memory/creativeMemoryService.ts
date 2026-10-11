/**
 * PHASE 21 — Creative Memory Service Facade
 * Master coordinator managing canonical memory record creation, storage, context retrieval,
 * repetition detection, territory tracking, and user preference signal aggregation.
 */

import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../types/creativeBlueprint.types';
import type { CreativeCriticResult } from '../../execution/critic/creativeCritic.types';
import type { FinalPostAsset, FinalReelAsset } from '../../execution/types/execution.types';
import type {
  CanonicalCreativeMemory,
  CreativeMemoryContext,
  CreativeMemoryQuery,
  CreativeMemoryRetrieval,
  UserCreativeEdit,
  UserCreativeFeedback,
} from './canonicalMemory.types';
import { CreativeMemoryFactory } from './creativeMemoryFactory';
import { CreativeMemoryRetrievalEngine } from './creativeMemoryRetrievalEngine';

export class CreativeMemoryService {
  private readonly memoryFactory: CreativeMemoryFactory;
  private readonly retrievalEngine: CreativeMemoryRetrievalEngine;
  private readonly memoryStore: Map<string, CanonicalCreativeMemory[]>; // In-memory tenant store (backed by Firestore in production)

  constructor(
    memoryFactory?: CreativeMemoryFactory,
    retrievalEngine?: CreativeMemoryRetrievalEngine
  ) {
    this.memoryFactory = memoryFactory || new CreativeMemoryFactory();
    this.retrievalEngine = retrievalEngine || new CreativeMemoryRetrievalEngine();
    this.memoryStore = new Map<string, CanonicalCreativeMemory[]>();
  }

  /**
   * Creates and records a structured CanonicalCreativeMemory after campaign completion.
   */
  public recordCampaignMemory(
    blueprint: CreativeBlueprint,
    executionAsset: FinalPostAsset | FinalReelAsset,
    criticResult: CreativeCriticResult,
    options?: {
      businessId?: string;
      userApproved?: boolean;
      userRejected?: boolean;
      userEdits?: UserCreativeEdit[];
      userFeedback?: UserCreativeFeedback[];
    }
  ): CanonicalCreativeMemory {
    const memory = this.memoryFactory.createMemory({
      blueprint,
      executionAsset,
      criticResult,
      businessId: options?.businessId,
      userApproved: options?.userApproved,
      userRejected: options?.userRejected,
      userEdits: options?.userEdits,
      userFeedback: options?.userFeedback,
    });

    const key = `${memory.tenantId}:${memory.businessId}`;
    const existing = this.memoryStore.get(key) || [];
    existing.unshift(memory); // Newest first
    this.memoryStore.set(key, existing);

    return memory;
  }

  /**
   * Retrieves contextual memory for a new Creative Brain session.
   */
  public queryMemory(query: CreativeMemoryQuery): CreativeMemoryRetrieval {
    const allMemories = Array.from(this.memoryStore.values()).flat();
    return this.retrievalEngine.queryMemory(query, allMemories);
  }

  /**
   * Builds summarized CreativeMemoryContext for Creative Brain state machine.
   */
  public getMemoryContext(query: CreativeMemoryQuery): CreativeMemoryContext {
    const retrieval = this.queryMemory(query);
    return this.retrievalEngine.buildContext(retrieval);
  }

  /**
   * Manually seed memories for testing or initialization.
   */
  public seedMemories(tenantId: string, businessId: string, memories: CanonicalCreativeMemory[]): void {
    const key = `${tenantId}:${businessId}`;
    this.memoryStore.set(key, memories);
  }

  /**
   * Clears memory store (for test cleanup).
   */
  public clear(): void {
    this.memoryStore.clear();
  }
}
