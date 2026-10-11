import type {
  CreativeBankItem,
  StudioAdminRole,
  CreativeBankStatus,
  StudioOverviewSummary,
  StudioSandboxInput,
  StudioSandboxResult,
  CreativeRelationshipType,
} from "../../types/studio";
import { FirestoreBankRepository } from "../persistence/firestoreBankRepository";
import { BankGovernanceEngine } from "../governance/bankGovernanceEngine";
import { BankQualityEngine } from "../quality/bankQualityEngine";
import { KnowledgeGraphEngine } from "../relationships/knowledgeGraphEngine";
import type { VersionDiff } from "../versioning/bankVersioningEngine";
import { BankVersioningEngine } from "../versioning/bankVersioningEngine";
import { StudioTestingSandbox } from "../sandbox/studioTestingSandbox";

export interface CreateItemInput {
  type: CreativeBankItem["type"];
  name: string;
  shortDescription: string;
  definition: string;
  tags?: string[];
  industries?: string[];
  audiences?: string[];
  objectives?: string[];
  formats?: string[];
  platforms?: string[];
  scope?: "GLOBAL" | "INDUSTRY" | "TENANT";
  tenantId?: string;
  sourceType?: CreativeBankItem["sourceType"];
}

/**
 * Phase 10.29 — Creative Intelligence Studio Service
 *
 * Master API control center for Mitra's Creative Bank.
 * Manages item creation, governance, versioning, relationships, quality scores, testing, and merging.
 */
export class CreativeIntelligenceStudioService {
  constructor(private repository: FirestoreBankRepository = new FirestoreBankRepository()) {}

  /**
   * Retrieves Studio Overview Summary dashboard state
   */
  async getStudioOverview(): Promise<StudioOverviewSummary> {
    const items = await this.repository.searchItems();
    const auditLogs = await this.repository.getAuditLogs();

    const statusCounts: Record<CreativeBankStatus, number> = {
      DRAFT: 0,
      REVIEW: 0,
      TESTING: 0,
      VALIDATED: 0,
      ACTIVE: 0,
      DEPRECATED: 0,
      ARCHIVED: 0,
    };

    items.forEach((item) => {
      if (statusCounts[item.status] !== undefined) {
        statusCounts[item.status]++;
      }
    });

    const validated = items.filter((i) => i.status === "VALIDATED" || i.status === "ACTIVE");
    const topPerformingMechanisms = validated
      .map((i) => ({
        id: i.id,
        name: i.name,
        lift: i.performanceSummary?.relativeLift || 0.25,
        confidence: i.performanceSummary?.confidence || 0.8,
      }))
      .sort((a, b) => b.lift - a.lift)
      .slice(0, 5);

    const emerging = items
      .filter((i) => i.status === "TESTING" || i.maturity === "EMERGING")
      .map((i) => ({ id: i.id, name: i.name, signal: i.performanceSummary?.relativeLift || 0.15 }))
      .slice(0, 5);

    const declining = items
      .filter((i) => i.performanceSummary?.status === "DECLINING" || i.health === "DECLINING")
      .map((i) => ({ id: i.id, name: i.name, fatigueScore: 0.75 }))
      .slice(0, 5);

    const reviewQueueCount = items.filter((i) => i.status === "DRAFT" || i.status === "REVIEW").length;
    const bankHealthScore = BankQualityEngine.computeBankHealthScore(items);

    return {
      totalItemsCount: items.length,
      statusCounts,
      topPerformingMechanisms,
      emergingMechanisms: emerging,
      decliningMechanisms: declining,
      reviewQueueCount,
      bankHealthScore,
      recentChanges: auditLogs.slice(-10).reverse(),
    };
  }

  /**
   * Searches Creative Bank items
   */
  async searchBank(
    query?: string,
    filters?: {
      type?: string;
      status?: string;
      industry?: string;
      objective?: string;
      scope?: string;
      tenantId?: string;
    }
  ): Promise<CreativeBankItem[]> {
    return this.repository.searchItems(query, filters);
  }

  /**
   * Retrieves item by ID
   */
  async getItemById(itemId: string): Promise<CreativeBankItem | null> {
    return this.repository.getItemById(itemId);
  }

