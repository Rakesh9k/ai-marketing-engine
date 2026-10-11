import type { CreativeBankItem } from "../../types/studio";

/**
 * Phase 10.29 — Bank Quality & Completeness Engine
 *
 * Computes item content completeness scores (0-100), detects potential duplicate candidates,
 * identifies orphan items, and calculates overall Bank Health.
 */
export class BankQualityEngine {
  /**
   * Computes Content Completeness Score (0-100) for a CreativeBankItem
   */
  static computeCompletenessScore(item: CreativeBankItem): number {
    let score = 0;

    // Definition check (20 pts)
    if (item.definition && item.definition.length > 20) score += 20;

    // Short description check (10 pts)
    if (item.shortDescription && item.shortDescription.length > 10) score += 10;

    // Use cases check (15 pts)
    if (item.useCases.whenToUse.length > 0 && item.useCases.whenToAvoid.length > 0) score += 15;

    // Compatibility check (15 pts)
    if (item.industries.length > 0 && item.objectives.length > 0) score += 15;

    // Examples check (15 pts)
    if (item.examples && item.examples.length > 0) score += 15;

    // Anti-patterns check (10 pts)
    if (item.antiPatterns && item.antiPatterns.length > 0) score += 10;

    // Relationships check (15 pts)
    if (item.relatedItemIds && item.relatedItemIds.length > 0) score += 15;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Identifies potential duplicate candidates using name & tag similarity
   */
  static findDuplicateCandidates(
    newItem: Partial<CreativeBankItem>,
    existingItems: CreativeBankItem[]
  ): Array<{ item: CreativeBankItem; similarityScore: number }> {
    const duplicates: Array<{ item: CreativeBankItem; similarityScore: number }> = [];
    if (!newItem.name) return duplicates;

    const newNameLower = newItem.name.toLowerCase();

    for (const existing of existingItems) {
      if (existing.id === newItem.id) continue;

      const existingNameLower = existing.name.toLowerCase();
      let sim = 0;

      if (newNameLower === existingNameLower) {
        sim = 1.0;
      } else if (newNameLower.includes(existingNameLower) || existingNameLower.includes(newNameLower)) {
        sim = 0.85;
      } else {
        const wordsA = new Set(newNameLower.split(/\s+/));
        const wordsB = new Set(existingNameLower.split(/\s+/));
        const intersection = Array.from(wordsA).filter((w) => wordsB.has(w));
        if (wordsA.size > 0) {
          sim = intersection.length / Math.max(wordsA.size, wordsB.size);
        }
      }

      if (sim >= 0.60) {
        duplicates.push({ item: existing, similarityScore: Number(sim.toFixed(2)) });
      }
    }

    return duplicates.sort((a, b) => b.similarityScore - a.similarityScore);
  }

  /**
   * Identifies Orphan Items (0 related items and 0 evidence)
   */
  static findOrphanItems(items: CreativeBankItem[]): CreativeBankItem[] {
    return items.filter(
      (item) =>
        (!item.relatedItemIds || item.relatedItemIds.length === 0) &&
        (!item.evidenceIds || item.evidenceIds.length === 0) &&
        (!item.learningIds || item.learningIds.length === 0)
    );
  }

  /**
   * Computes overall Creative Bank Health score (0-100)
   */
  static computeBankHealthScore(items: CreativeBankItem[]): number {
    if (items.length === 0) return 100;

    const avgCompleteness =
      items.reduce((sum, i) => sum + this.computeCompletenessScore(i), 0) / items.length;

    const orphans = this.findOrphanItems(items);
    const orphanPenalty = (orphans.length / items.length) * 20;

    const health = Math.max(0, Math.min(100, Math.round(avgCompleteness - orphanPenalty)));
    return health;
  }
}
