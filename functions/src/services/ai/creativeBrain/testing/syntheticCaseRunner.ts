/**
 * PHASE 10.39 — Synthetic Case Runner
 * Executes synthetic campaign cases through the Creative Intelligence Test Harness
 * in total production isolation.
 */

import type { SyntheticCampaignCase, SyntheticStrategyResult } from "./creativeIntelligenceTest.types";
import type { CreativeIntelligenceTestCaseInput } from "./creativeIntelligenceTestHarness";
import { CreativeIntelligenceTestHarness } from "./creativeIntelligenceTestHarness";
import type { TestBusinessProfile } from "./fixtures/businessBrainFixtures";
import type { TestCampaignIntent, DecisionStage } from "./fixtures/campaignIntentFixtures";
import type { IndustryVertical } from "../recipes/creativeRecipe.types";

export class SyntheticCaseRunner {
  private harness: CreativeIntelligenceTestHarness;

  constructor(harness?: CreativeIntelligenceTestHarness) {
    this.harness = harness || new CreativeIntelligenceTestHarness();
  }

  /**
   * Executes a single synthetic case and produces a SyntheticStrategyResult.
   */
  public runCase(syntheticCase: SyntheticCampaignCase): SyntheticStrategyResult {
    const input = this.mapCaseToHarnessInput(syntheticCase);
    const harnessResult = this.harness.runTestCase(input);

    return {
      caseId: syntheticCase.id,
      caseName: syntheticCase.name,
      strategicDirection: harnessResult.strategicDirection || "Generic Direction",
      psychologyIds: harnessResult.selectedPsychologies,
      mechanismIds: harnessResult.selectedMechanisms,
      recipeIds: harnessResult.selectedRecipes,
      audienceSituation: syntheticCase.campaignIntent.situation || syntheticCase.campaignIntent.audience || "General Audience",
      customerTension: syntheticCase.campaignIntent.situation,
      emotionalTerritory: harnessResult.selectedPsychologies.map((p) => p.replace("psychology_", "")),
      storyStructureIds: harnessResult.selectedStories,
      hookPatternIds: harnessResult.selectedHooks,
      visualStructureIds: harnessResult.selectedVisuals,
      offerFramingIds: harnessResult.selectedOfferMechanisms,
      ctaMechanismIds: harnessResult.selectedCTAs,
      localContextInfluence: syntheticCase.businessContext.location ? [syntheticCase.businessContext.location] : [],
      strategicRecommendation: harnessResult.strategicDirection || "Standard Strategic Direction",
      whyThisStrategy: harnessResult.explanation || "Selected based on business type, audience situation, and campaign objective.",
      thingsToAvoid: syntheticCase.forbiddenPatterns || [],
      confidence: harnessResult.score > 0 ? harnessResult.score : 0.8,
    };
  }

  /**
   * Runs an array of synthetic cases.
   */
  public runAllCases(cases: SyntheticCampaignCase[]): SyntheticStrategyResult[] {
    return cases.map((c) => this.runCase(c));
  }

  /**
   * Maps SyntheticCampaignCase into CreativeIntelligenceTestCaseInput.
   */
  private mapCaseToHarnessInput(syntheticCase: SyntheticCampaignCase): CreativeIntelligenceTestCaseInput {
    const industryUpper = syntheticCase.industry.toUpperCase() as IndustryVertical;

    const businessProfile: TestBusinessProfile = {
      businessId: `biz_${syntheticCase.id}`,
      tenantId: `tenant_${syntheticCase.id}`,
      name: syntheticCase.businessContext.businessName,
      industry: industryUpper,
      subVertical: syntheticCase.businessContext.subVertical,
      positioning: syntheticCase.businessContext.positioning || "Local business",
      brandVoice: {
        tone: syntheticCase.businessContext.brandTone || "Professional, welcoming",
        formality: "PROFESSIONAL",
        languagePreference: "ENGLISH_ONLY",
        forbiddenWords: syntheticCase.forbiddenPatterns || [],
        allowedClaims: [],
      },
      verifiedEvidence: {
        hasTestimonials: true,
        hasReviewCount: true,
        reviewRating: 4.8,
        totalCustomers: 5000,
        hasStatedExpiry: syntheticCase.campaignIntent.timing ? true : false,
        hasInventoryLimit: false,
        verifiedClaims: [],
      },
    };

    let mappedObjective: "AWARENESS" | "ACQUISITION" | "CONVERSION" | "RETENTION" = "ACQUISITION";
    if (syntheticCase.campaignIntent.objective === "AWARENESS") mappedObjective = "AWARENESS";
    if (syntheticCase.campaignIntent.objective === "RETENTION") mappedObjective = "RETENTION";
    if (syntheticCase.campaignIntent.objective === "BOOKINGS" || syntheticCase.campaignIntent.objective === "ENQUIRIES") {
      mappedObjective = "CONVERSION";
    }

    let decisionStage: DecisionStage = "CONSIDERATION";
    if (mappedObjective === "AWARENESS") decisionStage = "AWARENESS";
    if (mappedObjective === "CONVERSION") decisionStage = "CONVERSION";
    if (mappedObjective === "RETENTION") decisionStage = "RETENTION";

    const campaignIntent: TestCampaignIntent = {
      intentId: `intent_${syntheticCase.id}`,
      campaignObjective: mappedObjective,
      decisionStage,
      targetAudience: `${syntheticCase.campaignIntent.audience || ""} ${syntheticCase.campaignIntent.situation || ""}`.trim() || "General Local Audience",
      audienceSituation: syntheticCase.campaignIntent.situation || "Standard purchasing situation",
      offerDetails: syntheticCase.campaignIntent.offer
        ? {
            hasOffer: true,
            offerTitle: syntheticCase.campaignIntent.offer,
            hasStatedExpiry: syntheticCase.campaignIntent.timing ? true : false,
            hasInventoryLimit: false,
          }
        : { hasOffer: false },
    };

    return {
      businessProfile,
      campaignIntent,
    };
  }
}
