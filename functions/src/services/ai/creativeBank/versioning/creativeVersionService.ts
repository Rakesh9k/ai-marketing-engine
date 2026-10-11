/**
 * PHASE 10.36 — Build Creative Knowledge Versioning System
 * Master API Facade for Creative Knowledge Versioning Infrastructure
 */

import type {
  CreativeBankItem,
  CreativeBankVersion,
  CreateVersionInput,
  CreativeVersionDiff,
  VersionImpactAnalysis,
  VersionResolutionQuery,
  CreativeKnowledgeSnapshot,
  KnowledgeReference,
  CreativeVersionAuditEvent,
  ID,
} from "./creativeVersion.types";

import { CreativeVersionRepository } from "./creativeVersionRepository";
import { CreativeVersionLifecycleService } from "./creativeVersionLifecycleService";
import { CreativeVersionResolver } from "./creativeVersionResolver";
import { CreativeVersionDiffService } from "./creativeVersionDiffService";
import { CreativeVersionImpactService } from "./creativeVersionImpactService";
import { CreativeVersionAuditService } from "./creativeVersionAuditService";

export class CreativeVersionService {
  private repository: CreativeVersionRepository;
  private lifecycleService: CreativeVersionLifecycleService;
  private resolver: CreativeVersionResolver;
  private diffService: CreativeVersionDiffService;
  private impactService: CreativeVersionImpactService;
  private auditService: CreativeVersionAuditService;

  constructor(
    repository?: CreativeVersionRepository,
    lifecycleService?: CreativeVersionLifecycleService,
    resolver?: CreativeVersionResolver,
    diffService?: CreativeVersionDiffService,
    impactService?: CreativeVersionImpactService,
    auditService?: CreativeVersionAuditService
  ) {
    this.repository = repository || new CreativeVersionRepository();
    this.lifecycleService = lifecycleService || new CreativeVersionLifecycleService(this.repository);
    this.resolver = resolver || new CreativeVersionResolver(this.repository);
    this.diffService = diffService || new CreativeVersionDiffService();
    this.impactService = impactService || new CreativeVersionImpactService();
    this.auditService = auditService || new CreativeVersionAuditService(this.repository);
  }

  public async getItem(itemId: ID): Promise<CreativeBankItem | undefined> {
    return this.repository.getItem(itemId);
  }

  /**
   * Initializes a new CreativeBankItem with v1 DRAFT or INITIAL version.
   */
  public async createInitialItem(
    itemId: ID,
    type: string,
    canonicalName: string,
    definition: string,
    createdBy: string,
    scope: "GLOBAL" | "INDUSTRY" | "TENANT" = "GLOBAL",
    tenantId?: string
  ): Promise<{ item: CreativeBankItem; version: CreativeBankVersion }> {
    const res = await this.lifecycleService.createInitialItem(
      itemId,
      type,
      canonicalName,
      definition,
      createdBy,
      scope,
      tenantId
    );

    await this.auditService.logEvent(
      "CREATIVE_VERSION_CREATED",
      itemId,
      createdBy,
      "CREATIVE_EDITOR",
      res.version.id,
      "Initial item creation"
    );

    return res;
  }

  /**
   * Creates a new draft version for an existing Creative Bank Item.
   */
  public async createCreativeBankVersion(
    input: CreateVersionInput,
    actorRole = "CREATIVE_EDITOR"
  ): Promise<CreativeBankVersion> {
    const version = await this.lifecycleService.createNewVersion(input);

    await this.auditService.logEvent(
      "CREATIVE_VERSION_CREATED",
      input.itemId,
      input.createdBy,
      actorRole,
      version.id,
      input.changeReason || input.changeSummary
    );

    return version;
  }

  /**
   * Retrieves a specific version of a Creative Bank Item.
   */
  public async getCreativeBankVersion(
    itemId: ID,
    versionIdOrNumber: string | number
  ): Promise<CreativeBankVersion | undefined> {
    return this.repository.getVersion(itemId, versionIdOrNumber);
  }

  /**
   * Retrieves full version history for a Creative Bank Item.
   */
  public async getCreativeBankVersionHistory(itemId: ID): Promise<CreativeBankVersion[]> {
    return this.repository.getVersions(itemId);
  }

  /**
   * Retrieves current active version for a Creative Bank Item.
   */
  public async getCurrentCreativeBankVersion(itemId: ID): Promise<CreativeBankVersion | undefined> {
    return this.repository.getActiveVersion(itemId);
  }

  /**
   * Activates a draft version (Transactional with Concurrency Protection).
   */
  public async activateCreativeBankVersion(
    itemId: ID,
    versionId: ID,
    expectedCurrentVersion?: number,
    actorId = "admin",
    actorRole = "CREATIVE_ADMIN"
  ): Promise<{ item: CreativeBankItem; activeVersion: CreativeBankVersion }> {
    const res = await this.lifecycleService.activateVersion(
      itemId,
      versionId,
      expectedCurrentVersion,
      actorId
    );

    await this.auditService.logEvent(
      "CREATIVE_VERSION_ACTIVATED",
      itemId,
      actorId,
      actorRole,
      versionId,
      `Activated version v${res.activeVersion.version}`
    );

    return res;
  }

