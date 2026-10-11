/**
 * PHASE 10.38 / P2 — Creative Recipe Seed Manifest
 * Aggregates 46 production-quality creative recipes across priority verticals (Restaurant, Salon, Real Estate, Retail, Healthcare, B2B, Education, Automotive).
 */

import type { CreativeRecipe } from "../creativeRecipe.types";
import { RESTAURANT_RECIPES } from "./restaurantRecipes.seed";
import { SALON_RECIPES } from "./salonRecipes.seed";
import { REAL_ESTATE_RECIPES } from "./realEstateRecipes.seed";
import { EXPANDED_RECIPES } from "./expandedRecipes.seed";

export const ALL_CREATIVE_RECIPES: CreativeRecipe[] = [
  ...RESTAURANT_RECIPES,
  ...SALON_RECIPES,
  ...REAL_ESTATE_RECIPES,
  ...EXPANDED_RECIPES,
];

export interface RecipeManifestSummary {
  totalCount: number;
  restaurantCount: number;
  salonCount: number;
  realEstateCount: number;
  retailCount: number;
  healthcareCount: number;
  b2bCount: number;
  educationCount: number;
  automotiveCount: number;
  checksum: string;
}

export function generateRecipeManifestSummary(): RecipeManifestSummary {
  const restaurantCount = RESTAURANT_RECIPES.length;
  const salonCount = SALON_RECIPES.length;
  const realEstateCount = REAL_ESTATE_RECIPES.length;
  const retailCount = EXPANDED_RECIPES.filter((r) => r.vertical === "RETAIL").length;
  const healthcareCount = EXPANDED_RECIPES.filter((r) => r.vertical === "HEALTHCARE").length;
  const b2bCount = EXPANDED_RECIPES.filter((r) => r.vertical === "B2B").length;
  const educationCount = EXPANDED_RECIPES.filter((r) => r.vertical === "EDUCATION").length;
  const automotiveCount = EXPANDED_RECIPES.filter((r) => r.vertical === "AUTOMOTIVE").length;
  const totalCount = ALL_CREATIVE_RECIPES.length;

  const ids = ALL_CREATIVE_RECIPES.map((r) => r.id).sort().join("|");
  let hash = 0;
  for (let i = 0; i < ids.length; i++) {
    const char = ids.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }

  return {
    totalCount,
    restaurantCount,
    salonCount,
    realEstateCount,
    retailCount,
    healthcareCount,
    b2bCount,
    educationCount,
    automotiveCount,
    checksum: `sha256_mock_${Math.abs(hash).toString(16)}`,
  };
}

export function validateRecipeManifest(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const idSet = new Set<string>();

  for (const recipe of ALL_CREATIVE_RECIPES) {
    if (idSet.has(recipe.id)) {
      errors.push(`Duplicate recipe ID found: ${recipe.id}`);
    }
    idSet.add(recipe.id);

    if (!recipe.strategicInput?.businessObjectives?.length) {
      errors.push(`Recipe ${recipe.id} missing strategicInput.businessObjectives`);
    }
    if (!recipe.creativeLogic?.primaryPsychologyId) {
      errors.push(`Recipe ${recipe.id} missing creativeLogic.primaryPsychologyId`);
    }
    if (!recipe.creativeLogic?.primaryMechanismId) {
      errors.push(`Recipe ${recipe.id} missing creativeLogic.primaryMechanismId`);
    }
    if (!recipe.commercialAction?.offerMechanismIds?.length) {
      errors.push(`Recipe ${recipe.id} missing commercialAction.offerMechanismIds`);
    }
  }

  if (ALL_CREATIVE_RECIPES.length !== 46) {
    errors.push(`Expected 46 total recipes, found ${ALL_CREATIVE_RECIPES.length}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
