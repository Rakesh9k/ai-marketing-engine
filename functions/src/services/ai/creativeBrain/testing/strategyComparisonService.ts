/**
 * PHASE 10.39 — Strategy Comparison Service
 * Compares two Creative Intelligence strategy results across canonical IDs
 * to evaluate true strategic differentiation.
 */

import type { SyntheticStrategyResult, StrategyDifference, StrategyDiversityScore } from "./creativeIntelligenceTest.types";

export class StrategyComparisonService {
  /**
   * Compares two strategy results across canonical IDs and dimensions.
   */
  public compareStrategies(
    strategyA: SyntheticStrategyResult,
    strategyB: SyntheticStrategyResult
  ): StrategyDiversityScore {
    const psychologyDiff = this.compareArrays(strategyA.psychologyIds, strategyB.psychologyIds, "Psychology");
    const mechanismDiff = this.compareArrays(strategyA.mechanismIds, strategyB.mechanismIds, "Mechanism");
    const recipeDiff = this.compareArrays(strategyA.recipeIds, strategyB.recipeIds, "Recipe");
    const storyDiff = this.compareArrays(strategyA.storyStructureIds || [], strategyB.storyStructureIds || [], "Story Structure");
    const visualDiff = this.compareArrays(strategyA.visualStructureIds || [], strategyB.visualStructureIds || [], "Visual Structure");
    const offerDiff = this.compareArrays(strategyA.offerFramingIds || [], strategyB.offerFramingIds || [], "Offer Framing");
    const ctaDiff = this.compareArrays(strategyA.ctaMechanismIds || [], strategyB.ctaMechanismIds || [], "CTA Mechanism");
    const audienceDiff = this.compareStrings(strategyA.audienceSituation, strategyB.audienceSituation, "Audience Situation");

    // Weighted similarity calculation:
    // Psychology: 15%, Mechanism: 20%, Recipe: 15%, Audience: 15%, Story: 10%, Visual: 10%, Offer: 10%, CTA: 5%
    const overallSimilarity = Number(
      (
        psychologyDiff.similarity * 0.15 +
        mechanismDiff.similarity * 0.20 +
        recipeDiff.similarity * 0.15 +
        audienceDiff.similarity * 0.15 +
        storyDiff.similarity * 0.10 +
        visualDiff.similarity * 0.10 +
        offerDiff.similarity * 0.10 +
        ctaDiff.similarity * 0.05
      ).toFixed(3)
    );

    const overallDifferentiation = Number((1.0 - overallSimilarity).toFixed(3));
    const meaningfulDifference = overallDifferentiation >= 0.55;

    const diffExplanations: string[] = [];
    if (mechanismDiff.similarity < 0.5) diffExplanations.push(`Mechanisms differ (${strategyA.mechanismIds.join(",")} vs ${strategyB.mechanismIds.join(",")})`);
    if (psychologyDiff.similarity < 0.5) diffExplanations.push(`Psychologies differ (${strategyA.psychologyIds.join(",")} vs ${strategyB.psychologyIds.join(",")})`);
    if (recipeDiff.similarity < 0.5) diffExplanations.push(`Recipes differ (${strategyA.recipeIds.join(",")} vs ${strategyB.recipeIds.join(",")})`);

    const explanation = diffExplanations.length
      ? diffExplanations.join("; ")
      : overallSimilarity > 0.8
      ? "Strategies are almost identical in canonical IDs and structure."
      : "Strategies show moderate structural similarity.";

    return {
      overallSimilarity,
      overallDifferentiation,
      psychologyDifference: Number((1 - psychologyDiff.similarity).toFixed(3)),
      mechanismDifference: Number((1 - mechanismDiff.similarity).toFixed(3)),
      recipeDifference: Number((1 - recipeDiff.similarity).toFixed(3)),
      audienceDifference: Number((1 - audienceDiff.similarity).toFixed(3)),
      storyDifference: Number((1 - storyDiff.similarity).toFixed(3)),
      visualDifference: Number((1 - visualDiff.similarity).toFixed(3)),
      offerDifference: Number((1 - offerDiff.similarity).toFixed(3)),
      ctaDifference: Number((1 - ctaDiff.similarity).toFixed(3)),
      meaningfulDifference,
      explanation,
    };
  }

  /**
   * Helper: Compares 2 arrays of string IDs using Jaccard Similarity.
   */
  private compareArrays(arrA: string[], arrB: string[], dimension: string): StrategyDifference {
    if (!arrA.length && !arrB.length) {
      return { dimension, similarity: 1.0, differences: [], meaningful: false };
    }
    if (!arrA.length || !arrB.length) {
      return { dimension, similarity: 0.0, differences: ["One array is empty"], meaningful: true };
    }

    const setA = new Set(arrA);
    const setB = new Set(arrB);
    const intersection = [...setA].filter((x) => setB.has(x));
    const union = new Set([...arrA, ...arrB]);

    const similarity = Number((intersection.length / union.size).toFixed(3));
    const differences: string[] = [];

    arrA.forEach((item) => {
      if (!setB.has(item)) differences.push(`Strategy A has '${item}' missing in Strategy B`);
    });
    arrB.forEach((item) => {
      if (!setA.has(item)) differences.push(`Strategy B has '${item}' missing in Strategy A`);
    });

    return {
      dimension,
      similarity,
      differences,
      meaningful: similarity < 0.5,
    };
  }

  /**
   * Helper: Compares 2 strings (e.g. audience situation) using token overlap.
   */
  private compareStrings(strA: string, strB: string, dimension: string): StrategyDifference {
    const tokensA = strA.toLowerCase().split(/\W+/).filter(Boolean);
    const tokensB = strB.toLowerCase().split(/\W+/).filter(Boolean);

    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    const intersection = [...setA].filter((x) => setB.has(x));
    const union = new Set([...tokensA, ...tokensB]);

    const similarity = union.size > 0 ? Number((intersection.length / union.size).toFixed(3)) : 1.0;

    return {
      dimension,
      similarity,
      differences: similarity < 0.5 ? [`Textual divergence between '${strA}' and '${strB}'`] : [],
      meaningful: similarity < 0.5,
    };
  }
}
