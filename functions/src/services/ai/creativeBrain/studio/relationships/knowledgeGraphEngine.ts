import type { CreativeBankItem, CreativeRelationshipType } from "../../types/studio";

/**
 * Phase 10.29 — Knowledge Graph Relationship Engine
 *
 * Manages typed relationships between Creative Bank items with relationship confidence scores.
 */
export class KnowledgeGraphEngine {
  /**
   * Adds or updates a typed relationship between two items
   */
  static linkItems(
    sourceItem: CreativeBankItem,
    targetItemId: string,
    relationship: CreativeRelationshipType,
    confidence: number = 0.85,
    note?: string
  ): CreativeBankItem {
    const updated = { ...sourceItem };
    const existingIdx = updated.relatedItemIds.findIndex((r) => r.itemId === targetItemId);

    const relEntry = { itemId: targetItemId, relationship, confidence, note };

    if (existingIdx >= 0) {
      updated.relatedItemIds[existingIdx] = relEntry;
    } else {
      updated.relatedItemIds.push(relEntry);
    }

    updated.updatedAt = new Date().toISOString();
    return updated;
  }

  /**
   * Removes a relationship link
   */
  static unlinkItems(sourceItem: CreativeBankItem, targetItemId: string): CreativeBankItem {
    const updated = { ...sourceItem };
    updated.relatedItemIds = updated.relatedItemIds.filter((r) => r.itemId !== targetItemId);
    updated.updatedAt = new Date().toISOString();
    return updated;
  }

  /**
   * Finds all items that depend on or reference a target item ("Used In" view)
   */
  static findDependentItems(targetItemId: string, allItems: CreativeBankItem[]): CreativeBankItem[] {
    return allItems.filter((item) =>
      item.relatedItemIds.some((r) => r.itemId === targetItemId)
    );
  }

  /**
   * Retrieves full relationship graph for an item
   */
  static getRelatedItemsGraph(
    item: CreativeBankItem,
    allItemsMap: Map<string, CreativeBankItem>
  ): Array<{ item: CreativeBankItem; relationship: CreativeRelationshipType; confidence: number }> {
    const graph: Array<{ item: CreativeBankItem; relationship: CreativeRelationshipType; confidence: number }> = [];

    for (const rel of item.relatedItemIds) {
      const target = allItemsMap.get(rel.itemId);
      if (target) {
        graph.push({
          item: target,
          relationship: rel.relationship,
          confidence: rel.confidence,
        });
      }
    }

    return graph;
  }
}
