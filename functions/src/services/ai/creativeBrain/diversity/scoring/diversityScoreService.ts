import type {
  CreativeFingerprint,
  DiversityDimensions,
  DiversityScoreBand,
} from "../types";

export interface ScoreCalculationResult {
  score: number; // 0 to 100
  band: DiversityScoreBand;
  dimensions: DiversityDimensions;
  entropy: number;
  hhiConcentration: number;
  consecutiveRepetitions: number;
}

export class DiversityScoreService {
  /**
   * Recency weights for configurable recent window (default window size: 5 campaigns)
   * Recent campaigns have higher influence: [1st (oldest): 0.10, 2nd: 0.15, 3rd: 0.20, 4th: 0.25, 5th (newest): 0.30]
   */
  private readonly DEFAULT_RECENCY_WEIGHTS = [0.10, 0.15, 0.20, 0.25, 0.30];

  /**
   * Calculates deterministic creative diversity score and sub-dimensions from recent campaign fingerprints.
   */
  public calculateDiversityScore(fingerprints: CreativeFingerprint[]): ScoreCalculationResult {
    if (!fingerprints || fingerprints.length === 0) {
      return {
        score: 100,
        band: "HEALTHY",
        dimensions: this.createEmptyDimensions(100),
        entropy: 1.0,
        hhiConcentration: 0.0,
        consecutiveRepetitions: 0,
      };
    }

    const recent = fingerprints.slice(-5);
    const weights = this.DEFAULT_RECENCY_WEIGHTS.slice(-recent.length);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normWeights = weights.map((w) => w / totalWeight);

    // Calculate sub-dimensions (-1 indicates unpopulated across recent window)
    const mechDiversity = this.calculateFeatureDiversity(recent, normWeights, (f) => f.mechanismIds);
    const psychDiversity = this.calculateFeatureDiversity(recent, normWeights, (f) => f.psychologyIds);
    const dirDiversity = this.calculateFeatureDiversity(recent, normWeights, (f) => (f.directionId ? [f.directionId] : []));
    const recipeDiversity = this.calculateFeatureDiversity(recent, normWeights, (f) => f.recipeIds);
    const storyDiversity = this.calculateFeatureDiversity(recent, normWeights, (f) => f.storyPatternIds);
    const hookDiversity = this.calculateFeatureDiversity(recent, normWeights, (f) => f.hookPatternIds);
    const visualDiversity = this.calculateFeatureDiversity(recent, normWeights, (f) => f.visualPatternIds);
    const emoDiversity = this.calculateFeatureDiversity(recent, normWeights, (f) => f.emotionalTerritoryIds);
    const offerDiversity = this.calculateFeatureDiversity(recent, normWeights, (f) => f.offerFramingIds);
    const ctaDiversity = this.calculateFeatureDiversity(recent, normWeights, (f) => f.ctaPatternIds);

    const dimensions: DiversityDimensions = {
      mechanismDiversity: mechDiversity >= 0 ? mechDiversity : 100,
      psychologyDiversity: psychDiversity >= 0 ? psychDiversity : 100,
      directionDiversity: dirDiversity >= 0 ? dirDiversity : 100,
      recipeDiversity: recipeDiversity >= 0 ? recipeDiversity : 100,
      storyDiversity: storyDiversity >= 0 ? storyDiversity : 100,
      hookDiversity: hookDiversity >= 0 ? hookDiversity : 100,
      visualDiversity: visualDiversity >= 0 ? visualDiversity : 100,
      emotionalDiversity: emoDiversity >= 0 ? emoDiversity : 100,
      offerDiversity: offerDiversity >= 0 ? offerDiversity : 100,
      ctaDiversity: ctaDiversity >= 0 ? ctaDiversity : 100,
    };

    // Calculate normalized score using populated active features
    const dimWeights: [number, number][] = [
      [mechDiversity, 0.25],
      [psychDiversity, 0.15],
      [dirDiversity, 0.15],
      [recipeDiversity, 0.10],
      [storyDiversity, 0.10],
      [emoDiversity, 0.10],
      [hookDiversity, 0.05],
      [visualDiversity, 0.05],
      [offerDiversity, 0.03],
      [ctaDiversity, 0.02],
    ];

    let weightedSum = 0;
    let activeWeightSum = 0;

    for (const [score, weight] of dimWeights) {
      if (score >= 0) {
        weightedSum += score * weight;
        activeWeightSum += weight;
      }
    }

    let rawScore = activeWeightSum > 0 ? weightedSum / activeWeightSum : 100;

    // Consecutive Repetition Penalty
    const consecutiveCount = this.countConsecutiveRepetitions(recent, (f) => f.mechanismIds[0]);
    if (consecutiveCount >= 3) {
      rawScore *= Math.pow(0.70, consecutiveCount - 2);
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    const band = this.determineScoreBand(finalScore);

    const { entropy, hhi } = this.computeEntropyAndHHI(recent, (f) => f.mechanismIds);

    return {
      score: finalScore,
      band,
      dimensions,
      entropy,
      hhiConcentration: hhi,
      consecutiveRepetitions: consecutiveCount,
    };
  }

  private calculateFeatureDiversity(
    fingerprints: CreativeFingerprint[],
    weights: number[],
    extractor: (f: CreativeFingerprint) => string[]
  ): number {
    const distribution: Record<string, number> = {};
    fingerprints.forEach((f, idx) => {
      const items = extractor(f);
      const w = weights[idx] || 0.2;
      items.forEach((item) => {
        distribution[item] = (distribution[item] || 0) + w;
      });
    });

    const totalWeight = Object.values(distribution).reduce((sum, v) => sum + v, 0);
    if (totalWeight === 0) return -1; // Unpopulated feature across window

    let hhi = 0;
    Object.values(distribution).forEach((val) => {
      const p = val / totalWeight;
      hhi += p * p;
    });

    const diversityRatio = Math.max(0, 1 - hhi);
    return Math.round(diversityRatio * 100);
  }

  private countConsecutiveRepetitions(
    fingerprints: CreativeFingerprint[],
    extractor: (f: CreativeFingerprint) => string | undefined
  ): number {
    if (fingerprints.length < 2) return 0;
    const lastItem = extractor(fingerprints[fingerprints.length - 1]);
    if (!lastItem) return 0;

    let count = 1;
    for (let i = fingerprints.length - 2; i >= 0; i--) {
      if (extractor(fingerprints[i]) === lastItem) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  private computeEntropyAndHHI(
    fingerprints: CreativeFingerprint[],
    extractor: (f: CreativeFingerprint) => string[]
  ): { entropy: number; hhi: number } {
    const counts: Record<string, number> = {};
    let total = 0;

    fingerprints.forEach((f) => {
      extractor(f).forEach((item) => {
        counts[item] = (counts[item] || 0) + 1;
        total++;
      });
    });

    if (total === 0) return { entropy: 1.0, hhi: 0.0 };

    let entropy = 0;
    let hhi = 0;
    Object.values(counts).forEach((c) => {
      const p = c / total;
      entropy -= p * Math.log2(p);
      hhi += p * p;
    });

    return {
      entropy: Number(entropy.toFixed(2)),
      hhi: Number(hhi.toFixed(2)),
    };
  }

  private createEmptyDimensions(val: number): DiversityDimensions {
    return {
      mechanismDiversity: val,
      psychologyDiversity: val,
      directionDiversity: val,
      recipeDiversity: val,
      storyDiversity: val,
      hookDiversity: val,
      visualDiversity: val,
      emotionalDiversity: val,
      offerDiversity: val,
      ctaDiversity: val,
    };
  }

  private determineScoreBand(score: number): DiversityScoreBand {
    if (score >= 80) return "HEALTHY";
    if (score >= 60) return "GOOD";
    if (score >= 40) return "WATCH";
    if (score >= 20) return "LOW";
    return "CRITICALLY_REPETITIVE";
  }
}
