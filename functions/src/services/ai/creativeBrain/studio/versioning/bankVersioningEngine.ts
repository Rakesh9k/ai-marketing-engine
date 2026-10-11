import type { CreativeBankItem, CreativeItemVersion } from "../../types/studio";

export interface VersionDiff {
  versionA: number;
  versionB: number;
  changedFields: Array<{
    field: string;
    valueA: any;
    valueB: any;
  }>;
}

/**
 * Phase 10.29 — Bank Versioning Engine
 *
 * Creates immutable version history snapshots and performs structural diff comparisons.
 */
export class BankVersioningEngine {
  /**
   * Creates a new immutable version snapshot for an item version
   */
  static createVersionSnapshot(
    item: CreativeBankItem,
    actor: string,
    reason: string,
    changesSummary: string,
    versionNumber?: number
  ): CreativeItemVersion {
    const version = versionNumber !== undefined ? versionNumber : item.version;
    const snapshotData: Record<string, any> = {
      name: item.name,
      definition: item.definition,
      shortDescription: item.shortDescription,
      status: item.status,
      useCases: item.useCases,
      compatibility: item.compatibility,
      antiPatterns: item.antiPatterns,
      examples: item.examples,
      relatedItemIds: item.relatedItemIds,
    };

    return {
      version,
      changedAt: new Date().toISOString(),
      changedBy: actor,
      reason,
      changesSummary,
      snapshot: snapshotData,
    };
  }

  /**
   * Compares two item versions and returns structural diff
   */
  static compareVersions(item: CreativeBankItem, versionA: number, versionB: number): VersionDiff {
    const vA = item.versionHistory.find((v) => v.version === versionA);
    const vB = item.versionHistory.find((v) => v.version === versionB);

    const changedFields: Array<{ field: string; valueA: any; valueB: any }> = [];

    if (!vA || !vB) {
      return { versionA, versionB, changedFields };
    }

    const snapA = vA.snapshot;
    const snapB = vB.snapshot;

    const allKeys = new Set([...Object.keys(snapA), ...Object.keys(snapB)]);
    for (const key of allKeys) {
      const valA = JSON.stringify(snapA[key]);
      const valB = JSON.stringify(snapB[key]);

      if (valA !== valB) {
        changedFields.push({
          field: key,
          valueA: snapA[key],
          valueB: snapB[key],
        });
      }
    }

    return { versionA, versionB, changedFields };
  }
}
