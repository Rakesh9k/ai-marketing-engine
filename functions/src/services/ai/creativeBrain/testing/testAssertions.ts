/**
 * PHASE 10.39 — Custom Test Assertions
 * Reusable assertions for synthetic validation testing.
 */

import type { SyntheticStrategyResult } from "./creativeIntelligenceTest.types";
import { StrategyComparisonService } from "./strategyComparisonService";
import { GenericCollapseDetector } from "./genericCollapseDetector";

const comparisonService = new StrategyComparisonService();
const collapseDetector = new GenericCollapseDetector();

/**
 * Asserts that two strategy results are materially different (differentiation >= minDifferentiation).
 */
export function assertStrategiesAreDifferent(
  resultA: SyntheticStrategyResult,
  resultB: SyntheticStrategyResult,
  minDifferentiation = 0.55
): void {
  const diff = comparisonService.compareStrategies(resultA, resultB);
  if (diff.overallDifferentiation < minDifferentiation) {
    throw new Error(
      `Strategic collision between '${resultA.caseName}' and '${resultB.caseName}': ` +
        `Differentiation score ${diff.overallDifferentiation} is below required threshold ${minDifferentiation}. ` +
        `Details: ${diff.explanation}`
    );
  }
}

/**
 * Asserts that a strategy result uses expected canonical psychologies or mechanisms.
 */
export function assertCanonicalReference(
  result: SyntheticStrategyResult,
  expectedPsychologies?: string[],
  expectedMechanisms?: string[]
): void {
  if (expectedPsychologies && expectedPsychologies.length > 0) {
    const hasPsychologyMatch = expectedPsychologies.some((p) => result.psychologyIds.includes(p));
    if (!hasPsychologyMatch) {
      throw new Error(
        `Case '${result.caseName}' expected one of psychologies [${expectedPsychologies.join(", ")}], ` +
          `but got [${result.psychologyIds.join(", ")}].`
      );
    }
  }

  if (expectedMechanisms && expectedMechanisms.length > 0) {
    const hasMechanismMatch = expectedMechanisms.some((m) => result.mechanismIds.includes(m));
    if (!hasMechanismMatch) {
      throw new Error(
        `Case '${result.caseName}' expected one of mechanisms [${expectedMechanisms.join(", ")}], ` +
          `but got [${result.mechanismIds.join(", ")}].`
      );
    }
  }
}

/**
 * Asserts that a strategy result has not collapsed into generic promotional templates.
 */
export function assertNoGenericCollapse(result: SyntheticStrategyResult): void {
  const signal = collapseDetector.evaluateCase(result);
  if (signal.detected) {
    throw new Error(`Case '${result.caseName}' collapsed into generic strategy: ${signal.explanation}`);
  }
}
