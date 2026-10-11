/**
 * PHASE 10.39 — Generic Strategy Collapse Detector
 * Identifies when Creative Intelligence degrades into generic promotional templates
 * (e.g. "Limited time offer! Book now!") or bypasses strategic reasoning.
 */

import type { SyntheticStrategyResult, GenericStrategySignal } from "./creativeIntelligenceTest.types";

export class GenericCollapseDetector {
  /**
   * Evaluates a single strategy result for generic collapse signals.
   */
  public evaluateCase(result: SyntheticStrategyResult): GenericStrategySignal {
    const genericElements: string[] = [];

    // 1. Missing Strategic Core
    if (!result.psychologyIds.length) {
      genericElements.push("Missing psychology ID (No psychological foundation)");
    }
    if (!result.mechanismIds.length) {
      genericElements.push("Missing mechanism ID (No concrete value delivery mechanism)");
    }
    if (!result.recipeIds.length) {
      genericElements.push("Missing recipe ID (Unstructured strategy generation)");
    }

    // 2. Generic Promotional Phrases in Strategic Recommendation / Direction
    const text = `${result.strategicDirection} ${result.strategicRecommendation}`.toLowerCase();
    const genericTriggers = ["limited time offer", "special discount", "book now", "huge sale", "best prices in town"];

    const matchedTriggers = genericTriggers.filter((t) => text.includes(t));
    if (matchedTriggers.length > 0 && !result.mechanismIds.some((m) => m.includes("discount") || m.includes("anchoring"))) {
      genericElements.push(`Generic promo wording detected without explicit mechanism: [${matchedTriggers.join(", ")}]`);
    }

    const detected = genericElements.length > 0;
    const severity = genericElements.length > 1 ? "CRITICAL" : detected ? "WARNING" : "INFO";

    const explanation = detected
      ? `Generic strategy collapse detected: ${genericElements.join("; ")}`
      : "Strategy shows grounded, non-generic creative intelligence.";

    return {
      detected,
      genericElements,
      severity,
      explanation,
    };
  }

  /**
   * Evaluates an entire suite of synthetic cases for generic strategy collapse rate (< 40% threshold).
   */
  public evaluateSuite(results: SyntheticStrategyResult[]): {
    genericStrategyRate: number;
    genericCount: number;
    totalCases: number;
    signals: Record<string, GenericStrategySignal>;
    passed: boolean;
  } {
    const signals: Record<string, GenericStrategySignal> = {};
    let genericCount = 0;

    results.forEach((r) => {
      const signal = this.evaluateCase(r);
      signals[r.caseId] = signal;
      if (signal.detected) {
        genericCount++;
      }
    });

    const totalCases = results.length || 1;
    const genericStrategyRate = Number((genericCount / totalCases).toFixed(3));
    const passed = genericStrategyRate < 0.40;

    return {
      genericStrategyRate,
      genericCount,
      totalCases,
      signals,
      passed,
    };
  }
}
