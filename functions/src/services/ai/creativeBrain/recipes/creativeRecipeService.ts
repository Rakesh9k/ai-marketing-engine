/**
 * PHASE 10.38 / P2 — Creative Recipe Service (Master Facade)
 * Master operational entrypoint for the Creative Recipe Library with health monitoring and search capability.
 */

import type {
  CreativeRecipe,
  RecipeRetrievalContext,
  RankedRecipe,
  RecipeSandboxResult,
} from "./creativeRecipe.types";
import { ALL_CREATIVE_RECIPES, generateRecipeManifestSummary, validateRecipeManifest } from "./seed/recipeManifest";
import { RecipeSeeder } from "./seed/recipeSeeder";
import { RecipeRetrievalService } from "./recipeRetrievalService";
import { RecipeRankingService } from "./recipeRankingService";
import { RecipeCompatibilityService } from "./recipeCompatibilityService";
import type { CreativeDirectionVariation } from "./recipeVariationService";
import { RecipeVariationService } from "./recipeVariationService";
import type { RecipeSelectionExplanation } from "./recipeExplanationService";
import { RecipeExplanationService } from "./recipeExplanationService";
import { RecipeValidationService } from "./recipeValidationService";
import { CreativeVersionService } from "../../creativeBank/versioning/creativeVersionService";

export class CreativeRecipeService {
  private versionService: CreativeVersionService;
  private seeder: RecipeSeeder;
  private retrievalService: RecipeRetrievalService;
  private rankingService: RecipeRankingService;
  private compatibilityService: RecipeCompatibilityService;
  private variationService: RecipeVariationService;
  private explanationService: RecipeExplanationService;
  private validationService: RecipeValidationService;
  private recipeStore: Map<string, CreativeRecipe>;

  constructor(
    versionService?: CreativeVersionService,
    recipesOverride?: CreativeRecipe[]
  ) {
    this.versionService = versionService || new CreativeVersionService();
    this.seeder = new RecipeSeeder(this.versionService);
    this.compatibilityService = new RecipeCompatibilityService();
    this.rankingService = new RecipeRankingService(this.compatibilityService);
    
    const recipes = recipesOverride || ALL_CREATIVE_RECIPES;
    this.recipeStore = new Map(recipes.map((r) => [r.id, r]));
    
    this.retrievalService = new RecipeRetrievalService(
      Array.from(this.recipeStore.values()),
      this.rankingService,
      this.compatibilityService
    );
    this.variationService = new RecipeVariationService();
    this.explanationService = new RecipeExplanationService();
    this.validationService = new RecipeValidationService(this.variationService);
  }

  /**
   * Initializes and seeds all production-quality recipes into Creative Version Service.
   */
  public async initializeAndSeed(actorId = "system_init") {
    return this.seeder.seedAllRecipes(actorId);
  }

  /**
   * Returns manifest summary metrics.
   */
  public getManifestSummary() {
    return generateRecipeManifestSummary();
  }

  /**
   * Returns a comprehensive operational health report for all loaded recipes.
   */
  public getRecipeHealthReport(): {
    totalRecipes: number;
    maturityCounts: Record<string, number>;
    verticalCounts: Record<string, number>;
    averageConfidenceScore: number;
    antiPatternCoverageCount: number;
    manifestValidation: { isValid: boolean; errors: string[] };
  } {
    const recipes = this.getAllRecipes();
    const totalRecipes = recipes.length;
    const maturityCounts: Record<string, number> = {};
    const verticalCounts: Record<string, number> = {};
    let totalScore = 0;
    const uniqueAntiPatterns = new Set<string>();

    for (const recipe of recipes) {
      maturityCounts[recipe.maturity] = (maturityCounts[recipe.maturity] || 0) + 1;
      verticalCounts[recipe.vertical] = (verticalCounts[recipe.vertical] || 0) + 1;
      totalScore += recipe.confidenceScore || 0;
      if (recipe.constraints?.antiPatternIds) {
        for (const ap of recipe.constraints.antiPatternIds) {
          uniqueAntiPatterns.add(ap);
        }
      }
    }

    return {
      totalRecipes,
      maturityCounts,
      verticalCounts,
      averageConfidenceScore: totalRecipes > 0 ? parseFloat((totalScore / totalRecipes).toFixed(4)) : 0,
      antiPatternCoverageCount: uniqueAntiPatterns.size,
      manifestValidation: validateRecipeManifest(),
    };
  }

  /**
   * Flexible recipe search & filtering tool for operations & audit.
   */
  public searchRecipes(query: {
    vertical?: string;
    minConfidence?: number;
    keyword?: string;
  }): CreativeRecipe[] {
    let recipes = this.getAllRecipes();

    if (query.vertical) {
      const vUpper = query.vertical.toUpperCase();
      recipes = recipes.filter((r) => r.vertical.toUpperCase() === vUpper);
    }

    if (query.minConfidence !== undefined) {
      recipes = recipes.filter((r) => r.confidenceScore >= query.minConfidence!);
    }

    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      recipes = recipes.filter(
        (r) =>
          r.name.toLowerCase().includes(kw) ||
          r.description.toLowerCase().includes(kw) ||
          r.id.toLowerCase().includes(kw)
      );
    }

    return recipes;
  }

  /**
   * Retrieves a recipe by ID.
   */
  public getRecipe(recipeId: string): CreativeRecipe | undefined {
    return this.recipeStore.get(recipeId);
  }

  /**
   * Retrieves all registered recipes.
   */
  public getAllRecipes(): CreativeRecipe[] {
    return Array.from(this.recipeStore.values());
  }

  /**
   * Retrieves candidate recipes for a given campaign context.
   */
  public getRelevantCreativeRecipes(
    context: RecipeRetrievalContext,
    limit = 5
  ): RankedRecipe[] {
    return this.retrievalService.getRelevantCreativeRecipes(context, limit);
  }

  /**
   * Generates strategic variations for a recipe.
   */
  public generateRecipeVariations(
    recipeId: string,
    count = 3
  ): CreativeDirectionVariation[] {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) {
      throw new Error(`Recipe '${recipeId}' not found.`);
    }
    return this.variationService.generateVariations(recipe, count);
  }

  /**
   * Explains why a recipe was selected for a given campaign.
   */
  public explainSelection(
    rankedRecipe: RankedRecipe,
    context: RecipeRetrievalContext
  ): RecipeSelectionExplanation {
    return this.explanationService.explainRecipeSelection(rankedRecipe, context);
  }

  /**
   * Tests a recipe in sandbox mode.
   */
  public testRecipe(recipeIdOrObject: string | CreativeRecipe): RecipeSandboxResult {
    let recipe: CreativeRecipe | undefined;
    if (typeof recipeIdOrObject === "string") {
      recipe = this.getRecipe(recipeIdOrObject);
      if (!recipe) {
        throw new Error(`Recipe '${recipeIdOrObject}' not found.`);
      }
    } else {
      recipe = recipeIdOrObject;
    }
    return this.validationService.testCreativeRecipe(recipe);
  }
}
