/**
 * PHASE 10.36 — Build Creative Knowledge Versioning System
 * Version Resolution Engine & Campaign Snapshot Pinning
 */

import type {
  CreativeBankVersion,
  VersionResolutionQuery,
  CreativeKnowledgeSnapshot,
  KnowledgeReference,
} from "./creativeVersion.types";
import { CreativeVersionRepository } from "./creativeVersionRepository";

export class CreativeVersionResolver {
  private repo: CreativeVersionRepository;

  constructor(repo?: CreativeVersionRepository) {
    this.repo = repo || new CreativeVersionRepository();
  }

  /**
   * Resolves exact version based on mode (CURRENT vs HISTORICAL).
   */
  public async resolveVersion(
    query: VersionResolutionQuery
  ): Promise<CreativeBankVersion | undefined> {
    if (query.mode === "HISTORICAL" && (query.versionId || query.version !== undefined)) {
      const searchKey = query.versionId || query.version!;
      return this.repo.getVersion(query.itemId, searchKey);
    }

    // Default to CURRENT active version
    return this.repo.getActiveVersion(query.itemId);
  }

  /**
   * Pins exact KnowledgeReferences into a campaign snapshot at generation time.
   */
  public createKnowledgeSnapshot(
    psychologyRefs: KnowledgeReference[] = [],
    mechanismRefs: KnowledgeReference[] = [],
    recipeRefs: KnowledgeReference[] = [],
    hookRefs: KnowledgeReference[] = [],
    visualRefs: KnowledgeReference[] = []
  ): CreativeKnowledgeSnapshot {
    return {
      createdAt: new Date().toISOString(),
      psychology: psychologyRefs,
      mechanisms: mechanismRefs,
      recipes: recipeRefs,
      hooks: hookRefs,
      visuals: visualRefs,
      copyPatterns: [],
      offers: [],
      ctas: [],
      rules: [],
    };
  }
}
