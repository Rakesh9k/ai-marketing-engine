import type { CreativeFingerprint } from "../../diversity/types";
import type { CreativeDistanceScore } from "../fatigue.types";

export class CreativeSimilarityService {
  /**
   * Computes multi-dimensional CreativeDistanceScore between two campaign fingerprints.
   */
  public calculateCreativeDistance(
    fpA: CreativeFingerprint,
    fpB: CreativeFingerprint
  ): CreativeDistanceScore {
    const mechDist = this.computeArrayDistance(fpA.mechanismIds, fpB.mechanismIds);
    const psychDist = this.computeArrayDistance(fpA.psychologyIds, fpB.psychologyIds);
    const hookDist = this.computeArrayDistance(fpA.hookPatternIds, fpB.hookPatternIds);
    const storyDist = this.computeArrayDistance(fpA.storyPatternIds, fpB.storyPatternIds);
    const visualDist = this.computeArrayDistance(fpA.visualPatternIds, fpB.visualPatternIds);
    const copyDist = this.computeArrayDistance(fpA.copyPatternIds, fpB.copyPatternIds);
    const emoDist = this.computeArrayDistance(fpA.emotionalTerritoryIds, fpB.emotionalTerritoryIds);

    const styleDist = fpA.format === fpB.format ? 20 : 90;

    const overall = Math.round(
      mechDist * 0.30 +
        psychDist * 0.20 +
        storyDist * 0.15 +
        hookDist * 0.10 +
        visualDist * 0.10 +
        emoDist * 0.10 +
        styleDist * 0.05
    );

    return {
      overall,
      mechanismDistance: mechDist,
      psychologyDistance: psychDist,
      hookDistance: hookDist,
      storyDistance: storyDist,
      visualDistance: visualDist,
      styleDistance: styleDist,
      copyStructureDistance: copyDist,
      emotionalDistance: emoDist,
    };
  }

  /**
   * Computes average similarity score (0 to 100, where 100 = identical) across recent campaigns.
   */
  public calculateRecentSimilarity(fingerprints: CreativeFingerprint[]): number {
    if (fingerprints.length < 2) return 0;
    const recent = fingerprints.slice(-5);

    let totalDist = 0;
    let comparisons = 0;

    for (let i = 0; i < recent.length; i++) {
      for (let j = i + 1; j < recent.length; j++) {
        const dist = this.calculateCreativeDistance(recent[i], recent[j]);
        totalDist += dist.overall;
        comparisons++;
      }
    }

    if (comparisons === 0) return 0;
    const avgDist = totalDist / comparisons;
    return Math.max(0, Math.min(100, Math.round(100 - avgDist)));
  }

  private computeArrayDistance(arrA: string[], arrB: string[]): number {
    const a = arrA || [];
    const b = arrB || [];
    if (a.length === 0 && b.length === 0) return 0;
    if (a.length === 0 || b.length === 0) return 80;
    const setA = new Set(a.map((s) => s.toLowerCase()));
    const setB = new Set(b.map((s) => s.toLowerCase()));

    let overlap = 0;
    setA.forEach((item) => {
      if (setB.has(item)) overlap++;
    });

    const union = new Set([...setA, ...setB]).size;
    if (union === 0) return 0;
    const similarity = overlap / union;
    return Math.round((1 - similarity) * 100);
  }
}
