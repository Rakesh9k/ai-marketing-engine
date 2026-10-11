import type {
  StrategicDirectionCandidate,
  DirectionDiversityProfile,
  StrategicDistance,
} from "../../types/directions";

export class DirectionDiversityEngine {
  /**
   * Minimum strategic distance threshold required between candidate directions (0.0 to 1.0)
   */
  public readonly MIN_STRATEGIC_DISTANCE = 0.40;

  /**
   * Extracts a structured diversity profile from a strategic direction candidate.
   */
  public extractDiversityProfile(candidate: StrategicDirectionCandidate): DirectionDiversityProfile {
    const primaryPsych = candidate.psychology[0]?.name || "General Psychology";
    const primaryMech = candidate.mechanisms[0]?.name || "General Mechanism";

    return {
      strategicAxis: candidate.name,
      psychologyFamily: primaryPsych,
      mechanismFamily: primaryMech,
      emotionalTerritory: candidate.desiredEmotion || "Neutral",
      customerTension: candidate.customerTension,
      communicationFrame: candidate.concept,
    };
  }

  /**
   * Computes multi-dimensional strategic distance between two directions.
   */
  public calculateStrategicDistance(
    dirA: StrategicDirectionCandidate,
    dirB: StrategicDirectionCandidate
  ): StrategicDistance {
    const profA = this.extractDiversityProfile(dirA);
    const profB = this.extractDiversityProfile(dirB);

    const psychDist = profA.psychologyFamily.toLowerCase() === profB.psychologyFamily.toLowerCase() ? 0.0 : 0.9;
    const mechDist = profA.mechanismFamily.toLowerCase() === profB.mechanismFamily.toLowerCase() ? 0.0 : 0.85;
    const emoDist = profA.emotionalTerritory.toLowerCase() === profB.emotionalTerritory.toLowerCase() ? 0.1 : 0.9;
    const msgDist = this.stringDifference(profA.customerTension, profB.customerTension);

    const totalDist = Number(
      (psychDist * 0.35 + mechDist * 0.30 + emoDist * 0.20 + msgDist * 0.15).toFixed(2)
    );

    return {
      directionA: dirA.name,
      directionB: dirB.name,
      psychologyDistance: psychDist,
      mechanismDistance: mechDist,
      emotionalDistance: emoDist,
      messagingDistance: msgDist,
      totalDistance: totalDist,
    };
  }

  /**
   * Filters candidate list to maintain maximum strategic diversity and eliminate near-duplicates.
   */
  public filterDiverseCandidates(
    currentDirection: StrategicDirectionCandidate,
    candidates: StrategicDirectionCandidate[],
    targetCount: number = 3
  ): StrategicDirectionCandidate[] {
    const uniqueDiverse: StrategicDirectionCandidate[] = [];

    for (const candidate of candidates) {
      if (candidate.name.toLowerCase() === currentDirection.name.toLowerCase()) {
        continue;
      }

      // Check distance against current direction
      const distFromCurrent = this.calculateStrategicDistance(currentDirection, candidate);
      if (distFromCurrent.totalDistance < this.MIN_STRATEGIC_DISTANCE) {
        continue;
      }

      // Check distance against already selected candidates
      let isDuplicate = false;
      for (const selected of uniqueDiverse) {
        const distFromSelected = this.calculateStrategicDistance(selected, candidate);
        if (distFromSelected.totalDistance < this.MIN_STRATEGIC_DISTANCE) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueDiverse.push(candidate);
      }

      if (uniqueDiverse.length >= targetCount) {
        break;
      }
    }

    return uniqueDiverse;
  }

  private stringDifference(strA: string, strB: string): number {
    if (!strA || !strB) return 1.0;
    const wordsA = new Set(strA.toLowerCase().split(/\s+/));
    const wordsB = new Set(strB.toLowerCase().split(/\s+/));

    let overlap = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) overlap++;
    }

    const union = new Set([...wordsA, ...wordsB]).size;
    if (union === 0) return 1.0;
    return Number((1 - overlap / union).toFixed(2));
  }
}
