import type { CreativeFingerprint } from "../../diversity/types";
import type { CreativeFrequencyRecord, CreativeEntityType } from "../fatigue.types";

export class FrequencyTracker {
  private readonly DEFAULT_RECENCY_WEIGHTS = [0.10, 0.15, 0.20, 0.25, 0.30];

  /**
   * Tracks entity usage frequency and consecutive streaks across a window of campaign fingerprints.
   */
  public trackFrequency(
    businessId: string,
    entityType: CreativeEntityType,
    extractor: (f: CreativeFingerprint) => string[],
    fingerprints: CreativeFingerprint[]
  ): CreativeFrequencyRecord[] {
    if (!fingerprints || fingerprints.length === 0) {
      return [];
    }

    const windowSize = Math.min(5, fingerprints.length);
    const recent = fingerprints.slice(-windowSize);
    const weights = this.DEFAULT_RECENCY_WEIGHTS.slice(-recent.length);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    const counts: Record<string, number> = {};
    const weightedCounts: Record<string, number> = {};
    const firstUsedMap: Record<string, string> = {};
    const lastUsedMap: Record<string, string> = {};

    recent.forEach((f, idx) => {
      const items = extractor(f);
      const w = weights[idx] / totalWeight;

      items.forEach((item) => {
        counts[item] = (counts[item] || 0) + 1;
        weightedCounts[item] = (weightedCounts[item] || 0) + w;

        if (!firstUsedMap[item]) {
          firstUsedMap[item] = f.createdAt;
        }
        lastUsedMap[item] = f.createdAt;
      });
    });

    const records: CreativeFrequencyRecord[] = [];
    const nowTs = new Date().toISOString();

    for (const [entityId, count] of Object.entries(counts)) {
      const consecutiveUses = this.countConsecutiveUses(recent, entityId, extractor);
      const longestStreak = this.countLongestStreak(recent, entityId, extractor);

      records.push({
        businessId,
        entityType,
        entityId,
        entityName: entityId,
        usageCount: count,
        weightedUsage: Number((weightedCounts[entityId] || 0).toFixed(2)),
        usageRate: Number((count / recent.length).toFixed(2)),
        consecutiveUses,
        longestRecentStreak: longestStreak,
        firstUsedAt: firstUsedMap[entityId] || nowTs,
        lastUsedAt: lastUsedMap[entityId] || nowTs,
        recentWindow: windowSize,
        updatedAt: nowTs,
      });
    }

    return records;
  }

  private countConsecutiveUses(
    recent: CreativeFingerprint[],
    targetId: string,
    extractor: (f: CreativeFingerprint) => string[]
  ): number {
    let streak = 0;
    for (let i = recent.length - 1; i >= 0; i--) {
      const items = extractor(recent[i]);
      if (items.includes(targetId)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  private countLongestStreak(
    recent: CreativeFingerprint[],
    targetId: string,
    extractor: (f: CreativeFingerprint) => string[]
  ): number {
    let maxStreak = 0;
    let currentStreak = 0;

    for (const f of recent) {
      const items = extractor(f);
      if (items.includes(targetId)) {
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    }

    return maxStreak;
  }
}
