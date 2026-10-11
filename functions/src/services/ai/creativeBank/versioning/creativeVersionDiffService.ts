/**
 * PHASE 10.36 — Build Creative Knowledge Versioning System
 * Version Comparison & Diff Engine
 */

import type {
  CreativeBankVersion,
  CreativeVersionDiff,
  VersionFieldChange,
} from "./creativeVersion.types";

export class CreativeVersionDiffService {
  /**
   * Computes structured CreativeVersionDiff between two versions of a Creative Bank item.
   */
  public compareVersions(
    vFrom: CreativeBankVersion,
    vTo: CreativeBankVersion
  ): CreativeVersionDiff {
    const changedFields: VersionFieldChange[] = [];

    // Definition diff
    if (vFrom.definition !== vTo.definition) {
      changedFields.push({
        field: "definition",
        changeType: "MODIFIED",
        previousValue: vFrom.definition,
        newValue: vTo.definition,
        significance: "HIGH",
      });
    }

    // Purpose diff
    if (vFrom.purpose !== vTo.purpose) {
      changedFields.push({
        field: "purpose",
        changeType: vFrom.purpose ? "MODIFIED" : "ADDED",
        previousValue: vFrom.purpose,
        newValue: vTo.purpose,
        significance: "MEDIUM",
      });
    }

    // Maturity diff
    if (vFrom.maturity !== vTo.maturity) {
      changedFields.push({
        field: "maturity",
        changeType: "MODIFIED",
        previousValue: vFrom.maturity,
        newValue: vTo.maturity,
        significance: "HIGH",
      });
    }

    // Relationships diff
    const fromRelTargets = new Set((vFrom.relationships || []).map((r) => r.targetItemId));
    const toRelTargets = new Set((vTo.relationships || []).map((r) => r.targetItemId));

    const addedRelationships = Array.from(toRelTargets).filter((id) => !fromRelTargets.has(id));
    const removedRelationships = Array.from(fromRelTargets).filter((id) => !toRelTargets.has(id));

    // Rules diff
    const fromRuleIds = new Set((vFrom.rules || []).map((r) => r.ruleId));
    const toRuleIds = new Set((vTo.rules || []).map((r) => r.ruleId));

    const addedRules = Array.from(toRuleIds).filter((id) => !fromRuleIds.has(id));
    const removedRules = Array.from(fromRuleIds).filter((id) => !toRuleIds.has(id));

    const summary = `Compared version ${vFrom.version} (v${vFrom.version}) to ${vTo.version} (v${vTo.version}). ${changedFields.length} field changes, ${addedRelationships.length} relationships added, ${addedRules.length} rules added.`;

    return {
      itemId: vFrom.itemId,
      fromVersion: vFrom.version,
      toVersion: vTo.version,
      fromVersionId: vFrom.id,
      toVersionId: vTo.id,
      changedFields,
      addedRelationships,
      removedRelationships,
      addedRules,
      removedRules,
      summary,
    };
  }
}