  /**
   * Creates a new Creative Bank item with governance and audit log
   */
  async createItem(actor: string, role: StudioAdminRole, input: CreateItemInput): Promise<CreativeBankItem> {
    if (!BankGovernanceEngine.canPerformAction(role, "EDIT")) {
      throw new Error(`Role [${role}] does not have permission to create items.`);
    }

    const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const now = new Date().toISOString();

    const existingItems = await this.repository.searchItems();
    const duplicates = BankQualityEngine.findDuplicateCandidates({ name: input.name }, existingItems);

    const item: CreativeBankItem = {
      id,
      type: input.type,
      name: input.name,
      slug,
      shortDescription: input.shortDescription,
      definition: input.definition,
      status: "DRAFT",
      maturity: "DRAFT",
      health: "NEW",
      sourceType: input.sourceType || "MANUAL",
      isCanonical: duplicates.length === 0,
      version: 1,
      tags: input.tags || [],
      scope: input.scope || "GLOBAL",
      tenantId: input.tenantId,
      industries: input.industries || [],
      audiences: input.audiences || [],
      objectives: input.objectives || [],
      formats: input.formats || [],
      platforms: input.platforms || [],
      useCases: {
        whenToUse: [`When targeting ${input.industries?.[0] || "general"} audience`],
        whenToAvoid: ["When context demands high exploration"],
      },
      compatibility: {
        industries: (input.industries || []).map((ind) => ({ target: ind, level: "strongly_compatible" })),
        audiences: (input.audiences || []).map((aud) => ({ target: aud, level: "compatible" })),
        objectives: (input.objectives || []).map((obj) => ({ target: obj, level: "strongly_compatible" })),
        offers: [],
        formats: [],
        platforms: [],
        mechanisms: [],
        psychologies: [],
        stories: [],
        styles: [],
      },
      antiPatterns: [],
      examples: [],
      relatedItemIds: [],
      evidenceIds: [],
      learningIds: [],
      completenessScore: 0,
      versionHistory: [],
      createdAt: now,
      updatedAt: now,
      createdBy: actor,
      updatedBy: actor,
    };

    item.completenessScore = BankQualityEngine.computeCompletenessScore(item);

    // Create initial version snapshot (v1)
    const initialVersion = BankVersioningEngine.createVersionSnapshot(item, actor, "Initial Creation", "Created item", 1);
    item.versionHistory.push(initialVersion);

    await this.repository.saveItem(item);

    const auditEntry = BankGovernanceEngine.createAuditEntry(actor, role, "CREATE", item.id, undefined, item, "Item creation");
    await this.repository.logAudit(auditEntry);

    return item;
  }

  /**
   * Updates an item with version snapshot and status transition governance
   */
  async updateItem(
    actor: string,
    role: StudioAdminRole,
    itemId: string,
    updates: Partial<CreativeBankItem>,
    reason: string = "Updated item"
  ): Promise<CreativeBankItem> {
    if (!BankGovernanceEngine.canPerformAction(role, "EDIT")) {
      throw new Error(`Role [${role}] does not have permission to edit items.`);
    }

    const item = await this.repository.getItemById(itemId);
    if (!item) {
      throw new Error(`Creative Bank item [${itemId}] not found.`);
    }

    if (updates.status && updates.status !== item.status) {
      const check = BankGovernanceEngine.validateStatusTransition(item, updates.status, role);
      if (!check.allowed) {
        throw new Error(check.reason);
      }
    }

    const before = JSON.parse(JSON.stringify(item));
    const nextVersion = item.version + 1;

    const updated: CreativeBankItem = {
      ...item,
      ...updates,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    };

    updated.completenessScore = BankQualityEngine.computeCompletenessScore(updated);

    // Create new version snapshot of updated item state
    const versionSnapshot = BankVersioningEngine.createVersionSnapshot(
      updated,
      actor,
      reason,
      Object.keys(updates).join(", "),
      nextVersion
    );
    updated.versionHistory = [...item.versionHistory, versionSnapshot];

    await this.repository.saveItem(updated);

    const auditEntry = BankGovernanceEngine.createAuditEntry(actor, role, "EDIT", itemId, before, updated, reason);
    await this.repository.logAudit(auditEntry);

    return updated;
  }

