/**
 * PHASE 10.40 — Layer 1 Deterministic Unit Test: Compatibility
 */

import { RecipeCompatibilityService } from "../../recipes/recipeCompatibilityService";
import { RESTAURANT_RECIPES } from "../../recipes/seed/restaurantRecipes.seed";
import { SALON_RECIPES } from "../../recipes/seed/salonRecipes.seed";

describe("Layer 1 Unit Test — Industry Compatibility", () => {
  let compatibilityService: RecipeCompatibilityService;

  beforeEach(() => {
    compatibilityService = new RecipeCompatibilityService();
  });

  test("shouldRespectIndustryCompatibility_RejectRestaurantRecipeForRealEstate", () => {
    const restaurantRecipe = RESTAURANT_RECIPES[0];
    const res = compatibilityService.checkCompatibility(restaurantRecipe, {
      industry: "REAL_ESTATE",
      businessType: "Suburban Residential Apartments",
    });

    expect(res.isCompatible).toBe(false);
    expect(res.score).toBe(0.0);
  });

  test("shouldRespectIndustryCompatibility_RejectSalonRecipeForRestaurant", () => {
    const salonRecipe = SALON_RECIPES[0];
    const res = compatibilityService.checkCompatibility(salonRecipe, {
      industry: "RESTAURANT",
      businessType: "Family Restaurant",
    });

    expect(res.isCompatible).toBe(false);
    expect(res.score).toBe(0.0);
  });

  test("shouldAllowValidIndustryRecipe", () => {
    const restaurantRecipe = RESTAURANT_RECIPES[0];
    const res = compatibilityService.checkCompatibility(restaurantRecipe, {
      industry: "RESTAURANT",
      businessType: "Casual Dining",
    });

    expect(res.isCompatible).toBe(true);
    expect(res.score).toBeGreaterThan(0.7);
  });
});
