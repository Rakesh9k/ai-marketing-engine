import type {
  CreativeFingerprint,
  MechanismSaturation,
  DiversityAlert,
  MechanismCooldown,
} from "../types";
import { MechanismCanonicalizer } from "../canonical/mechanismCanonicalizer";

export class MechanismSaturationService {
  private canonicalizer: MechanismCanonicalizer;

  constructor(canonicalizer?: MechanismCanonicalizer) {
    this.canonicalizer = canonicalizer || new MechanismCanonicalizer();
  }

  /**
   * Computes saturation metrics for all mechanisms used across recent campaign fingerprints.
   */
  public analyzeSaturation(
    fingerprints: CreativeFingerprint[]
  ): {
    saturations: MechanismSaturation[];
    alerts: DiversityAlert[];
    cooldowns: MechanismCooldown[];
  } {
    if (!fingerprints || fingerprints.length === 0) {
      return { saturations: [], alerts: [], cooldowns: [] };
    }

    const counts: Record<string, number> = {};
    const lastUsedMap: Record<string, string> = {};
    const recent = fingerprints.slice(-5);

    let consecutiveCount = 0;
    let currentLastMech: string | null = null;

    fingerprints.forEach((f) => {
      const primaryMech = f.mechanismIds[0];
      if (primaryMech) {
        const canonical = this.canonicalizer.getCanonicalId(primaryMech);
        counts[canonical] = (counts[canonical] || 0) + 1;
        lastUsedMap[canonical] = f.createdAt;

        if (currentLastMech === canonical) {
          consecutiveCount++;
        } else {
          currentLastMech = canonical;
          consecutiveCount = 1;
        }
      }
    });

    const saturations: MechanismSaturation[] = [];
    const alerts: DiversityAlert[] = [];
    const cooldowns: MechanismCooldown[] = [];

    const nowTimestamp = new Date().toISOString();

    for (const [mechId, usageCount] of Object.entries(counts)) {
      const recentUsageCount = recent.filter(
        (f) => f.mechanismIds.length > 0 && this.canonicalizer.getCanonicalId(f.mechanismIds[0]) === mechId
      ).length;

      const recentUsageRate = Number((recentUsageCount / recent.length).toFixed(2));
      const isConsecutiveTarget = currentLastMech === mechId ? consecutiveCount : 0;

      const saturationScore = Math.min(100, Math.round(recentUsageRate * 100));

      const status: MechanismSaturation["status"] =
        recentUsageRate >= 0.8 || isConsecutiveTarget >= 4
          ? "OVERUSED"
          : recentUsageRate >= 0.6 || isConsecutiveTarget >= 3
          ? "SATURATED"
          : recentUsageRate >= 0.4
          ? "REPEATING"
          : "HEALTHY";

      saturations.push({
        mechanismId: mechId,
        canonicalMechanismId: mechId,
        usageCount,
        weightedUsage: recentUsageCount,
        recentUsageRate,
        consecutiveUses: isConsecutiveTarget,
        lastUsedAt: lastUsedMap[mechId] || nowTimestamp,
        saturationScore,
        status,
      });

      if (status === "OVERUSED" || status === "SATURATED") {
        alerts.push({
          id: `alert_sat_${mechId}_${Date.now()}`,
          type: "MECHANISM_OVERUSE",
          severity: status === "OVERUSED" ? "CRITICAL" : "WARNING",
          itemId: mechId,
          message: `Mechanism '${mechId}' has been used in ${recentUsageCount} of the last ${recent.length} campaigns (Consecutive uses: ${isConsecutiveTarget}).`,
          recommendation: `Explore alternative underused mechanisms (Identity, Social Proof, Demonstration, Story).`,
          createdAt: nowTimestamp,
        });

        cooldowns.push({
          mechanismId: mechId,
          lastUsedAt: lastUsedMap[mechId] || nowTimestamp,
          cooldownScore: status === "OVERUSED" ? 90 : 60,
          recommendedReturnAfter: new Date(Date.now() + 14 * 86400000).toISOString(),
        });
      }
    }

    return { saturations, alerts, cooldowns };
  }
}