  /**
   * Duplicates an item with new ID and clear derivation lineage
   */
  async duplicateItem(actor: string, role: StudioAdminRole, itemId: string, newName: string): Promise<CreativeBankItem> {
    const source = await this.repository.getItemById(itemId);
    if (!source) {
      throw new Error(`Item [${itemId}] not found.`);
    }

    return this.createItem(actor, role, {
      type: source.type,
      name: newName,
      shortDescription: `Duplicate of ${source.name}`,
      definition: source.definition,
      tags: [...source.tags, "duplicate"],
      industries: source.industries,
      audiences: source.audiences,
      objectives: source.objectives,
      formats: source.formats,
      platforms: source.platforms,
      scope: source.scope,
      sourceType: "DERIVED",
    });
  }

  /**
   * Deprecates an item safely with replacement mapping check
   */
  async deprecateItem(
    actor: string,
    role: StudioAdminRole,
    itemId: string,
    reason: string,
    replacementItemId?: string
  ): Promise<CreativeBankItem> {
    const item = await this.repository.getItemById(itemId);
    if (!item) throw new Error(`Item [${itemId}] not found.`);

    const allItems = await this.repository.searchItems();
    const dependents = KnowledgeGraphEngine.findDependentItems(itemId, allItems);

    const deprecationRecord = {
      itemId,
      reason,
      replacementItemId,
      deprecatedAt: new Date().toISOString(),
      deprecatedBy: actor,
    };

    return this.updateItem(
      actor,
      role,
      itemId,
      {
        status: "DEPRECATED",
        health: "DEPRECATED",
        deprecationRecord,
      },
      `Deprecation (used by ${dependents.length} item(s)): ${reason}`
    );
  }

  /**
   * Links two items with typed relationship and confidence
   */
  async linkItems(
    actor: string,
    role: StudioAdminRole,
    sourceId: string,
    targetId: string,
    relationship: CreativeRelationshipType,
    confidence: number = 0.85
  ): Promise<CreativeBankItem> {
    const source = await this.repository.getItemById(sourceId);
    if (!source) throw new Error(`Source item [${sourceId}] not found.`);

    const updated = KnowledgeGraphEngine.linkItems(source, targetId, relationship, confidence);
    return this.updateItem(actor, role, sourceId, { relatedItemIds: updated.relatedItemIds }, `Linked to ${targetId}`);
  }

  /**
   * Merges duplicate items
   */
  async mergeItems(actor: string, role: StudioAdminRole, sourceItemId: string, targetItemId: string): Promise<CreativeBankItem> {
    if (!BankGovernanceEngine.canPerformAction(role, "MERGE")) {
      throw new Error(`Role [${role}] does not have permission to merge items.`);
    }

    const source = await this.repository.getItemById(sourceItemId);
    const target = await this.repository.getItemById(targetItemId);
    if (!source || !target) throw new Error("Source or target item not found.");

    const mergedTags = Array.from(new Set([...target.tags, ...source.tags]));
    const mergedAliases = Array.from(new Set([...(target.aliases || []), source.name, ...(source.aliases || [])]));

    const updatedTarget = await this.updateItem(
      actor,
      role,
      targetItemId,
      { tags: mergedTags, aliases: mergedAliases },
      `Merged with duplicate source item [${sourceItemId}]`
    );

    await this.deprecateItem(actor, role, sourceItemId, `Merged into canonical item [${targetItemId}]`, targetItemId);

    return updatedTarget;
  }

  /**
   * Compares two items side by side
   */
  async compareItems(itemIdA: string, itemIdB: string): Promise<{ itemA: CreativeBankItem; itemB: CreativeBankItem }> {
    const itemA = await this.repository.getItemById(itemIdA);
    const itemB = await this.repository.getItemById(itemIdB);
    if (!itemA || !itemB) throw new Error("One or both items not found.");
    return { itemA, itemB };
  }

  /**
   * Compares two versions of an item
   */
  async compareVersions(itemId: string, versionA: number, versionB: number): Promise<VersionDiff> {
    const item = await this.repository.getItemById(itemId);
    if (!item) throw new Error(`Item [${itemId}] not found.`);
    return BankVersioningEngine.compareVersions(item, versionA, versionB);
  }

  /**
   * Runs an isolated sandbox test for an item
   */
  async runSandboxTest(input: StudioSandboxInput): Promise<StudioSandboxResult> {
    const item = await this.repository.getItemById(input.itemId);
    if (!item) throw new Error(`Item [${input.itemId}] not found.`);
    return StudioTestingSandbox.runSimulation(item, input);
  }
}
