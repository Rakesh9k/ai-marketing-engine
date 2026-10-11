/**
 * PHASE 10.38 — Recipe Variation Service
 * Generates controlled creative variations across allowed axes (HOOK, STORY, VISUAL, COPY, EMOTION, OFFER_FRAMING, CTA).
 */

import type { CreativeRecipe, RecipeVariationAxis } from "./creativeRecipe.types";

export interface CreativeDirectionVariation {
  variationId: string;
  recipeId: string;
  recipeName: string;
  axis: RecipeVariationAxis;
  hookPatternId: string;
  storyStructureId: string;
  visualStructureId: string;
  copyStructureId: string;
  offerMechanismId: string;
  ctaMechanismId: string;
  emotionalTerritory?: string;
  rationale: string;
}

export class RecipeVariationService {
  /**
   * Generates a set of distinct strategic variations for a recipe based on its allowedVariationAxes.
   */
  public generateVariations(
    recipe: CreativeRecipe,
    count = 3
  ): CreativeDirectionVariation[] {
    const variations: CreativeDirectionVariation[] = [];

    const hooks = recipe.creativeExpression.hookPatternIds;
    const stories = recipe.creativeExpression.storyStructureIds;
    const visuals = recipe.creativeExpression.visualStructureIds;
    const copies = recipe.creativeExpression.copyStructureIds;
    const offers = recipe.commercialAction.offerMechanismIds;
    const ctas = recipe.commercialAction.ctaMechanismIds;
    const emotions = recipe.creativeExpression.emotionalTerritories || ["Confidence"];

    const allowedAxes = recipe.constraints.allowedVariationAxes;

    for (let i = 0; i < count; i++) {
      const axis = allowedAxes[i % allowedAxes.length];
      const hookId = hooks[i % hooks.length] || hooks[0];
      const storyId = stories[i % stories.length] || stories[0];
      const visualId = visuals[i % visuals.length] || visuals[0];
      const copyId = copies[i % copies.length] || copies[0];
      const offerId = offers[i % offers.length] || offers[0];
      const ctaId = ctas[i % ctas.length] || ctas[0];
      const emotion = emotions[i % emotions.length];

      variations.push({
        variationId: `${recipe.id}_var_${i + 1}`,
        recipeId: recipe.id,
        recipeName: recipe.name,
        axis,
        hookPatternId: hookId,
        storyStructureId: storyId,
        visualStructureId: visualId,
        copyStructureId: copyId,
        offerMechanismId: offerId,
        ctaMechanismId: ctaId,
        emotionalTerritory: emotion,
        rationale: `Variation ${i + 1} emphasizing variation axis '${axis}' with ${emotion} tone.`,
      });
    }

    return variations;
  }
}
