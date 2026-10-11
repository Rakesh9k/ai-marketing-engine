/**
 * PHASE 10.40 — Layer 1 Deterministic Unit Test: Recipe Selection
 */

import { CreativeRecipeService } from "../../recipes/creativeRecipeService";
import { FIXTURE_CASUAL_RESTAURANT, FIXTURE_PREMIUM_SALON, FIXTURE_REAL_ESTATE_DEVELOPER } from "../fixtures/businessBrainFixtures";

describe("Layer 1 Unit Test — Recipe Selection", () => {
  let recipeService: CreativeRecipeService;

  beforeEach(() => {
    recipeService = new CreativeRecipeService();
  });

  test("shouldSelectRestaurantRecipeForRestaurantContext", () => {
    const recipes = recipeService.getRelevantCreativeRecipes({
      industry: FIXTURE_CASUAL_RESTAURANT.industry,
      businessType: FIXTURE_CASUAL_RESTAURANT.subVertical,
    });

    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes[0].recipe.vertical).toBe("RESTAURANT");
  });

  test("shouldSelectSalonRecipeForSalonContext", () => {
    const recipes = recipeService.getRelevantCreativeRecipes({
      industry: FIXTURE_PREMIUM_SALON.industry,
      businessType: FIXTURE_PREMIUM_SALON.subVertical,
    });

    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes[0].recipe.vertical).toBe("SALON");
  });

  test("shouldSelectRealEstateRecipeForRealEstateContext", () => {
    const recipes = recipeService.getRelevantCreativeRecipes({
      industry: FIXTURE_REAL_ESTATE_DEVELOPER.industry,
      businessType: FIXTURE_REAL_ESTATE_DEVELOPER.subVertical,
    });

    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes[0].recipe.vertical).toBe("REAL_ESTATE");
  });
});
