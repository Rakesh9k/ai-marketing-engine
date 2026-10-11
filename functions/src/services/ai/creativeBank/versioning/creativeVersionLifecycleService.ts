/**
 * PHASE 10.36 — Build Creative Knowledge Versioning System
 * Version Lifecycle Management: Drafts, Activation, Superseding, Deprecation, Restoration & Merges
 */

import type {
  CreativeBankItem,
  CreativeBankVersion,
  CreateVersionInput,
  ID,
} from "./creativeVersion.types";
import { CreativeVersionRepository } from "./creativeVersionRepository";

export class CreativeVersionLifecycleService {
  private repo: CreativeVersionRepository;

  constructor(repo?: CreativeVersionRepository) {
    this.repo = repo || new CreativeVersionRepository();
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
    const existing = await this.repo.getItem(itemId);
    if (existing) {
      throw new Error(`CreativeBankItem '${itemId}' already exists.`);
    }

    const now = new Date().toISOString();
    const versionId = `${itemId}_v1`;

    const version: CreativeBankVersion = {
      id: versionId,
      itemId,
      version: 1,
      versionLabel: "v1 — Initial Knowledge",
      definition,
      maturity: "DRAFT",
      status: "DRAFT",
      changeType: "INITIAL",
      changeSummary: "Initial knowledge concept creation",
      changeReason: "Initial creation",
      createdAt: now,
      createdBy,
    };

    const item: CreativeBankItem = {
      id: itemId,
      type,
      canonicalName,
      currentVersion: 1,
      currentVersionId: versionId,
      status: "DRAFT",
      scope,
      tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy,
      updatedBy: createdBy,
    };

    await this.repo.saveItem(item);
    await this.repo.saveVersion(version);

    return { item, version };
  }

  /**
   * Creates a new draft version for an existing item (Monotonically increasing version number).
   */
  public async createNewVersion(
    input: CreateVersionInput
  ): Promise<CreativeBankVersion> {
    const item = await this.repo.getItem(input.itemId);
    if (!item) {
      throw new Error(`CreativeBankItem '${input.itemId}' not found.`);
    }

    const versions = await this.repo.getVersions(input.itemId);
    const maxVersionNum = versions.reduce((max, v) => Math.max(max, v.version), item.currentVersion || 0);
    const nextVersionNum = maxVersionNum + 1;
    const versionId = `${input.itemId}_v${nextVersionNum}`;

    const now = new Date().toISOString();

    const newVersion: CreativeBankVersion = {
      id: versionId,
      itemId: input.itemId,
      version: nextVersionNum,
      versionLabel: input.versionLabel || `v${nextVersionNum}`,
      definition: input.definition,
      purpose: input.purpose,
      useCases: input.useCases,
      antiPatterns: input.antiPatterns,
      examples: input.examples,
      compatibility: input.compatibility,
      relationships: input.relationships,
      rules: input.rules,
      maturity: "DRAFT",
      status: "DRAFT",
      changeType: input.changeType,
      changeSummary: input.changeSummary,
      changeReason: input.changeReason,
      createdAt: now,
      createdBy: input.createdBy,
      supersedesVersionId: item.currentVersionId,
    };

    await this.repo.saveVersion(newVersion);
    return newVersion;
  }

  /**
   * Activates a draft version (Transactional & Concurrency Protected).
   */
  public async activateVersion(
    itemId: ID,
    versionId: ID,
    expectedCurrentVersion?: number,
    actorId = "system"
  ): Promise<{ item: CreativeBankItem; activeVersion: CreativeBankVersion }> {
    const result = await this.repo.activateVersionTransaction(itemId, versionId, expectedCurrentVersion);
    result.activeVersion.maturity = "ESTABLISHED";
    result.item.status = "ESTABLISHED";
    result.item.updatedBy = actorId;

    await this.repo.saveVersion(result.activeVersion);
    await this.repo.saveItem(result.item);

    return result;
  }

  /**
   * Deprecates a version or item with replacement links.
   */
  public async deprecateVersion(
    itemId: ID,
    versionId: ID,
    deprecatedBy: string,
    reason: string,
    replacementId?: ID,
    replacementVersionId?: ID
  ): Promise<CreativeBankVersion> {
    const version = await this.repo.getVersion(itemId, versionId);
    if (!version) {
      throw new Error(`Version '${versionId}' for item '${itemId}' not found.`);
    }

    const now = new Date().toISOString();
    version.status = "DEPRECATED";
    version.deprecatedAt = now;
    version.deprecatedBy = deprecatedBy;
    version.replacementVersionId = replacementVersionId;

    await this.repo.saveVersion(version);

    if (replacementId) {
      const item = await this.repo.getItem(itemId);
      if (item) {
        item.status = "DEPRECATED";
        item.deprecatedAt = now;
        item.replacementId = replacementId;
        await this.repo.saveItem(item);
      }
    }

    return version;
  }

  /**
   * Restores a historical version by creating a NEW version (Never mutating historical versions).
   */
  public async restoreVersion(
    itemId: ID,
    targetVersionNumberOrId: number | string,
    restoredBy: string,
    reason: string
  ): Promise<CreativeBankVersion> {
    const historicalVersion = await this.repo.getVersion(itemId, targetVersionNumberOrId);
    if (!historicalVersion) {
      throw new Error(`Historical version '${targetVersionNumberOrId}' not found for item '${itemId}'.`);
    }

    const newVersion = await this.createNewVersion({
      itemId,
      definition: historicalVersion.definition,
      purpose: historicalVersion.purpose,
      useCases: historicalVersion.useCases,
      antiPatterns: historicalVersion.antiPatterns,
      examples: historicalVersion.examples,
      compatibility: historicalVersion.compatibility,
      relationships: historicalVersion.relationships,
      rules: historicalVersion.rules,
      changeType: "RESTORATION",
      changeSummary: `Restored knowledge state from version v${historicalVersion.version}`,
      changeReason: reason,
      createdBy: restoredBy,
    });

    newVersion.restoredFromVersionId = historicalVersion.id;
    await this.repo.saveVersion(newVersion);

    return newVersion;
  }

  /**
   * Merges duplicate items into a canonical target item without destroying history.
   */
  public async mergeItems(
    sourceItemId: ID,
    targetItemId: ID,
    actorId: string,
    reason: string
  ): Promise<{ sourceItem: CreativeBankItem; targetItem: CreativeBankItem }> {
    const source = await this.repo.getItem(sourceItemId);
    const target = await this.repo.getItem(targetItemId);

    if (!source || !target) {
      throw new Error(`Source item '${sourceItemId}' or Target item '${targetItemId}' not found.`);
    }

    const now = new Date().toISOString();
    source.status = "DEPRECATED";
    source.deprecatedAt = now;
    source.replacementId = targetItemId;
    source.updatedBy = actorId;

    await this.repo.saveItem(source);

    // Create a MERGE update version on target item
    const targetActiveVer = await this.repo.getActiveVersion(targetItemId);
    const mergeVer = await this.createNewVersion({
      itemId: targetItemId,
      definition: targetActiveVer ? targetActiveVer.definition : target.canonicalName,
      changeType: "MERGE",
      changeSummary: `Merged duplicate item '${sourceItemId}' into canonical item '${targetItemId}'`,
      changeReason: reason,
      createdBy: actorId,
    });

    await this.activateVersion(targetItemId, mergeVer.id, target.currentVersion, actorId);

    return { sourceItem: source, targetItem: target };
  }
}
