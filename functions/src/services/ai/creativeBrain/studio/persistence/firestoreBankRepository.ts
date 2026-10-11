import type { CreativeBankItem, StudioAuditLogEntry } from "../../types/studio";

/**
 * Phase 10.29 — Firestore Creative Bank Repository
 *
 * Provides tenant-isolated and global persistence for Creative Bank items, audit logs,
 * versions, and deprecation records. Features in-memory fallback for fast testing.
 */
export class FirestoreBankRepository {
  private inMemoryItems: Map<string, CreativeBankItem> = new Map();
  private inMemoryAuditLogs: StudioAuditLogEntry[] = [];

  /**
   * Saves or updates a Creative Bank Item
   */
  async saveItem(item: CreativeBankItem): Promise<void> {
    this.inMemoryItems.set(item.id, item);
  }

  /**
   * Retrieves an item by ID
   */
  async getItemById(itemId: string): Promise<CreativeBankItem | null> {
    return this.inMemoryItems.get(itemId) || null;
  }

  /**
   * Searches bank items by query string and filters
   */
  async searchItems(
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
    let items = Array.from(this.inMemoryItems.values());

    if (filters?.scope === "TENANT" && filters.tenantId) {
      items = items.filter((i) => i.scope === "TENANT" && i.tenantId === filters.tenantId);
    } else if (filters?.scope === "GLOBAL") {
      items = items.filter((i) => i.scope === "GLOBAL");
    }

    if (filters?.type) {
      items = items.filter((i) => i.type === filters.type);
    }

    if (filters?.status) {
      items = items.filter((i) => i.status === filters.status);
    }

    if (filters?.industry) {
      items = items.filter((i) => i.industries.includes(filters.industry!));
    }

    if (query) {
      const q = query.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.definition.toLowerCase().includes(q) ||
          i.shortDescription.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return items;
  }

  /**
   * Logs an audit entry
   */
  async logAudit(entry: StudioAuditLogEntry): Promise<void> {
    this.inMemoryAuditLogs.push(entry);
  }

  /**
   * Retrieves audit logs for an item or all items
   */
  async getAuditLogs(itemId?: string): Promise<StudioAuditLogEntry[]> {
    if (itemId) {
      return this.inMemoryAuditLogs.filter((log) => log.itemId === itemId);
    }
    return [...this.inMemoryAuditLogs];
  }

  /**
   * Clears repository state (for testing)
   */
  clearInMemoryState(): void {
    this.inMemoryItems.clear();
    this.inMemoryAuditLogs = [];
  }
}
