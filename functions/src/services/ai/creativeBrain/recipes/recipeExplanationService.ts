/**
 * PHASE 10.38 — Recipe Explanation Service
 * Provides grounded explainability detailing why a specific Creative Recipe was chosen for a campaign.
 */

import type { RecipeRetrievalContext, RankedRecipe } from "./creativeRecipe.types";

export interface RecipeSelectionExplanation {
  recipeId: string;
  recipeName: string;
  primaryWhy: string;
  strategicChain: {
    businessObjective: string;
    audiencePainPoint: string;
    psychologyPrinciple: string;
    primaryMechanism: string;
    expressionFormat: string;
    conversionOffer: string;
  };
  scoreBreakdownText: string;
  diversityJustification: string;
}

export class RecipeExplanationService {
  /**
   * Generates grounded explanation for a selected recipe.
   */
  public explainRecipeSelection(
    rankedRecipe: RankedRecipe,
    context: RecipeRetrievalContext
  ): RecipeSelectionExplanation {
    const { recipe, totalScore, scoreBreakdown } = rankedRecipe;

    const objective = context.campaignObjective || recipe.strategicInput.businessObjectives[0];
    const audiencePain = recipe.strategicInput.customerPainPoints[0];
    const psychology = recipe.creativeLogic.primaryPsychologyId;
    const mechanism = recipe.creativeLogic.primaryMechanismId;
    const visual = recipe.creativeExpression.visualStructureIds[0];
    const offer = recipe.commercialAction.offerMechanismIds[0];

    const primaryWhy = `Mitra selected '${recipe.name}' (Confidence Fit: ${(totalScore * 100).toFixed(0)}%) because it directly solves '${audiencePain}' for ${context.businessType || context.industry} using the ${psychology} principle.`;

    const scoreBreakdownText = `Strategic Fit: ${scoreBreakdown.strategicFit * 100}%, Audience Fit: ${scoreBreakdown.audienceFit * 100}%, Mechanism Fit: ${scoreBreakdown.mechanismFit * 100}%.`;

    const diversityJustification = `Allowed variation axes include ${recipe.constraints.allowedVariationAxes.join(", ")}, ensuring campaign diversity without repeating static hooks.`;

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      primaryWhy,
      strategicChain: {
        businessObjective: objective,
        audiencePainPoint: audiencePain,
        psychologyPrinciple: psychology,
        primaryMechanism: mechanism,
        expressionFormat: visual,
        conversionOffer: offer,
      },
      scoreBreakdownText,
      diversityJustification,
    };
  }
}
