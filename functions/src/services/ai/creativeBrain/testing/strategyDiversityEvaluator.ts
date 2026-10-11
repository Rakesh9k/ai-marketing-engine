/**
 * PHASE 10.39 — Strategy Diversity Evaluator
 * Evaluates pairwise differentiation across all synthetic strategy results
 * and identifies strategic collisions.
 */

import type { SyntheticStrategyResult, StrategyDiversityScore, CreativeIntelligenceFailure } from "./creativeIntelligenceTest.types";
import { StrategyComparisonService } from "./strategyComparisonService";

export interface SuiteDiversityReport {
  meanDifferentiation: number;
  meanSimilarity: number;
  totalPairwiseComparisons: number;
  collisionCount: number;
  collisionRate: number;
  collisions: Array<{ caseIdA: string; caseIdB: string; similarity: number; reason: string }>;
  failures: CreativeIntelligenceFailure[];
}

export class StrategyDiversityEvaluator {
  private comparisonService: StrategyComparisonService;

  constructor(comparisonService?: StrategyComparisonService) {
    this.comparisonService = comparisonService || new StrategyComparisonService();
  }

  /**
   * Evaluates diversity across a list of synthetic strategy results.
   */
  public evaluateSuiteDiversity(results: SyntheticStrategyResult[]): SuiteDiversityReport {
    const collisions: Array<{ caseIdA: string; caseIdB: string; similarity: number; reason: string }> = [];
    const failures: CreativeIntelligenceFailure[] = [];
    let totalSimilarity = 0;
    let comparisonsCount = 0;

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const resA = results[i];
        const resB = results[j];

        const score: StrategyDiversityScore = this.comparisonService.compareStrategies(resA, resB);
        totalSimilarity += score.overallSimilarity;
        comparisonsCount++;

        // Collision threshold: similarity >= 0.45 means differentiation < 0.55
        if (score.overallSimilarity >= 0.45) {
          collisions.push({
            caseIdA: resA.caseId,
            caseIdB: resB.caseId,
            similarity: score.overallSimilarity,
            reason: score.explanation,
          });

          failures.push({
            type: "STRATEGY_COLLISION",
            caseId: `${resA.caseId} vs ${resB.caseId}`,
            severity: "HIGH",
            details: `Strategic collision between '${resA.caseName}' and '${resB.caseName}' (Similarity ${score.overallSimilarity} >= 0.45 limit).`,
            actual: score.overallSimilarity,
            expected: "< 0.45",
          });
        }
      }
    }

    const meanSimilarity = comparisonsCount > 0 ? Number((totalSimilarity / comparisonsCount).toFixed(3)) : 0;
    const meanDifferentiation = Number((1.0 - meanSimilarity).toFixed(3));
    const collisionRate = comparisonsCount > 0 ? Number((collisions.length / comparisonsCount).toFixed(3)) : 0;

    return {
      meanDifferentiation,
      meanSimilarity,
      totalPairwiseComparisons: comparisonsCount,
      collisionCount: collisions.length,
      collisionRate,
      collisions,
      failures,
    };
  }
}
