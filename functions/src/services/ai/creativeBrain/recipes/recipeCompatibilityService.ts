/**
 * PHASE 10.38 — Recipe Compatibility Service
 * Evaluates industry, business model, and strategic compatibility for Creative Recipes.
 * Strictly rejects unsupported recipes cleanly per industry.
 */

import type { CreativeRecipe, RecipeRetrievalContext } from "./creativeRecipe.types";

export interface CompatibilityCheckResult {
  isCompatible: boolean;
  score: number; // 0.0 - 1.0
  reasons: string[];
}

export class RecipeCompatibilityService {
  /**
   * Checks if a recipe is compatible with the given retrieval context.
   */
  public checkCompatibility(
    recipe: CreativeRecipe,
    context: RecipeRetrievalContext
  ): CompatibilityCheckResult {
    const reasons: string[] = [];
    let isCompatible = true;
    let score = 1.0;

    // 1. Check explicit unsupported industries
    if (
      recipe.constraints?.unsupportedIndustries &&
      recipe.constraints.unsupportedIndustries.includes(context.industry)
    ) {
      return {
        isCompatible: false,
        score: 0.0,
        reasons: [`Recipe '${recipe.id}' explicitly excludes industry '${context.industry}'.`],
      };
    }

    // 2. Vertical Alignment Check
    if (recipe.vertical !== "UNIVERSAL" && recipe.vertical !== context.industry) {
      return {
        isCompatible: false,
        score: 0.0,
        reasons: [
          `Recipe vertical '${recipe.vertical}' does not match requested context industry '${context.industry}'.`,
        ],
      };
    }

    // 3. Excluded Recipe IDs Check
    if (context.excludeRecipeIds && context.excludeRecipeIds.includes(recipe.id)) {
      return {
        isCompatible: false,
        score: 0.0,
        reasons: [`Recipe '${recipe.id}' is in the context exclude list.`],
      };
    }

    // 4. Sub-vertical / Business Type Fit
    if (recipe.strategicInput.targetSubVerticals && context.businessType) {
      const match = recipe.strategicInput.targetSubVerticals.some((sub) =>
        sub.toLowerCase().includes(context.businessType.toLowerCase()) ||
        context.businessType.toLowerCase().includes(sub.toLowerCase())
      );
      if (match) {
        score += 0.1;
        reasons.push(`Direct business type match: '${context.businessType}'`);
      }
    }

    // 5. Campaign Objective Fit
    if (context.campaignObjective) {
      const objMatch = recipe.strategicInput.businessObjectives.some((obj) =>
        obj.toLowerCase().includes(context.campaignObjective!.toLowerCase())
      );
      if (objMatch) {
        score += 0.15;
        reasons.push(`Campaign objective match: '${context.campaignObjective}'`);
      }
    }

    // 6. Audience Situation Fit
    if (context.targetAudience) {
      const audMatch = recipe.strategicInput.audienceSituations.some((aud) =>
        aud.toLowerCase().includes(context.targetAudience!.toLowerCase())
      );
      if (audMatch) {
        score += 0.15;
        reasons.push(`Audience situation match: '${context.targetAudience}'`);
      }
    }

    const finalScore = Math.min(1.0, score);

    return {
      isCompatible,
      score: finalScore,
      reasons: reasons.length ? reasons : ["General industry compatibility confirmed."],
    };
  }
}
