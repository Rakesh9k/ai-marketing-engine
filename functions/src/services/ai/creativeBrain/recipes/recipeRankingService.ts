/**
 * PHASE 10.38 — Recipe Ranking Service
 * Ranks compatible Creative Recipes using an 8-factor multi-dimensional scoring pipeline.
 */

import type { CreativeRecipe, RecipeRetrievalContext, RankedRecipe, RecipeScoreBreakdown } from "./creativeRecipe.types";
import { RecipeCompatibilityService } from "./recipeCompatibilityService";

export class RecipeRankingService {
  private compatibilityService: RecipeCompatibilityService;

  constructor(compatibilityService?: RecipeCompatibilityService) {
    this.compatibilityService = compatibilityService || new RecipeCompatibilityService();
  }

  /**
   * Scores and ranks a list of candidate recipes against a retrieval context.
   */
  public rankRecipes(
    recipes: CreativeRecipe[],
    context: RecipeRetrievalContext
  ): RankedRecipe[] {
    const ranked: RankedRecipe[] = [];

    for (const recipe of recipes) {
      const compat = this.compatibilityService.checkCompatibility(recipe, context);
      if (!compat.isCompatible) {
        continue;
      }

      const breakdown = this.calculateScoreBreakdown(recipe, context);
      const totalScore = Number(
        (
          breakdown.strategicFit * 0.2 +
          breakdown.audienceFit * 0.15 +
          breakdown.objectiveFit * 0.15 +
          breakdown.businessFit * 0.15 +
          breakdown.mechanismFit * 0.1 +
          breakdown.evidenceScore * 0.1 +
          breakdown.diversityContribution * 0.08 +
          breakdown.culturalFit * 0.07
        ).toFixed(4)
      );

      const explanation = this.generateBriefExplanation(recipe, breakdown);

      ranked.push({
        recipe,
        totalScore,
        scoreBreakdown: breakdown,
        explanation,
      });
    }

    return ranked.sort((a, b) => b.totalScore - a.totalScore);
  }

  private calculateScoreBreakdown(
    recipe: CreativeRecipe,
    context: RecipeRetrievalContext
  ): RecipeScoreBreakdown {
    // 1. Strategic Fit
    const strategicFit = recipe.confidenceScore > 0 ? recipe.confidenceScore : 0.85;

    // 2. Audience Fit
    let audienceFit = 0.70;
    if (context.targetAudience) {
      const stopWords = new Set(["meal", "dining", "group", "groups", "food", "order", "service", "kitchen", "restaurant", "local", "best"]);
      const targetLower = context.targetAudience.toLowerCase();
      const targetTokens = targetLower.split(/\W+/).filter((t) => t.length > 2 && !stopWords.has(t));
      const matchCount = recipe.strategicInput.audienceSituations.filter((aud) => {
        const audLower = aud.toLowerCase();
        if (audLower.includes(targetLower) || targetLower.includes(audLower)) return true;
        const audTokens = audLower.split(/\W+/).filter((t) => t.length > 2 && !stopWords.has(t));
        return targetTokens.some((t) => audTokens.includes(t));
      }).length;

      if (matchCount >= 2) audienceFit = 1.0;
      else if (matchCount === 1) audienceFit = 0.95;
    }

    // 3. Objective Fit
    let objectiveFit = 0.8;
    if (context.campaignObjective) {
      const match = recipe.strategicInput.businessObjectives.some((obj) =>
        obj.toLowerCase().includes(context.campaignObjective!.toLowerCase())
      );
      if (match) objectiveFit = 0.95;
    }

    // 4. Business Fit
    let businessFit = 0.80;
    if (context.businessType && recipe.strategicInput.targetSubVerticals) {
      const bTypeLower = context.businessType.toLowerCase();
      const bTokens = bTypeLower.split(/\W+/).filter((t) => t.length > 2);
      const match = recipe.strategicInput.targetSubVerticals.some((sub) => {
        const subLower = sub.toLowerCase();
        if (subLower.includes(bTypeLower) || bTypeLower.includes(subLower)) return true;
        const subTokens = subLower.split(/\W+/).filter((t) => t.length > 2);
        return bTokens.some((t) => subTokens.includes(t));
      });
      if (match) businessFit = 0.95;
    }

    // 5. Mechanism Fit
    const primaryRole = recipe.creativeLogic.mechanismRoles[recipe.creativeLogic.primaryMechanismId];
    const mechanismFit = primaryRole === "PRIMARY" ? 0.95 : 0.85;

    // 6. Evidence Score
    const evidenceScore = recipe.version >= 1 ? 0.9 : 0.75;

    // 7. Diversity Contribution
    const diversityContribution = recipe.constraints.allowedVariationAxes.length / 7.0;

    // 8. Cultural Fit
    let culturalFit = 0.85;
    if (context.locationContext) {
      culturalFit = 0.92;
    }

    return {
      strategicFit: Number(strategicFit.toFixed(2)),
      audienceFit: Number(audienceFit.toFixed(2)),
      objectiveFit: Number(objectiveFit.toFixed(2)),
      businessFit: Number(businessFit.toFixed(2)),
      mechanismFit: Number(mechanismFit.toFixed(2)),
      evidenceScore: Number(evidenceScore.toFixed(2)),
      diversityContribution: Number(diversityContribution.toFixed(2)),
      culturalFit: Number(culturalFit.toFixed(2)),
    };
  }

  private generateBriefExplanation(recipe: CreativeRecipe, breakdown: RecipeScoreBreakdown): string {
    return `Selected '${recipe.name}' (Score: ${(breakdown.strategicFit * 100).toFixed(0)}% strategic fit) leveraging ${recipe.creativeLogic.primaryPsychologyId} and ${recipe.creativeLogic.primaryMechanismId}.`;
  }
}
