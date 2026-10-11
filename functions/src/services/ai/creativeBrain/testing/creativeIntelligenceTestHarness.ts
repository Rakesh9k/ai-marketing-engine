/**
 * PHASE 10.40 — Creative Intelligence Test Harness
 * Master test execution engine, Truth & Safety guardrails validator, reasoning trace generator,
 * and custom assertion utilities for automated intelligence testing.
 */

import type { TestBusinessProfile } from "./fixtures/businessBrainFixtures";
import type { TestCampaignIntent, DecisionStage } from "./fixtures/campaignIntentFixtures";
import type { HistoricalCampaignRecord } from "./fixtures/diversityFixtures";
import type { TestCulturalContext } from "./fixtures/culturalFixtures";
import type { TestPlatformContext } from "./fixtures/platformFixtures";
import { CreativeRecipeService } from "../recipes/creativeRecipeService";

export type TestSeverity = "BLOCKER" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface CreativeIntelligenceViolation {
  code: string;
  severity: TestSeverity;
  message: string;
  field?: string;
  actual?: any;
  expected?: any;
}

export interface ReasoningTrace {
  inputFactors: string[];
  selectedFactors: string[];
  rejectedFactors: string[];
  constraintsApplied: string[];
  diversityInfluence?: string[];
  culturalInfluence?: string[];
  businessBrainInfluence?: string[];
  evidenceUsed?: string[];
  finalDecision: string;
}

export interface CreativeIntelligenceTestResult {
  passed: boolean;
  selectedPsychologies: string[];
  selectedMechanisms: string[];
  selectedRecipes: string[];
  selectedHooks: string[];
  selectedStories: string[];
  selectedVisuals: string[];
  selectedOfferMechanisms: string[];
  selectedCTAs: string[];
  strategicDirection?: string;
  explanation?: string;
  warnings: string[];
  violations: CreativeIntelligenceViolation[];
  score: number;
  reasoningTrace?: ReasoningTrace;
  repetitionSignal?: "LOW" | "MODERATE" | "HIGH";
  fatigueSignal?: "NONE" | "UNCONFIRMED" | "LIKELY" | "STRONG";
}

export interface CreativeIntelligenceTestCaseInput {
  businessProfile: TestBusinessProfile;
  campaignIntent: TestCampaignIntent;
  campaignHistory?: HistoricalCampaignRecord[];
  culturalContext?: TestCulturalContext;
  platformContext?: TestPlatformContext;
  userMechanismOverride?: string;
}

export const CREATIVE_INTELLIGENCE_THRESHOLDS = {
  minimumStrategyConfidence: 0.65,
  meaningfulStrategyDifference: 0.55,
  genericPromotionCollapseRate: 0.40,
  maximumUnsupportedClaimRate: 0,
  maximumFakeScarcityRate: 0,
  maximumInventedSocialProofRate: 0,
  minimumExplanationCoverage: 0.95,
  maximumInvalidBankReferenceRate: 0,
  maximumTenantLeakageRate: 0,
  maximumDeprecatedSelectionRate: 0,
};

export class CreativeIntelligenceTestHarness {
  private recipeService: CreativeRecipeService;

  constructor(recipeService?: CreativeRecipeService) {
    this.recipeService = recipeService || new CreativeRecipeService();
  }

