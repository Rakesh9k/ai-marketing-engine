/**
 * PHASE 21 — Creative Territory Tracker
 * Tracks saturation, usage history, and performance across strategic creative territories.
 */

import type { CanonicalCreativeMemory, CreativeTerritoryHistory } from './canonicalMemory.types';

export class TerritoryTracker {
  /**
   * Generates a territory map across historical campaign memories.
   */
  public buildTerritoryMap(memories: CanonicalCreativeMemory[]): CreativeTerritoryHistory[] {
    if (!memories || memories.length === 0) {
      return [];
    }

    const territoryGroups = new Map<string, CanonicalCreativeMemory[]>();

    memories.forEach((mem) => {
      const territory = mem.strategic.emotionalTerritory || mem.strategic.coreConcept || 'General';
      const existing = territoryGroups.get(territory) || [];
      existing.push(mem);
      territoryGroups.set(territory, existing);
    });

    const totalCampaigns = memories.length;
    const historyList: CreativeTerritoryHistory[] = [];

    territoryGroups.forEach((mems, territory) => {
      const usageCount = mems.length;
      const sorted = [...mems].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const lastUsedAt = sorted[0].createdAt;

      const criticTotal = mems.reduce((acc, m) => acc + (m.quality.overallCriticScore || 0), 0);
      const criticAverage = usageCount > 0 ? Math.round(criticTotal / usageCount) : 0;

      const approvedCount = mems.filter((m) => m.userBehavior.approved).length;
      const userApprovalRate = usageCount > 0 ? Math.round((approvedCount / usageCount) * 100) : 0;

      // Calculate saturation score (0 to 100)
      const ratio = usageCount / totalCampaigns;
      const recencyBoost = sorted[0] === memories[0] ? 20 : 0;
      const saturationScore = Math.min(100, Math.round(ratio * 80 + recencyBoost));

      historyList.push({
        territory,
        usageCount,
        lastUsedAt,
        criticAverage,
        userApprovalRate,
        recentTrend: usageCount > 2 ? 'STABLE' : 'IMPROVING',
        saturationScore,
      });
    });

    return historyList;
  }
}
