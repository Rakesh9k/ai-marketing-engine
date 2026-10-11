/**
 * PHASE 10.38 / P2 — Recipe Library Test Suite
 * Tests manifest integrity, 5-layer completeness, versioning, compatibility filtering,
 * multi-factor ranking, variation generation, explainability, operational health, and sandbox testing.
 */

import { CreativeRecipeService } from "../recipes/creativeRecipeService";
import { ALL_CREATIVE_RECIPES, validateRecipeManifest, generateRecipeManifestSummary } from "../recipes/seed/recipeManifest";
import { RESTAURANT_RECIPES } from "../recipes/seed/restaurantRecipes.seed";
import { SALON_RECIPES } from "../recipes/seed/salonRecipes.seed";
import { REAL_ESTATE_RECIPES } from "../recipes/seed/realEstateRecipes.seed";
import { EXPANDED_RECIPES } from "../recipes/seed/expandedRecipes.seed";
import { CreativeVersionService } from "../../creativeBank/versioning/creativeVersionService";

describe("Phase 10.38 — Recipe Library System", () => {
  let recipeService: CreativeRecipeService;
  let versionService: CreativeVersionService;

  beforeEach(() => {
    versionService = new CreativeVersionService();
    recipeService = new CreativeRecipeService(versionService);
  });

  describe("1. Manifest & Recipe Corpus Verification", () => {
    test("should contain exactly 46 recipes across priority verticals", () => {
      expect(ALL_CREATIVE_RECIPES.length).toBe(46);
      expect(RESTAURANT_RECIPES.length).toBe(12);
      expect(SALON_RECIPES.length).toBe(9);
      expect(REAL_ESTATE_RECIPES.length).toBe(10);
      expect(EXPANDED_RECIPES.length).toBe(15);
    });

    test("manifest validation should return valid with 0 errors and unique IDs", () => {
      const result = validateRecipeManifest();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should generate valid manifest summary checksum and vertical breakdowns", () => {
      const summary = generateRecipeManifestSummary();
      expect(summary.totalCount).toBe(46);
      expect(summary.restaurantCount).toBe(12);
      expect(summary.salonCount).toBe(9);
      expect(summary.realEstateCount).toBe(10);
      expect(summary.retailCount).toBe(3);
      expect(summary.healthcareCount).toBe(3);
      expect(summary.b2bCount).toBe(3);
      expect(summary.educationCount).toBe(3);
      expect(summary.automotiveCount).toBe(3);
      expect(summary.checksum).toMatch(/^sha256_mock_/);
    });
  });

  describe("2. 5-Layer Completeness & Canonical Linking", () => {
    test("every recipe should possess all 5 structural layers", () => {
      for (const recipe of ALL_CREATIVE_RECIPES) {
        expect(recipe.id).toBeDefined();
        expect(recipe.name).toBeDefined();

        // 1. Strategic Input
        expect(recipe.strategicInput.businessObjectives.length).toBeGreaterThan(0);
        expect(recipe.strategicInput.audienceSituations.length).toBeGreaterThan(0);
        expect(recipe.strategicInput.customerPainPoints.length).toBeGreaterThan(0);

        // 2. Creative Logic
        expect(recipe.creativeLogic.primaryPsychologyId).toMatch(/^psychology_/);
        expect(recipe.creativeLogic.primaryMechanismId).toMatch(/^mechanism_/);

        // 3. Creative Expression
        expect(recipe.creativeExpression.hookPatternIds.length).toBeGreaterThan(0);
        expect(recipe.creativeExpression.storyStructureIds.length).toBeGreaterThan(0);
        expect(recipe.creativeExpression.visualStructureIds.length).toBeGreaterThan(0);

        // 4. Commercial Action
        expect(recipe.commercialAction.offerMechanismIds.length).toBeGreaterThan(0);
        expect(recipe.commercialAction.ctaMechanismIds.length).toBeGreaterThan(0);

        // 5. Constraints
        expect(recipe.constraints.allowedVariationAxes.length).toBeGreaterThan(0);
        expect(recipe.constraints.unsupportedIndustries).toBeDefined();
      }
    });
  });

  describe("3. Versioning Integration (Phase 10.36)", () => {
    test("should idempotently seed recipes into CreativeVersionService", async () => {
      const seedRes = await recipeService.initializeAndSeed("test_actor");
      expect(seedRes.manifestValid).toBe(true);
      expect(seedRes.seededCount).toBe(46);
      expect(seedRes.recipeIds).toHaveLength(46);

      // Verify seeding again is idempotent
      const reSeedRes = await recipeService.initializeAndSeed("test_actor");
      expect(reSeedRes.seededCount).toBe(0);
      expect(reSeedRes.skippedCount).toBe(46);
    });
  });

  describe("4. Compatibility & Industry Rejection", () => {
    test("should reject unsupported recipes per industry cleanly", () => {
      // Restaurant recipe should be rejected when searching for Real Estate
      const results = recipeService.getRelevantCreativeRecipes({
        industry: "REAL_ESTATE",
        businessType: "Luxury Apartments",
      });

      const containsRestaurant = results.some(
        (r) => r.recipe.vertical === "RESTAURANT"
      );
      expect(containsRestaurant).toBe(false);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.recipe.vertical === "REAL_ESTATE")).toBe(true);
    });

    test("should return relevant salon recipes for salon context", () => {
      const results = recipeService.getRelevantCreativeRecipes({
        industry: "SALON",
        businessType: "Skin Clinic",
        targetAudience: "skincare prep",
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.recipe.vertical === "SALON")).toBe(true);
    });

    test("should return relevant retail recipes for retail context", () => {
      const results = recipeService.getRelevantCreativeRecipes({
        industry: "RETAIL",
        businessType: "Apparel Boutique",
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.recipe.vertical === "RETAIL")).toBe(true);
    });
  });

  describe("5. Ranking & Retrieval Engine", () => {
    test("should rank candidate recipes using 8-factor score breakdown", () => {
      const results = recipeService.getRelevantCreativeRecipes({
        industry: "RESTAURANT",
        businessType: "Casual Dining",
        campaignObjective: "Increase weekend table reservations",
        targetAudience: "Family weekend dining",
      });

      expect(results.length).toBeGreaterThan(0);
      const top = results[0];
      expect(top.totalScore).toBeGreaterThan(0.7);
      expect(top.scoreBreakdown.strategicFit).toBeGreaterThan(0);
      expect(top.scoreBreakdown.audienceFit).toBeGreaterThan(0);
      expect(top.scoreBreakdown.objectiveFit).toBeGreaterThan(0);
    });
  });

  describe("6. Variation Generation & Explainability", () => {
    test("should generate controlled variations across allowed axes", () => {
      const recipe = ALL_CREATIVE_RECIPES[0];
      const vars = recipeService.generateRecipeVariations(recipe.id, 3);
      expect(vars).toHaveLength(3);
      expect(vars[0].variationId).toContain(recipe.id);
      expect(vars[0].axis).toBeDefined();
    });

    test("should generate grounded explanation for recipe selection", () => {
      const results = recipeService.getRelevantCreativeRecipes({
        industry: "RESTAURANT",
        businessType: "Casual Dining",
      });

      const explanation = recipeService.explainSelection(results[0], {
        industry: "RESTAURANT",
        businessType: "Casual Dining",
      });

      expect(explanation.recipeId).toBe(results[0].recipe.id);
      expect(explanation.primaryWhy).toContain("Mitra selected");
      expect(explanation.strategicChain.psychologyPrinciple).toBeDefined();
    });
  });

  describe("7. Sandbox Testing API", () => {
    test("testRecipe sandbox should return valid for all 46 recipes", () => {
      for (const recipe of ALL_CREATIVE_RECIPES) {
        const testRes = recipeService.testRecipe(recipe);
        expect(testRes.isValid).toBe(true);
        expect(testRes.errors).toHaveLength(0);
        expect(testRes.generatedVariationsCount).toBe(2);
      }
    });
  });

  describe("8. Operational Health & Search Capability (P2 Operational)", () => {
    test("getRecipeHealthReport should summarize recipe maturity and anti-pattern metrics", () => {
      const health = recipeService.getRecipeHealthReport();
      expect(health.totalRecipes).toBe(46);
      expect(health.maturityCounts.ACTIVE).toBe(46);
      expect(health.averageConfidenceScore).toBeGreaterThan(0.9);
      expect(health.antiPatternCoverageCount).toBeGreaterThan(0);
      expect(health.manifestValidation.isValid).toBe(true);
    });

    test("searchRecipes should filter by vertical, minConfidence, and keyword", () => {
      const retailRecipes = recipeService.searchRecipes({ vertical: "RETAIL" });
      expect(retailRecipes).toHaveLength(3);

      const highConf = recipeService.searchRecipes({ minConfidence: 0.95 });
      expect(highConf.length).toBeGreaterThan(0);

      const searchMatch = recipeService.searchRecipes({ keyword: "audit" });
      expect(searchMatch.length).toBeGreaterThan(0);
    });
  });
});
