/**
 * PHASE 10.35 — Build Cultural Sensitivity
 * Cultural Risk Engine & Forced Localization Detector
 */

import type { CulturalRisk, CulturalEvalInput, LocalityContribution } from "./culturalIntelligence.types";

export class CulturalRiskService {
  /**
   * Evaluates cultural risks and forced localization penalties for a candidate phrase/context.
   */
  public evaluateCulturalRisks(
    input: CulturalEvalInput,
    proposedCopy?: string,
    _proposedReferences: string[] = []
  ): { risks: CulturalRisk[]; forcedLocalizationRisk: "LOW" | "MEDIUM" | "HIGH"; riskPenalty: number } {
    const risks: CulturalRisk[] = [];
    let forcedRisk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    let penalty = 0;

    if (!proposedCopy) {
      return { risks, forcedLocalizationRisk: "LOW", riskPenalty: 0 };
    }

    const cleanCopy = proposedCopy.toLowerCase();
    const city = (input.location?.city || "").toLowerCase();
    const neighborhood = (input.location?.neighborhood || "").toLowerCase();

    // Forced Localization Check (inserting city/neighborhood name without situational or emotional contribution)
    const mentionsCity = city && cleanCopy.includes(city);
    const mentionsNeighborhood = neighborhood && cleanCopy.includes(neighborhood);

    if (mentionsCity || mentionsNeighborhood) {
      const contribution = this.evaluateLocalityContribution(proposedCopy, input);
      if (contribution.contributionScore < 40) {
        forcedRisk = "HIGH";
        penalty += 35;
        risks.push({
          type: "FORCED_LOCALIZATION",
          severity: "HIGH",
          description: `Superficial insertion of location name '${mentionsNeighborhood ? input.location?.neighborhood : input.location?.city}' adds no audience or situational value.`,
          mitigation: "Remove explicit location marker and express locality through audience situation or tone instead.",
        });
      }
    }

    // Stereotyping Check
    const stereotypeKeywords = ["all hyderabadis", "everyone in hyderabad", "always order biryani", "biryani lovers only"];
    if (stereotypeKeywords.some((kw) => cleanCopy.includes(kw))) {
      penalty += 40;
      risks.push({
        type: "STEREOTYPE",
        severity: "HIGH",
        description: "Contains overgeneralized cultural stereotype.",
        mitigation: "Reframe around authentic audience needs or customer situations.",
      });
    }

    // Cultural Trivialization Check (commercializing sensitive festivals)
    const intent = (input.campaignIntent || "").toLowerCase();
    if (!intent.includes("festival") && (cleanCopy.includes("ramzan sale") || cleanCopy.includes("diwali discount"))) {
      penalty += 25;
      risks.push({
        type: "CULTURAL_TRIVIALIZATION",
        severity: "MEDIUM",
        description: "Risk of trivializing cultural/religious occasion into generic promo.",
        mitigation: "Ensure offer directly relates to festive celebration context before referencing occasion.",
      });
    }

    return {
      risks,
      forcedLocalizationRisk: forcedRisk,
      riskPenalty: penalty,
    };
  }

  /**
   * Evaluates Locality Contribution Score (0–100) to check whether a local reference belongs naturally.
   */
  public evaluateLocalityContribution(
    referenceOrCopy: string,
    input: CulturalEvalInput
  ): LocalityContribution {
    const text = referenceOrCopy.toLowerCase();
    const intent = (input.campaignIntent || "").toLowerCase();
    const audience = (input.audience || "").toLowerCase();

    let score = 20; // Default low contribution score
    let type: LocalityContribution["contributionType"] = "IDENTITY";
    let explanation = "Location name inserted without clear situational or emotional purpose.";

    if (intent.includes("lunch") || intent.includes("office") || intent.includes("commute")) {
      if (text.includes("gachibowli") || text.includes("hitec")) {
        score = 85;
        type = "SITUATION";
        explanation = "Reference directly aligns with weekday tech office commute situation.";
      }
    } else if (audience.includes("family") || intent.includes("weekend")) {
      if (text.includes("kondapur") || text.includes("family")) {
        score = 90;
        type = "AUDIENCE";
        explanation = "Reference directly aligns with apartment family neighborhood catchment.";
      }
    }

    return {
      contributionType: type,
      contributionScore: score,
      explanation,
    };
  }
}
