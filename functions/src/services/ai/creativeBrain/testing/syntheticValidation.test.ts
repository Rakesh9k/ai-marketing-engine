/**
 * PHASE 10.39 — Synthetic Validation Test Suite
 * Comprehensive automated tests verifying Mitra's Creative Intelligence System
 * on 18 synthetic campaign cases before production connection.
 */

import { SyntheticCaseRunner } from "./syntheticCaseRunner";
import { ALL_SYNTHETIC_CASES } from "./syntheticCases";
import { StrategyComparisonService } from "./strategyComparisonService";
import { StrategyDiversityEvaluator } from "./strategyDiversityEvaluator";
import { BankCoverageEvaluator } from "./bankCoverageEvaluator";
import { GenericCollapseDetector } from "./genericCollapseDetector";
import { assertStrategiesAreDifferent, assertCanonicalReference, assertNoGenericCollapse } from "./testAssertions";
import { CreativeIntelligenceTestHarness } from "./creativeIntelligenceTestHarness";
import { FIXTURE_CASUAL_RESTAURANT } from "./fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT } from "./fixtures/campaignIntentFixtures";
import type { HistoricalCampaignRecord } from "./fixtures/diversityFixtures";

describe("PHASE 10.39 — Synthetic Validation Harness & Multi-Case Strategy Differentiation", () => {
  let runner: SyntheticCaseRunner;
  let comparisonService: StrategyComparisonService;
  let diversityEvaluator: StrategyDiversityEvaluator;
  let coverageEvaluator: BankCoverageEvaluator;
  let collapseDetector: GenericCollapseDetector;
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
    runner = new SyntheticCaseRunner(harness);
    comparisonService = new StrategyComparisonService();
    diversityEvaluator = new StrategyDiversityEvaluator(comparisonService);
    coverageEvaluator = new BankCoverageEvaluator();
    collapseDetector = new GenericCollapseDetector();
  });

  describe("1. Execution of 18 Synthetic Campaign Cases", () => {
    test("runs all 18 synthetic cases and generates structured strategy results", () => {
      const results = runner.runAllCases(ALL_SYNTHETIC_CASES);

      expect(results).toHaveLength(18);

      results.forEach((r) => {
        expect(r.caseId).toBeDefined();
        expect(r.strategicDirection).toBeTruthy();
        expect(r.psychologyIds.length).toBeGreaterThan(0);
        expect(r.mechanismIds.length).toBeGreaterThan(0);
        expect(r.recipeIds.length).toBeGreaterThan(0);
        expect(r.whyThisStrategy).toBeTruthy();
        expect(r.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe("2. Metamorphic & Contrast Scenarios", () => {
    test("Same-Offer Contrast (₹799 Restaurant vs ₹799 Salon) produces materially different strategies", () => {
      const rest799Case = ALL_SYNTHETIC_CASES.find((c) => c.id === "synth_rest_01_weekend_family")!;
      const salon799Case = ALL_SYNTHETIC_CASES.find((c) => c.id === "synth_contrast_01_salon_799")!;

      const restResult = runner.runCase(rest799Case);
      const salonResult = runner.runCase(salon799Case);

      // Must have different mechanisms & recipes
      assertStrategiesAreDifferent(restResult, salonResult, 0.55);
      expect(restResult.mechanismIds).not.toEqual(salonResult.mechanismIds);
      expect(restResult.recipeIds).not.toEqual(salonResult.recipeIds);
    });

    test("Same-Business Contrast (Weekend Family vs Weekday Office Lunch) produces materially different strategies", () => {
      const familyCase = ALL_SYNTHETIC_CASES.find((c) => c.id === "synth_rest_01_weekend_family")!;
      const officeCase = ALL_SYNTHETIC_CASES.find((c) => c.id === "synth_contrast_02_same_restaurant_office")!;

      const familyResult = runner.runCase(familyCase);
      const officeResult = runner.runCase(officeCase);

      assertStrategiesAreDifferent(familyResult, officeResult, 0.55);
      expect(familyResult.recipeIds).not.toEqual(officeResult.recipeIds);
    });

    test("No-Offer Scenario (Organic Farm-to-Table) avoids fake discount mechanisms", () => {
      const organicCase = ALL_SYNTHETIC_CASES.find((c) => c.id === "synth_contrast_03_no_offer_restaurant")!;
      const result = runner.runCase(organicCase);

      assertNoGenericCollapse(result);
      expect(result.mechanismIds).toContain("mechanism_open_kitchen_ingredient_proof");
      expect(result.mechanismIds).not.toContain("mechanism_discount_flash_sale");
    });
  });

  describe("3. Suite-Wide Strategy Diversity & Collision Prevention", () => {
    test("overall mean differentiation across all 18 cases exceeds threshold (>= 0.55)", () => {
      const results = runner.runAllCases(ALL_SYNTHETIC_CASES);
      const report = diversityEvaluator.evaluateSuiteDiversity(results);

      expect(report.meanDifferentiation).toBeGreaterThanOrEqual(0.55);
      expect(report.collisionRate).toBeLessThan(0.40);
    });
  });

  describe("4. Creative Bank Coverage & Bias Detection", () => {
    test("evaluates canonical Bank coverage and ensures no component overuse bias (> 70%)", () => {
      const results = runner.runAllCases(ALL_SYNTHETIC_CASES);
      const coverage = coverageEvaluator.evaluateCoverage(results);

      expect(coverage.psychologyCoverage.used).toBeGreaterThan(0);
      expect(coverage.mechanismCoverage.used).toBeGreaterThan(0);
      expect(coverage.recipeCoverage.used).toBeGreaterThan(0);

      // Verify no single mechanism/psychology exceeds 70% usage across unrelated synthetic cases
      const severeBiases = coverage.bankBias.filter((b) => b.usagePercentage > 70);
      expect(severeBiases).toHaveLength(0);
    });
  });

  describe("5. Generic Strategy Collapse Prevention", () => {
    test("generic strategy collapse rate across suite is strictly < 40%", () => {
      const results = runner.runAllCases(ALL_SYNTHETIC_CASES);
      const collapseReport = collapseDetector.evaluateSuite(results);

      expect(collapseReport.passed).toBe(true);
      expect(collapseReport.genericStrategyRate).toBeLessThan(0.40);
    });
  });

  describe("6. Validation of the 7 Quality Gate Questions", () => {
    test("Q1: Materially different business situations produce materially different strategies", () => {
      const results = runner.runAllCases(ALL_SYNTHETIC_CASES);
      const report = diversityEvaluator.evaluateSuiteDiversity(results);
      expect(report.meanDifferentiation).toBeGreaterThanOrEqual(0.55);
    });

    test("Q2: Strategic components selected using canonical IDs rather than plain string matching", () => {
      const restCase = ALL_SYNTHETIC_CASES.find((c) => c.id === "synth_rest_01_weekend_family")!;
      const result = runner.runCase(restCase);

      assertCanonicalReference(result, ["psychology_choice_simplification", "psychology_cognitive_ease"], ["mechanism_curated_family_set", "mechanism_decision_relief"]);
    });

    test("Q3: Truth & Safety guardrails prevent unsupported scarcity without proof", () => {
      const inputWithoutExpiry = {
        businessProfile: {
          ...FIXTURE_CASUAL_RESTAURANT,
          verifiedEvidence: {
            ...FIXTURE_CASUAL_RESTAURANT.verifiedEvidence,
            hasStatedExpiry: false,
            hasInventoryLimit: false,
          },
        },
        campaignIntent: {
          ...FIXTURE_WEEKEND_FAMILY_INTENT,
          offerDetails: {
            hasOffer: true,
            hasStatedExpiry: false,
            hasInventoryLimit: false,
          },
        },
        userMechanismOverride: "mechanism_discount_flash_sale",
      };

      const result = harness.runTestCase(inputWithoutExpiry);
      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.code === "UNSUPPORTED_SCARCITY")).toBe(true);
    });

    test("Q4: Brand Voice and positioning constraints are respected", () => {
      const result = harness.runTestCase({
        businessProfile: {
          ...FIXTURE_CASUAL_RESTAURANT,
          brandVoice: {
            ...FIXTURE_CASUAL_RESTAURANT.brandVoice,
            forbiddenWords: ["Weekend Family Feast"], // Recipe name forbidden!
          },
        },
        campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
      });

      expect(result.violations.some((v) => v.code === "BRAND_VOICE_VIOLATION")).toBe(true);
    });

    test("Q5: Diversity & repetition detection signals are properly computed", () => {
      const historyWithRepeat: HistoricalCampaignRecord[] = [
        { campaignId: "c1", mechanismId: "mechanism_curated_family_set", psychologyId: "psychology_choice_simplification", recipeId: "recipe_restaurant_weekend_family", runDate: "2026-09-01", performanceTrend: "STABLE", audienceResponseScore: 80 },
        { campaignId: "c2", mechanismId: "mechanism_curated_family_set", psychologyId: "psychology_choice_simplification", recipeId: "recipe_restaurant_weekend_family", runDate: "2026-09-10", performanceTrend: "STABLE", audienceResponseScore: 78 },
        { campaignId: "c3", mechanismId: "mechanism_curated_family_set", psychologyId: "psychology_choice_simplification", recipeId: "recipe_restaurant_weekend_family", runDate: "2026-09-20", performanceTrend: "DECLINING", audienceResponseScore: 55 },
      ];

      const result = harness.runTestCase({
        businessProfile: FIXTURE_CASUAL_RESTAURANT,
        campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
        campaignHistory: historyWithRepeat,
      });

      expect(result.repetitionSignal).toBe("HIGH");
      expect(result.fatigueSignal).toBe("LIKELY");
    });

    test("Q6: Reasoning trace & explanation are provided for all strategy decisions", () => {
      const restCase = ALL_SYNTHETIC_CASES.find((c) => c.id === "synth_rest_01_weekend_family")!;
      const result = runner.runCase(restCase);

      expect(result.whyThisStrategy).toBeTruthy();
      expect(result.whyThisStrategy.length).toBeGreaterThan(10);
    });

    test("Q7: Generic strategy collapse rate is strictly under 40%", () => {
      const results = runner.runAllCases(ALL_SYNTHETIC_CASES);
      const collapseReport = collapseDetector.evaluateSuite(results);
      expect(collapseReport.genericStrategyRate).toBeLessThan(0.40);
    });
  });
});
