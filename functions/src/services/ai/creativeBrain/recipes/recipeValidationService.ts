/**
 * PHASE 10.38 — Recipe Validation Service (Sandbox Testing API)
 * Validates creative recipes in sandbox mode before deployment or active usage.
 */

import type { CreativeRecipe, RecipeSandboxResult } from "./creativeRecipe.types";
import { RecipeVariationService } from "./recipeVariationService";

export class RecipeValidationService {
  private variationService: RecipeVariationService;

  constructor(variationService?: RecipeVariationService) {
    this.variationService = variationService || new RecipeVariationService();
  }

  /**
   * Executes sandbox validation tests on a candidate Creative Recipe.
   */
  public testCreativeRecipe(recipe: CreativeRecipe): RecipeSandboxResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Basic Metadata Validation
    if (!recipe.id) errors.push("Recipe missing ID");
    if (!recipe.name) errors.push("Recipe missing name");
    if (!recipe.vertical) errors.push("Recipe missing vertical");

    // 2. 5-Layer Completeness Check
    if (!recipe.strategicInput?.businessObjectives?.length) {
      errors.push("Strategic Input Layer missing businessObjectives");
    }
    if (!recipe.strategicInput?.audienceSituations?.length) {
      errors.push("Strategic Input Layer missing audienceSituations");
    }
    if (!recipe.creativeLogic?.primaryPsychologyId) {
      errors.push("Creative Logic Layer missing primaryPsychologyId");
    }
    if (!recipe.creativeLogic?.primaryMechanismId) {
      errors.push("Creative Logic Layer missing primaryMechanismId");
    }
    if (!recipe.creativeExpression?.hookPatternIds?.length) {
      errors.push("Creative Expression Layer missing hookPatternIds");
    }
    if (!recipe.creativeExpression?.storyStructureIds?.length) {
      errors.push("Creative Expression Layer missing storyStructureIds");
    }
    if (!recipe.creativeExpression?.visualStructureIds?.length) {
      errors.push("Creative Expression Layer missing visualStructureIds");
    }
    if (!recipe.commercialAction?.offerMechanismIds?.length) {
      errors.push("Commercial Action Layer missing offerMechanismIds");
    }
    if (!recipe.commercialAction?.ctaMechanismIds?.length) {
      errors.push("Commercial Action Layer missing ctaMechanismIds");
    }

    // 3. Constraints & Variation Axes Check
    if (!recipe.constraints?.allowedVariationAxes?.length) {
      warnings.push("Constraints Layer has empty allowedVariationAxes");
    }

    // 4. Sandbox Variation Generation Test
    let sampleDirections: RecipeSandboxResult["sampleDirections"] = [];
    if (errors.length === 0) {
      const generated = this.variationService.generateVariations(recipe, 2);
      sampleDirections = generated.map((g) => ({
        hookId: g.hookPatternId,
        storyId: g.storyStructureId,
        visualId: g.visualStructureId,
        copyId: g.copyStructureId,
        offerId: g.offerMechanismId,
        ctaId: g.ctaMechanismId,
      }));
    }

    return {
      isValid: errors.length === 0,
      recipeId: recipe.id,
      errors,
      warnings,
      generatedVariationsCount: sampleDirections.length,
      sampleDirections,
    };
  }
}
