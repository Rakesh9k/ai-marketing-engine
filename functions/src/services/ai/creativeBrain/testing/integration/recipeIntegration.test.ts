/**
 * PHASE 10.40 — Layer 3 Integration Test: Recipe Integration & Variation Sandbox
 */

import { CreativeRecipeService } from "../../recipes/creativeRecipeService";

describe("Layer 3 Integration Test — Recipe Retrieval & Variations Sandbox", () => {
  let recipeService: CreativeRecipeService;

  beforeEach(() => {
    recipeService = new CreativeRecipeService();
  });

  test("shouldRetrieveAndRankRecipesForCampaignContext", () => {
    const results = recipeService.getRelevantCreativeRecipes({
      industry: "RESTAURANT",
      businessType: "Casual Dining",
      campaignObjective: "Increase weekend table reservations",
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].totalScore).toBeGreaterThan(0.7);
    expect(results[0].recipe.vertical).toBe("RESTAURANT");
  });

  test("shouldGenerateRecipeVariationsAcrossAllowedAxes", () => {
    const recipe = recipeService.getAllRecipes()[0];
    const vars = recipeService.generateRecipeVariations(recipe.id, 3);

    expect(vars.length).toBe(3);
    expect(vars[0].recipeId).toBe(recipe.id);
    expect(vars[0].axis).toBeDefined();
  });
});
