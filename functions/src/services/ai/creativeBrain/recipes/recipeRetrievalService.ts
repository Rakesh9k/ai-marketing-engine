/**
 * PHASE 10.38 — Recipe Retrieval Service
 * High-level orchestration for retrieving, filtering, and ranking Creative Recipes for campaign briefs.
 */

import type { CreativeRecipe, RecipeRetrievalContext, RankedRecipe } from "./creativeRecipe.types";
import { ALL_CREATIVE_RECIPES } from "./seed/recipeManifest";
import { RecipeRankingService } from "./recipeRankingService";
import { RecipeCompatibilityService } from "./recipeCompatibilityService";

export class RecipeRetrievalService {
  private rankingService: RecipeRankingService;
  private compatibilityService: RecipeCompatibilityService;
  private recipeCorpus: CreativeRecipe[];

  constructor(
    recipeCorpus?: CreativeRecipe[],
    rankingService?: RecipeRankingService,
    compatibilityService?: RecipeCompatibilityService
  ) {
    this.recipeCorpus = recipeCorpus || ALL_CREATIVE_RECIPES;
    this.compatibilityService = compatibilityService || new RecipeCompatibilityService();
    this.rankingService = rankingService || new RecipeRankingService(this.compatibilityService);
  }

  /**
   * Retrieves relevant ranked creative recipes for a given campaign context.
   */
  public getRelevantCreativeRecipes(
    context: RecipeRetrievalContext,
    limit = 5
  ): RankedRecipe[] {
    // 1. Filter out unsupported recipes first
    const compatible = this.recipeCorpus.filter((recipe) => {
      const res = this.compatibilityService.checkCompatibility(recipe, context);
      return res.isCompatible;
    });

    // 2. Rank using multi-dimensional score
    const ranked = this.rankingService.rankRecipes(compatible, context);

    // 3. Return top N recommendations
    return ranked.slice(0, limit);
  }
}
