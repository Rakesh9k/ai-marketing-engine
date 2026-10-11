/**
 * PHASE 10.41 — IP Layer 3: Creative Composer Service
 * Composes candidate mechanisms, psychologies, insights, recipes, hooks, stories,
 * visuals, offers, and CTAs into a coherent CreativeStrategy contract.
 */

import type {
  CreativeContext,
  CreativeOpportunity,
  CreativeStrategy,
  RefusalResult,
  CreativeExplanationContract,
} from "../types/creativeArchitecture.types";
import { CreativeRecipeService } from "../recipes/creativeRecipeService";
import type { CreativeRecipe } from "../recipes/creativeRecipe.types";

export interface CompositionInput {
  context: CreativeContext;
  opportunity: CreativeOpportunity;
  userMechanismOverride?: string;
}

export class CreativeComposerService {
  private recipeService: CreativeRecipeService;

  constructor(recipeService?: CreativeRecipeService) {
    this.recipeService = recipeService || new CreativeRecipeService();
  }

  /**
   * Composes a CreativeStrategy from CreativeContext and CreativeOpportunity.
   * If mandatory truth evidence is missing or no compatible recipe exists, returns RefusalResult.
   */
  public compose(input: CompositionInput): CreativeStrategy | RefusalResult {
    const { context, opportunity, userMechanismOverride } = input;

    // 1. Check Truth & Hard Constraints
    if (context.campaign.offerDetails?.hasOffer) {
      const isScarcity = userMechanismOverride === "mechanism_discount_flash_sale";
      const hasProof = context.business.verifiedEvidence.hasStatedExpiry || context.business.verifiedEvidence.hasInventoryLimit || context.campaign.offerDetails.hasStatedExpiry || context.campaign.offerDetails.hasInventoryLimit;
      if (isScarcity && !hasProof) {
        return {
          refused: true,
          reason: "TRUTH_VIOLATION",
          message: "Scarcity/urgency mechanism requested without verified expiry date or inventory limit proof.",
          missingRequirements: ["hasStatedExpiry", "hasInventoryLimit"],
        };
      }
    }

    // 2. Retrieve Candidate Recipes
    const rankedRecipes = this.recipeService.getRelevantCreativeRecipes({
      industry: context.business.industry.toUpperCase() as any,
      businessType: context.business.subVertical,
      campaignObjective: context.campaign.campaignObjective,
      targetAudience: `${context.campaign.targetAudience} ${context.campaign.audienceSituation}`,
      locationContext: context.local?.city,
    });

    if (!rankedRecipes.length) {
      return {
        refused: true,
        reason: "NO_VALID_DIRECTION",
        message: `No compatible creative recipe matches business subVertical '${context.business.subVertical}' and objective '${context.campaign.campaignObjective}'.`,
        missingRequirements: ["compatible_recipe_in_bank"],
      };
    }

    const selectedRanked = rankedRecipes[0];
    const recipe: CreativeRecipe = selectedRanked.recipe;

    // 3. Assemble Components
    const psychologyIds = [recipe.creativeLogic.primaryPsychologyId, ...(recipe.creativeLogic.secondaryPsychologyIds || [])];
    let mechanismIds = [recipe.creativeLogic.primaryMechanismId, ...(recipe.creativeLogic.secondaryMechanismIds || [])];

    if (userMechanismOverride && !mechanismIds.includes(userMechanismOverride)) {
      mechanismIds = [userMechanismOverride, ...mechanismIds];
    }

    const storyStructureId = recipe.creativeExpression.storyStructureIds[0];
    const hookPatternId = recipe.creativeExpression.hookPatternIds[0];
    const visualStructureId = recipe.creativeExpression.visualStructureIds[0];
    const copyStructureId = recipe.creativeExpression.copyStructureIds[0];
    const offerMechanismId = recipe.commercialAction.offerMechanismIds[0];
    const ctaMechanismId = recipe.commercialAction.ctaMechanismIds[0];

    // 4. Build Explanation
    const decisionTrace = [
      `Context: Industry ${context.business.industry}, SubVertical ${context.business.subVertical}`,
      `Objective: ${context.campaign.campaignObjective}, Decision Stage ${context.campaign.decisionStage}`,
      `Audience Situation: ${context.campaign.audienceSituation}`,
      `Recipe Selected: ${recipe.name} (v${recipe.version}, Score: ${selectedRanked.totalScore})`,
      `Primary Psychology: ${psychologyIds[0]}`,
      `Primary Mechanism: ${mechanismIds[0]}`,
    ];

    const rejectedAlternatives = rankedRecipes.slice(1, 4).map((r) => `Ranked #${r.recipe.name} (Score ${r.totalScore})`);

    const whyThisStrategy: CreativeExplanationContract = {
      primaryWhy: `Selected '${recipe.name}' leveraging ${psychologyIds[0]} and ${mechanismIds[0]} to resolve ${context.campaign.audienceSituation}.`,
      decisionTrace,
      rejectedAlternatives,
    };

    return {
      strategyId: `strat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      contextId: context.contextId,
      strategicDirection: recipe.name,
      psychologyIds,
      mechanismIds,
      insightIds: recipe.creativeLogic.insightPatternId ? [recipe.creativeLogic.insightPatternId] : [],
      recipeId: recipe.id,
      recipeVersion: recipe.version,
      audienceSituation: context.campaign.audienceSituation,
      customerTension: opportunity.strategicProblem,
      emotionalTerritory: recipe.creativeExpression.emotionalTerritories,
      storyStructureId,
      hookPatternId,
      visualStructureId,
      copyStructureId,
      offerMechanismId,
      ctaMechanismId,
      strategicRecommendation: recipe.description,
      thingsToAvoid: recipe.constraints.antiPatternIds || [],
      whyThisStrategy,
      confidence: Number(selectedRanked.totalScore.toFixed(2)),
      diversityContribution: context.diversity ? 1 - context.diversity.repetitionPenalty : 1.0,
      culturalInfluence: context.local ? [context.local.city] : [],
      createdAt: new Date().toISOString(),
    };
  }
}