  /**
   * Deprecates a version or item with replacement references.
   */
  public async deprecateCreativeBankVersion(
    itemId: ID,
    versionId: ID,
    deprecatedBy: string,
    reason: string,
    replacementId?: ID,
    replacementVersionId?: ID,
    actorRole = "CREATIVE_ADMIN"
  ): Promise<CreativeBankVersion> {
    const version = await this.lifecycleService.deprecateVersion(
      itemId,
      versionId,
      deprecatedBy,
      reason,
      replacementId,
      replacementVersionId
    );

    await this.auditService.logEvent(
      "CREATIVE_VERSION_DEPRECATED",
      itemId,
      deprecatedBy,
      actorRole,
      versionId,
      reason,
      { replacementId, replacementVersionId }
    );

    return version;
  }

  /**
   * Restores a historical version by creating a NEW version.
   */
  public async restoreCreativeBankVersion(
    itemId: ID,
    targetVersionNumberOrId: number | string,
    restoredBy: string,
    reason: string,
    actorRole = "CREATIVE_ADMIN"
  ): Promise<CreativeBankVersion> {
    const version = await this.lifecycleService.restoreVersion(
      itemId,
      targetVersionNumberOrId,
      restoredBy,
      reason
    );

    await this.auditService.logEvent(
      "CREATIVE_VERSION_RESTORED",
      itemId,
      restoredBy,
      actorRole,
      version.id,
      reason,
      { restoredFromVersionId: version.restoredFromVersionId }
    );

    return version;
  }

  /**
   * Merges a duplicate Creative Bank item into a canonical target item.
   */
  public async mergeCreativeBankVersions(
    sourceItemId: ID,
    targetItemId: ID,
    actorId: string,
    reason: string,
    actorRole = "CREATIVE_ADMIN"
  ): Promise<{ sourceItem: CreativeBankItem; targetItem: CreativeBankItem }> {
    const res = await this.lifecycleService.mergeItems(sourceItemId, targetItemId, actorId, reason);

    await this.auditService.logEvent(
      "CREATIVE_VERSION_MERGED",
      sourceItemId,
      actorId,
      actorRole,
      undefined,
      reason,
      { targetItemId }
    );

    return res;
  }

  /**
   * Computes structured diff between two versions of an item.
   */
  public async getCreativeVersionDiff(
    itemId: ID,
    fromVersionNumber: number,
    toVersionNumber: number
  ): Promise<CreativeVersionDiff> {
    const vFrom = await this.repository.getVersion(itemId, fromVersionNumber);
    const vTo = await this.repository.getVersion(itemId, toVersionNumber);

    if (!vFrom || !vTo) {
      throw new Error(`One or both versions (${fromVersionNumber}, ${toVersionNumber}) for item '${itemId}' not found.`);
    }

    return this.diffService.compareVersions(vFrom, vTo);
  }

  /**
   * Analyzes governance impact before deprecating or updating a version.
   */
  public async getVersionImpact(
    itemId: ID,
    versionId: ID,
    activeCampaignCount = 0,
    dependentRecipesCount = 0
  ): Promise<VersionImpactAnalysis> {
    const version = await this.repository.getVersion(itemId, versionId);
    if (!version) {
      throw new Error(`Version '${versionId}' for item '${itemId}' not found.`);
    }

    return this.impactService.analyzeVersionImpact(version, activeCampaignCount, dependentRecipesCount);
  }

  /**
   * Resolves exact version (CURRENT vs HISTORICAL mode).
   */
  public async resolveCreativeKnowledgeVersion(
    query: VersionResolutionQuery
  ): Promise<CreativeBankVersion | undefined> {
    return this.resolver.resolveVersion(query);
  }

  /**
   * Creates reproducible knowledge snapshot pinned for campaign generation.
   */
  public createKnowledgeSnapshot(
    psychologyRefs: KnowledgeReference[] = [],
    mechanismRefs: KnowledgeReference[] = [],
    recipeRefs: KnowledgeReference[] = [],
    hookRefs: KnowledgeReference[] = [],
    visualRefs: KnowledgeReference[] = []
  ): CreativeKnowledgeSnapshot {
    return this.resolver.createKnowledgeSnapshot(
      psychologyRefs,
      mechanismRefs,
      recipeRefs,
      hookRefs,
      visualRefs
    );
  }

  /**
   * Retrieves audit log history for an item.
   */
  public async getAuditHistory(itemId?: ID): Promise<CreativeVersionAuditEvent[]> {
    return this.auditService.getAuditHistory(itemId);
  }
}
