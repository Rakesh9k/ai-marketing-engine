/**
 * PHASE 10.40 — Layer 4 Regression Test: Creative Bank Bias
 */

import { ALL_CREATIVE_RECIPES } from "../../recipes/seed/recipeManifest";

describe("Layer 4 Regression Test — Creative Bank Bias", () => {
  test("shouldHaveBalancedRecipeDistributionAcrossVerticals", () => {
    const restaurantCount = ALL_CREATIVE_RECIPES.filter((r) => r.vertical === "RESTAURANT").length;
    const salonCount = ALL_CREATIVE_RECIPES.filter((r) => r.vertical === "SALON").length;
    const realEstateCount = ALL_CREATIVE_RECIPES.filter((r) => r.vertical === "REAL_ESTATE").length;

    expect(restaurantCount).toBeGreaterThanOrEqual(9);
    expect(salonCount).toBeGreaterThanOrEqual(9);
    expect(realEstateCount).toBeGreaterThanOrEqual(9);
  });
});
