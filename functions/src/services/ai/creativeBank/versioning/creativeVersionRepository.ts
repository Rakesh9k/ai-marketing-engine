/**
 * PHASE 10.36 — Build Creative Knowledge Versioning System
 * Repository Layer for Items, Versions, Audit Logs & Concurrency Protection
 */

import type {
  CreativeBankItem,
  CreativeBankVersion,
  CreativeVersionAuditEvent,
  ID,
} from "./creativeVersion.types";

export class CreativeVersionRepository {
  private items: Map<ID, CreativeBankItem> = new Map();
  private versions: Map<ID, CreativeBankVersion[]> = new Map(); // itemId -> versions[]
  private auditLogs: CreativeVersionAuditEvent[] = [];

  public async getItem(itemId: ID): Promise<CreativeBankItem | undefined> {
    return this.items.get(itemId);
  }

  public async saveItem(item: CreativeBankItem): Promise<void> {
    this.items.set(item.id, item);
  }

  public async getVersions(itemId: ID): Promise<CreativeBankVersion[]> {
    return this.versions.get(itemId) || [];
  }

  public async getVersion(itemId: ID, versionIdOrNumber: string | number): Promise<CreativeBankVersion | undefined> {
    const list = await this.getVersions(itemId);
    if (typeof versionIdOrNumber === "number") {
      return list.find((v) => v.version === versionIdOrNumber);
    }
    return list.find((v) => v.id === versionIdOrNumber || v.version === parseInt(versionIdOrNumber, 10));
  }

  public async getActiveVersion(itemId: ID): Promise<CreativeBankVersion | undefined> {
    const list = await this.getVersions(itemId);
    return list.find((v) => v.status === "ACTIVE");
  }

  public async saveVersion(version: CreativeBankVersion): Promise<void> {
    const list = this.versions.get(version.itemId) || [];
    const idx = list.findIndex((v) => v.id === version.id);
    if (idx >= 0) {
      list[idx] = version;
    } else {
      list.push(version);
    }
    this.versions.set(version.itemId, list);
  }

  /**
   * Optimistic Concurrency Transaction: Activates a new version and updates parent item.
   */
  public async activateVersionTransaction(
    itemId: ID,
    versionId: ID,
    expectedCurrentVersion?: number
  ): Promise<{ item: CreativeBankItem; activeVersion: CreativeBankVersion }> {
    const item = await this.getItem(itemId);
    if (!item) {
      throw new Error(`CreativeBankItem '${itemId}' not found.`);
    }

    if (expectedCurrentVersion !== undefined && item.currentVersion !== expectedCurrentVersion) {
      throw new Error(
        `Concurrency Exception: Expected current version ${expectedCurrentVersion}, but item '${itemId}' is currently at version ${item.currentVersion}.`
      );
    }

    const versions = await this.getVersions(itemId);
    const targetVersion = versions.find((v) => v.id === versionId);
    if (!targetVersion) {
      throw new Error(`CreativeBankVersion '${versionId}' not found for item '${itemId}'.`);
    }

    const now = new Date().toISOString();

    // 1. Mark previous active version as SUPERSEDED
    versions.forEach((v) => {
      if (v.status === "ACTIVE" && v.id !== versionId) {
        v.status = "SUPERSEDED";
        v.supersededAt = now;
      }
    });

    // 2. Activate target version
    targetVersion.status = "ACTIVE";
    targetVersion.supersedesVersionId = item.currentVersionId || undefined;

    // 3. Update parent item
    item.currentVersion = targetVersion.version;
    item.currentVersionId = targetVersion.id;
    item.updatedAt = now;

    await this.saveItem(item);
    await this.saveVersion(targetVersion);

    return { item, activeVersion: targetVersion };
  }

  public async logAuditEvent(event: CreativeVersionAuditEvent): Promise<void> {
    this.auditLogs.push(event);
  }

  public async getAuditEvents(itemId?: ID): Promise<CreativeVersionAuditEvent[]> {
    if (!itemId) return [...this.auditLogs];
    return this.auditLogs.filter((e) => e.itemId === itemId);
  }
}
