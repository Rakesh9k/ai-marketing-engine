/**
 * PHASE 10.38 — Recipe Seeder Service
 * Idempotently seeds the 31 production-quality creative recipes into the Creative Knowledge Versioning system.
 */

import { CreativeVersionService } from "../../../creativeBank/versioning/creativeVersionService";
import { ALL_CREATIVE_RECIPES, validateRecipeManifest } from "./recipeManifest";

export interface SeedRecipesResult {
  seededCount: number;
  skippedCount: number;
  recipeIds: string[];
  manifestValid: boolean;
  errors: string[];
}

export class RecipeSeeder {
  private versionService: CreativeVersionService;

  constructor(versionService?: CreativeVersionService) {
    this.versionService = versionService || new CreativeVersionService();
  }

  /**
   * Idempotently seeds all 31 recipes.
   */
  public async seedAllRecipes(actorId = "system_recipe_seeder"): Promise<SeedRecipesResult> {
    const manifestCheck = validateRecipeManifest();
    if (!manifestCheck.isValid) {
      return {
        seededCount: 0,
        skippedCount: 0,
        recipeIds: [],
        manifestValid: false,
        errors: manifestCheck.errors,
      };
    }

    let seededCount = 0;
    let skippedCount = 0;
    const seededIds: string[] = [];

    for (const recipe of ALL_CREATIVE_RECIPES) {
      const existing = await this.versionService.getItem(recipe.id);
      if (!existing) {
        const { item, version } = await this.versionService.createInitialItem(
          recipe.id,
          "RECIPE",
          recipe.name,
          recipe.description,
          actorId,
          "GLOBAL"
        );

        // Activate the initial version
        await this.versionService.activateCreativeBankVersion(
          item.id,
          version.id,
          1,
          actorId
        );

        seededCount++;
        seededIds.push(recipe.id);
      } else {
        skippedCount++;
        seededIds.push(recipe.id);
      }
    }

    return {
      seededCount,
      skippedCount,
      recipeIds: seededIds,
      manifestValid: true,
      errors: [],
    };
  }
}
