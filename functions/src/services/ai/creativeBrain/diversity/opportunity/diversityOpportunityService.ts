import type {
  DiversityOpportunity,
  CreativeBlindSpot,
  MechanismSaturation,
} from "../types";
import { CANONICAL_MECHANISMS } from "../canonical/mechanismCanonicalizer";

export class DiversityOpportunityService {
  /**
   * Identifies high-compatibility, underused mechanisms as diversity opportunities.
   */
  public findDiversityOpportunities(
    saturations: MechanismSaturation[],
    industry?: string
  ): {
    opportunities: DiversityOpportunity[];
    blindSpots: CreativeBlindSpot[];
  } {
    const saturatedIds = new Set(
      saturations.filter((s) => s.status === "SATURATED" || s.status === "OVERUSED").map((s) => s.mechanismId)
    );

    const opportunities: DiversityOpportunity[] = [];
    const blindSpots: CreativeBlindSpot[] = [];

    for (const [key, info] of Object.entries(CANONICAL_MECHANISMS)) {
      if (!saturatedIds.has(key)) {
        opportunities.push({
          mechanismId: info.canonicalId,
          mechanismFamilyId: info.familyId,
          reason: `High compatibility for ${industry || "business"}, currently underused in recent campaigns.`,
          compatibility: 0.90,
          novelty: 0.88,
          evidence: 0.75,
          risk: 0.20,
          priority: info.familyId === "IDENTITY" || info.familyId === "TRANSFORMATION" ? 95 : 85,
        });

        if (info.familyId === "STORY" || info.familyId === "TRANSFORMATION" || info.familyId === "SOCIAL_PROOF") {
          blindSpots.push({
            category: info.familyId,
            mechanismIds: [info.canonicalId],
            compatibility: 90,
            usageRate: 0.0,
            expectedPotential: 88,
            evidence: [
              {
                claim: `${info.name} provides high strategic differentiation without sacrificing audience fit.`,
                strength: "STRONG",
              },
            ],
            recommendation: `Incorporate '${info.name}' into upcoming campaign directions to expand creative portfolio mix.`,
          });
        }
      }
    }

    opportunities.sort((a, b) => b.priority - a.priority);

    return { opportunities, blindSpots };
  }
}
