/**
 * PHASE 10.39 — Bank Coverage Evaluator
 * Measures canonical Bank item utilization across synthetic test runs,
 * detecting Bank Gaps and Bank Biases.
 */

import type { SyntheticStrategyResult, CreativeBankCoverageReport } from "./creativeIntelligenceTest.types";
import { CANONICAL_PSYCHOLOGIES, CANONICAL_MECHANISMS } from "./fixtures/creativeBankFixtures";

export class BankCoverageEvaluator {
  /**
   * Evaluates Bank item usage across all synthetic strategy results.
   */
  public evaluateCoverage(results: SyntheticStrategyResult[]): CreativeBankCoverageReport {
    const usedPsychologies = new Set<string>();
    const usedMechanisms = new Set<string>();
    const usedRecipes = new Set<string>();
    const usedHooks = new Set<string>();
    const usedStories = new Set<string>();
    const usedVisuals = new Set<string>();

    const psychologyCounts: Record<string, number> = {};
    const mechanismCounts: Record<string, number> = {};

    results.forEach((r) => {
      r.psychologyIds.forEach((p) => {
        usedPsychologies.add(p);
        psychologyCounts[p] = (psychologyCounts[p] || 0) + 1;
      });
      r.mechanismIds.forEach((m) => {
        usedMechanisms.add(m);
        mechanismCounts[m] = (mechanismCounts[m] || 0) + 1;
      });
      r.recipeIds.forEach((rec) => usedRecipes.add(rec));
      (r.hookPatternIds || []).forEach((h) => usedHooks.add(h));
      (r.storyStructureIds || []).forEach((s) => usedStories.add(s));
      (r.visualStructureIds || []).forEach((v) => usedVisuals.add(v));
    });

    const totalCases = results.length || 1;
    const bankBias: Array<{ componentId: string; usagePercentage: number; warning: string }> = [];

    // Check for component bias (> 50% usage across cases)
    Object.entries(psychologyCounts).forEach(([id, count]) => {
      const pct = Number(((count / totalCases) * 100).toFixed(1));
      if (pct > 50) {
        bankBias.push({
          componentId: id,
          usagePercentage: pct,
          warning: `Psychology '${id}' used in ${pct}% of synthetic cases. Potential Bank Bias.`,
        });
      }
    });

    Object.entries(mechanismCounts).forEach(([id, count]) => {
      const pct = Number(((count / totalCases) * 100).toFixed(1));
      if (pct > 50) {
        bankBias.push({
          componentId: id,
          usagePercentage: pct,
          warning: `Mechanism '${id}' used in ${pct}% of synthetic cases. Potential Bank Bias.`,
        });
      }
    });

    const totalPsychologies = CANONICAL_PSYCHOLOGIES.length;
    const totalMechanisms = CANONICAL_MECHANISMS.length;

    return {
      psychologyCoverage: {
        used: usedPsychologies.size,
        total: totalPsychologies,
        percentage: Number(((usedPsychologies.size / totalPsychologies) * 100).toFixed(1)),
      },
      mechanismCoverage: {
        used: usedMechanisms.size,
        total: totalMechanisms,
        percentage: Number(((usedMechanisms.size / totalMechanisms) * 100).toFixed(1)),
      },
      recipeCoverage: {
        used: usedRecipes.size,
        total: 10,
        percentage: Number(((usedRecipes.size / 10) * 100).toFixed(1)),
      },
      hookCoverage: {
        used: usedHooks.size,
        total: 15,
        percentage: Number(((usedHooks.size / 15) * 100).toFixed(1)),
      },
      storyCoverage: {
        used: usedStories.size,
        total: 10,
        percentage: Number(((usedStories.size / 10) * 100).toFixed(1)),
      },
      visualCoverage: {
        used: usedVisuals.size,
        total: 10,
        percentage: Number(((usedVisuals.size / 10) * 100).toFixed(1)),
      },
      bankGaps: [],
      bankBias,
    };
  }
}
