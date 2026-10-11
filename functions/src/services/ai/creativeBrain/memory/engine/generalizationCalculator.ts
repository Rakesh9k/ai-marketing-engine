import type { CreativePerformance, LearningGeneralization } from "../../types/memory";
import type { Score } from "../../types/primitives";

/**
 * Calculates generalization metrics across multiple performance evidence records.
 * Higher diversity in successful contexts indicates higher generalization potential.
 */
export function calculateGeneralization(evidenceList: CreativePerformance[]): LearningGeneralization {
  if (evidenceList.length === 0) {
    return {
      businessDiversity: 0.1,
      audienceDiversity: 0.1,
      locationDiversity: 0.1,
      platformDiversity: 0.1,
      campaignDiversity: 0.1,
      overall: 0.1,
    };
  }

  const uniqueBusinesses = new Set(evidenceList.map((e) => e.businessId));
  const uniqueLocations = new Set(
    evidenceList.map((e) => e.location?.city || e.location?.region || e.industry).filter(Boolean)
  );
  const uniquePlatforms = new Set(evidenceList.map((e) => e.platform));
  const uniqueCampaigns = new Set(evidenceList.map((e) => e.campaignId).filter(Boolean));
  const uniqueAudiences = new Set(
    evidenceList
      .map((e) =>
        typeof e.audience === "string"
          ? e.audience
          : (e.audience as any)?.description || (e.audience as any)?.name
      )
      .filter(Boolean)
  );


  // Normalize diversity to 0-1 scores (e.g. 5+ distinct contexts = max 1.0)
  const businessDiversity = Math.min(1.0, 0.2 + (uniqueBusinesses.size - 1) * 0.2);
  const locationDiversity = Math.min(1.0, 0.2 + (uniqueLocations.size - 1) * 0.2);
  const platformDiversity = Math.min(1.0, 0.25 + (uniquePlatforms.size - 1) * 0.25);
  const campaignDiversity = Math.min(1.0, 0.2 + (uniqueCampaigns.size - 1) * 0.2);
  const audienceDiversity = Math.min(1.0, 0.2 + (uniqueAudiences.size - 1) * 0.2);

  const overall: Score = Number(
    (
      (businessDiversity * 0.25 +
        locationDiversity * 0.2 +
        platformDiversity * 0.2 +
        campaignDiversity * 0.15 +
        audienceDiversity * 0.2)
    ).toFixed(4)
  );

  return {
    businessDiversity,
    audienceDiversity,
    locationDiversity,
    platformDiversity,
    campaignDiversity,
    overall,
  };
}
