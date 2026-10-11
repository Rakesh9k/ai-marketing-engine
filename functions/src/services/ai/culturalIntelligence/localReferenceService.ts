/**
 * PHASE 10.35 — Build Cultural Sensitivity
 * Local Reference Context Service & Naturalness Evaluator
 */

import type { LocalReferenceContext, CulturalEvalInput } from "./culturalIntelligence.types";
import type { LocalReference } from "../localIntelligence/localIntelligence.types";
import { CulturalRiskService } from "./culturalRiskService";

export class LocalReferenceService {
  private riskService: CulturalRiskService;

  constructor(riskService?: CulturalRiskService) {
    this.riskService = riskService || new CulturalRiskService();
  }

  /**
   * Evaluates candidate local references using the Naturalness Test and computes LocalReferenceContext.
   */
  public evaluateLocalReferences(
    references: LocalReference[],
    input: CulturalEvalInput
  ): LocalReferenceContext[] {
    return references.map((ref) => {
      const contribution = this.riskService.evaluateLocalityContribution(ref.name, input);

      const audienceFit = contribution.contributionScore;
      const businessFit = input.businessCategory.toUpperCase() === "RESTAURANT" || input.businessCategory.toUpperCase() === "RETAIL" ? 90 : 70;
      const situationalFit = contribution.contributionScore;
      const culturalFit = ref.confidence * 100;
      const sensitivityRisk = ref.sensitivity && ref.sensitivity.length > 0 ? 60 : 10;
      const naturalnessScore = Math.round((audienceFit * 0.5) + (situationalFit * 0.5));
      const overuseScore = 20;

      let rec: "USE" | "CONSIDER" | "AVOID" = "CONSIDER";
      let reason = `Naturalness score is ${naturalnessScore}/100. `;

      if (naturalnessScore >= 80 && sensitivityRisk < 30) {
        rec = "USE";
        reason += "Reference naturally enhances audience situation.";
      } else if (naturalnessScore < 50 || sensitivityRisk >= 50) {
        rec = "AVOID";
        reason += "Reference fails naturalness test or carries sensitivity risk.";
      } else {
        rec = "CONSIDER";
        reason += "Reference is contextually viable if copy expression remains natural.";
      }

      return {
        referenceId: ref.id,
        relevanceScore: Math.round(ref.confidence * 100),
        audienceFit,
        businessFit,
        situationalFit,
        culturalFit,
        sensitivityRisk,
        naturalnessScore,
        overuseScore,
        recommendation: rec,
        reason,
      };
    });
  }
}
