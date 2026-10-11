import type {
  CreativeVariant,
  VariantDistinctiveness,
  VariantSetDiversity,
  VariantDimension,
  Score,
  ID,
} from "../types";

export class VariantDistinctivenessService {
  /**
   * Evaluates pairwise distinctiveness between two variants.
   */
  public evaluatePair(variantA: CreativeVariant, variantB: CreativeVariant): VariantDistinctiveness {
    const duplicatedDimensions: VariantDimension[] = [];
    const differentiatedDimensions: VariantDimension[] = [];

    // Compare strategies
    if (variantA.strategy === variantB.strategy) {
      duplicatedDimensions.push("MOTIVATION");
    } else {
      differentiatedDimensions.push("MOTIVATION");
      differentiatedDimensions.push("STRATEGY" as VariantDimension);
    }

    // Compare psychology
    if (variantA.direction.psychology.primary.id === variantB.direction.psychology.primary.id) {
      duplicatedDimensions.push("PSYCHOLOGY");
    } else {
      differentiatedDimensions.push("PSYCHOLOGY");
    }

    // Compare mechanism
    if (variantA.direction.creativeMechanism.primary.id === variantB.direction.creativeMechanism.primary.id) {
      duplicatedDimensions.push("MECHANISM");
    } else {
      differentiatedDimensions.push("MECHANISM");
    }

    // Compare hook pattern / opening function
    if (variantA.direction.hook.openingFunction === variantB.direction.hook.openingFunction) {
      duplicatedDimensions.push("HOOK");
    } else {
      differentiatedDimensions.push("HOOK");
    }

    // Compare story structure
    if (variantA.direction.story.structure.id === variantB.direction.story.structure.id) {
      duplicatedDimensions.push("STORY");
    } else {
      differentiatedDimensions.push("STORY");
    }

    // Calculate similarity score (0–100)
    const totalChecks = duplicatedDimensions.length + differentiatedDimensions.length;
    const similarityScore = totalChecks > 0 ? Math.round((duplicatedDimensions.length / totalChecks) * 100) : 100;
    const strategicDifferenceScore = Math.max(0, 100 - similarityScore);

    // Rule: Need at least 1 meaningful strategic difference (MOTIVATION, PSYCHOLOGY, MECHANISM, or VALUE_FRAMING)
    const hasMeaningfulStratDiff = differentiatedDimensions.some((d) =>
      ["MOTIVATION", "PSYCHOLOGY", "MECHANISM", "STRATEGY" as VariantDimension, "VALUE_FRAMING", "TENSION"].includes(d)
    );

    const meaningfulDifference = hasMeaningfulStratDiff && similarityScore < 85;

    let explanation = `Variants rely on ${variantA.strategy} vs ${variantB.strategy}.`;
    if (!meaningfulDifference) {
      explanation = `Variants ${variantA.id} and ${variantB.id} are too strategically similar (${similarityScore}% overlap on primary dimensions).`;
    }

    return {
      similarityScore,
      strategicDifferenceScore,
      meaningfulDifference,
      duplicatedDimensions,
      differentiatedDimensions,
      explanation,
    };
  }

  /**
   * Evaluates overall diversity across a set of variants.
   */
  public evaluateSetDiversity(variants: CreativeVariant[]): VariantSetDiversity {
    if (variants.length <= 1) {
      return {
        pairwiseSimilarity: {},
        averageStrategicDifference: 100,
        strategyCoverage: variants.map((v) => v.strategy),
        dimensionCoverage: ["MOTIVATION", "PSYCHOLOGY", "MECHANISM"],
        redundantPairs: [],
        diversityScore: 100,
        explanation: "Single variant provided.",
      };
    }

    const pairwiseSimilarity: Record<string, Score> = {};
    const redundantPairs: Array<{ variantA: ID; variantB: ID; reason: string }> = [];
    let totalDiff = 0;
    let pairCount = 0;

    const strategies = new Set<any>();
    const dimensions = new Set<VariantDimension>();

    for (let i = 0; i < variants.length; i++) {
      const vI = variants[i];
      if (!vI) continue;
      strategies.add(vI.strategy);
      vI.differentiation.changedDimensions.forEach((d) => dimensions.add(d));

      for (let j = i + 1; j < variants.length; j++) {
        const vJ = variants[j];
        if (!vJ) continue;
        const pairKey = `${vI.id}:${vJ.id}`;
        const evalResult = this.evaluatePair(vI, vJ);

        pairwiseSimilarity[pairKey] = evalResult.similarityScore;
        totalDiff += evalResult.strategicDifferenceScore;
        pairCount++;

        if (!evalResult.meaningfulDifference) {
          redundantPairs.push({
            variantA: vI.id,
            variantB: vJ.id,
            reason: evalResult.explanation,
          });
        }
      }
    }

    const averageStrategicDifference = pairCount > 0 ? Math.round(totalDiff / pairCount) : 0;
    const penalty = redundantPairs.length * 30;
    const diversityScore = Math.max(0, Math.min(100, averageStrategicDifference - penalty));

    const explanation = redundantPairs.length > 0
      ? `Diversity score is ${diversityScore}/100. Detected ${redundantPairs.length} redundant variant pairs.`
      : `Diversity score is ${diversityScore}/100. Variants demonstrate distinct strategic hypotheses across ${strategies.size} strategies.`;

    return {
      pairwiseSimilarity,
      averageStrategicDifference,
      strategyCoverage: Array.from(strategies),
      dimensionCoverage: Array.from(dimensions),
      redundantPairs,
      diversityScore,
      explanation,
    };
  }
}
