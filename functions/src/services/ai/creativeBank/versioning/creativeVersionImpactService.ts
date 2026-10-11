/**
 * PHASE 10.36 — Build Creative Knowledge Versioning System
 * Version Impact Analysis Service
 */

import type { CreativeBankVersion, VersionImpactAnalysis } from "./creativeVersion.types";

export class CreativeVersionImpactService {
  /**
   * Evaluates governance impact before deprecating or superseding a version.
   */
  public analyzeVersionImpact(
    version: CreativeBankVersion,
    activeCampaignCount = 0,
    dependentRecipesCount = 0
  ): VersionImpactAnalysis {
    const dependentRulesCount = version.rules?.length || 0;
    const learningObservationsCount = version.evidence?.length || 0;

    const summary = `Version v${version.version} of '${version.itemId}' is linked to ${activeCampaignCount} active campaigns, ${dependentRecipesCount} recipes, ${dependentRulesCount} rules, and ${learningObservationsCount} learning observations.`;

    const safeToDeprecate = activeCampaignCount === 0;

    return {
      itemId: version.itemId,
      versionId: version.id,
      activeCampaignCount,
      dependentRecipesCount,
      dependentRulesCount,
      learningObservationsCount,
      summary,
      safeToDeprecate,
    };
  }
}
