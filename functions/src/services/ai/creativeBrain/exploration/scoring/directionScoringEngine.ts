import type { StrategicDirectionCandidate, DirectionComparison } from "../../types/directions";

export class DirectionScoringEngine {
  public readonly MIN_VIABILITY_THRESHOLD = 70;

  /**
   * Evaluates and scores candidates, returning only viable directions above threshold.
   */
  public evaluateAndScoreCandidates(
    candidates: StrategicDirectionCandidate[]
  ): StrategicDirectionCandidate[] {
    const scoredList: StrategicDirectionCandidate[] = [];

    for (const candidate of candidates) {
      const audienceFit = candidate.strategicFitScore * 100;
      const objectiveFit = candidate.compatibilityScore * 100;
      const businessFit = 85;
      const offerFit = 88;
      const evidenceStrength = candidate.confidence * 100;
      const distinctiveness = candidate.distinctivenessScore * 100;
      const creativePotential = 85;

      const overallViability = Math.round(
        audienceFit * 0.20 +
          objectiveFit * 0.20 +
          businessFit * 0.15 +
          offerFit * 0.15 +
          evidenceStrength * 0.10 +
          distinctiveness * 0.10 +
          creativePotential * 0.10
      );

      candidate.viabilityScore = overallViability;

      if (overallViability >= this.MIN_VIABILITY_THRESHOLD) {
        scoredList.push(candidate);
      }
    }

    return scoredList.sort((a, b) => b.viabilityScore - a.viabilityScore);
  }

  /**
   * Builds side-by-side DirectionComparison records for exploration UX.
   */
  public buildComparisons(candidates: StrategicDirectionCandidate[]): DirectionComparison[] {
    return candidates.map((candidate) => ({
      directionId: candidate.id,
      directionName: candidate.name,
      audienceFit: Math.round(candidate.strategicFitScore * 100),
      objectiveFit: Math.round(candidate.compatibilityScore * 100),
      businessFit: 88,
      offerFit: 90,
      evidenceStrength: Math.round(candidate.confidence * 100),
      distinctiveness: Math.round(candidate.distinctivenessScore * 100),
      creativePotential: candidate.viabilityScore,
      riskLevel: candidate.tradeoffs.length > 1 ? "MEDIUM" : "LOW",
    }));
  }
}