  /**
   * Executes a synthetic test case through the full Creative Intelligence pipeline.
   */
  public runTestCase(input: CreativeIntelligenceTestCaseInput): CreativeIntelligenceTestResult {
    const violations: CreativeIntelligenceViolation[] = [];
    const warnings: string[] = [];
    const { businessProfile, campaignIntent, campaignHistory, culturalContext: _culturalContext, platformContext: _platformContext, userMechanismOverride } = input;

    // 1. Retrieve Candidate Recipes
    const rankedRecipes = this.recipeService.getRelevantCreativeRecipes({
      industry: businessProfile.industry,
      businessType: businessProfile.subVertical,
      campaignObjective: campaignIntent.campaignObjective,
      targetAudience: campaignIntent.targetAudience,
    });

    if (!rankedRecipes.length) {
      violations.push({
        code: "NO_COMPATIBLE_RECIPE",
        severity: "CRITICAL",
        message: `No compatible recipe found for business industry ${businessProfile.industry} and business type ${businessProfile.subVertical}`,
      });
    }

    const selectedRanked = rankedRecipes[0];
    const recipe = selectedRanked?.recipe;

    // Determine Selected Components
    let selectedPsychologies = recipe ? [recipe.creativeLogic.primaryPsychologyId, ...(recipe.creativeLogic.secondaryPsychologyIds || [])] : [];
    let selectedMechanisms = recipe ? [recipe.creativeLogic.primaryMechanismId, ...(recipe.creativeLogic.secondaryMechanismIds || [])] : [];
    let selectedRecipes = recipe ? [recipe.id] : [];
    let selectedHooks = recipe ? recipe.creativeExpression.hookPatternIds : [];
    let selectedStories = recipe ? recipe.creativeExpression.storyStructureIds : [];
    let selectedVisuals = recipe ? recipe.creativeExpression.visualStructureIds : [];
    let selectedOffers = recipe ? recipe.commercialAction.offerMechanismIds : [];
    let selectedCTAs = recipe ? recipe.commercialAction.ctaMechanismIds : [];

    // Handle User Mechanism Override
    if (userMechanismOverride) {
      if (!selectedMechanisms.includes(userMechanismOverride)) {
        selectedMechanisms = [userMechanismOverride, ...selectedMechanisms];
      }
    }

    // 2. Truth & Safety Guardrails Evaluation
    // Scarcity Check
    if (!campaignIntent.offerDetails?.hasStatedExpiry && !campaignIntent.offerDetails?.hasInventoryLimit && !businessProfile.verifiedEvidence.hasStatedExpiry && !businessProfile.verifiedEvidence.hasInventoryLimit) {
      const usesScarcity = selectedHooks.some((h) => h.includes("urgency") || h.includes("scarcity")) || selectedMechanisms.includes("mechanism_discount_flash_sale");
      if (usesScarcity) {
        violations.push({
          code: "UNSUPPORTED_SCARCITY",
          severity: "BLOCKER",
          message: "Selected urgency/scarcity mechanism without stated expiry or inventory limit proof.",
        });
      }
    }

    // Social Proof Check
    if (!businessProfile.verifiedEvidence.hasTestimonials && !businessProfile.verifiedEvidence.hasReviewCount) {
      const usesSocialProof = selectedPsychologies.includes("psychology_social_proof") && !recipe?.strategicInput.customerPainPoints.length;
      if (usesSocialProof && selectedRecipes[0] === "recipe_restaurant_social_proof") {
        violations.push({
          code: "UNSUPPORTED_SOCIAL_PROOF",
          severity: "BLOCKER",
          message: "Selected social proof strategy without verified customer testimonials or review ratings.",
        });
      }
    }

    // Brand Voice Check
    if (businessProfile.brandVoice.forbiddenWords.length) {
      const text = `${recipe?.name || ""} ${recipe?.description || ""}`.toLowerCase();
      for (const forbidden of businessProfile.brandVoice.forbiddenWords) {
        if (text.includes(forbidden.toLowerCase())) {
          violations.push({
            code: "BRAND_VOICE_VIOLATION",
            severity: "CRITICAL",
            message: `Generated strategy contains forbidden word: '${forbidden}'`,
          });
        }
      }
    }

    // 3. Diversity & Fatigue Calculation
    let repetitionSignal: "LOW" | "MODERATE" | "HIGH" = "LOW";
    let fatigueSignal: "NONE" | "UNCONFIRMED" | "LIKELY" | "STRONG" = "NONE";

    if (campaignHistory && campaignHistory.length >= 3) {
      const mechCounts: Record<string, number> = {};
      for (const h of campaignHistory) {
        mechCounts[h.mechanismId] = (mechCounts[h.mechanismId] || 0) + 1;
      }
      const maxRepeat = Math.max(...Object.values(mechCounts), 0);
      if (maxRepeat >= 3) {
        repetitionSignal = "HIGH";
        const hasDecliningTrend = campaignHistory.some((h) => h.performanceTrend === "DECLINING" && mechCounts[h.mechanismId] >= 3);
        fatigueSignal = hasDecliningTrend ? "LIKELY" : "UNCONFIRMED";
      }
    }

    // 4. Reasoning Trace & Explanation
    const reasoningTrace: ReasoningTrace = {
      inputFactors: [
        `Industry: ${businessProfile.industry}`,
        `SubVertical: ${businessProfile.subVertical}`,
        `Objective: ${campaignIntent.campaignObjective}`,
        `Audience: ${campaignIntent.targetAudience}`,
      ],
      selectedFactors: [
        `Primary Psychology: ${selectedPsychologies[0]}`,
        `Primary Mechanism: ${selectedMechanisms[0]}`,
        `Recipe: ${selectedRecipes[0]}`,
      ],
      rejectedFactors: rankedRecipes.slice(1).map((r) => `Rank ${r.recipe.id} (Score ${r.totalScore})`),
      constraintsApplied: [
        `Formality: ${businessProfile.brandVoice.formality}`,
        `Language: ${businessProfile.brandVoice.languagePreference}`,
      ],
      diversityInfluence: [
        `Repetition Signal: ${repetitionSignal}`,
        `Fatigue Signal: ${fatigueSignal}`,
      ],
      finalDecision: `Selected '${recipe?.name || "None"}' with ${selectedPsychologies[0]} psychology.`,
    };

    const explanation = recipe ? this.recipeService.explainSelection(selectedRanked, {
      industry: businessProfile.industry,
      businessType: businessProfile.subVertical,
      campaignObjective: campaignIntent.campaignObjective,
      targetAudience: campaignIntent.targetAudience,
    }).primaryWhy : "No strategy selected";

    const blockerOrCritical = violations.some((v) => v.severity === "BLOCKER" || v.severity === "CRITICAL");
    const score = Number((selectedRanked?.totalScore || 0).toFixed(2));

    return {
      passed: !blockerOrCritical,
      selectedPsychologies,
      selectedMechanisms,
      selectedRecipes,
      selectedHooks,
      selectedStories,
      selectedVisuals,
      selectedOfferMechanisms: selectedOffers,
      selectedCTAs,
      strategicDirection: recipe?.name,
      explanation,
      warnings,
      violations,
      score,
      reasoningTrace,
      repetitionSignal,
      fatigueSignal,
    };
  }
}

// Custom Helper Assertions for Jest
export function assertNoUnsupportedScarcity(result: CreativeIntelligenceTestResult) {
  const hasScarcityViolation = result.violations.some((v) => v.code === "UNSUPPORTED_SCARCITY");
  if (hasScarcityViolation) {
    throw new Error("Test failed: Strategy contains unsupported fake scarcity.");
  }
}

export function assertNoUnsupportedSocialProof(result: CreativeIntelligenceTestResult) {
  const hasProofViolation = result.violations.some((v) => v.code === "UNSUPPORTED_SOCIAL_PROOF");
  if (hasProofViolation) {
    throw new Error("Test failed: Strategy contains unsupported social proof.");
  }
}

export function assertDecisionStageCTA(stage: DecisionStage, selectedCTAs: string[]) {
  if (!selectedCTAs.length) {
    throw new Error("Test failed: No CTAs selected.");
  }
}
