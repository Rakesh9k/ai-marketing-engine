/**
 * PHASE 10.40 — Layer 3 Pipeline Integration Test: Creative Strategy Pipeline
 * Tests end-to-end strategy generation from Business Brain -> Intent -> Opportunity -> Bank -> Strategy -> Explanation.
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_CASUAL_RESTAURANT, FIXTURE_PREMIUM_SALON, FIXTURE_REAL_ESTATE_DEVELOPER } from "../fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT, FIXTURE_SALON_AWARENESS_INTENT, FIXTURE_REAL_ESTATE_CONVERSION_INTENT } from "../fixtures/campaignIntentFixtures";

describe("Layer 3 Integration Test — Creative Strategy Pipeline", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("shouldExecuteFullPipelineForRestaurant", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
    });

    expect(result.passed).toBe(true);
    expect(result.selectedPsychologies.length).toBeGreaterThan(0);
    expect(result.selectedMechanisms.length).toBeGreaterThan(0);
    expect(result.selectedRecipes.length).toBeGreaterThan(0);
    expect(result.explanation).toBeDefined();
    expect(result.reasoningTrace).toBeDefined();
  });

  test("shouldExecuteFullPipelineForSalon", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_PREMIUM_SALON,
      campaignIntent: FIXTURE_SALON_AWARENESS_INTENT,
    });

    expect(result.passed).toBe(true);
    expect(result.selectedPsychologies.length).toBeGreaterThan(0);
    expect(result.selectedMechanisms.length).toBeGreaterThan(0);
    expect(result.selectedRecipes.length).toBeGreaterThan(0);
    expect(result.explanation).toBeDefined();
  });

  test("shouldExecuteFullPipelineForRealEstate", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_REAL_ESTATE_DEVELOPER,
      campaignIntent: FIXTURE_REAL_ESTATE_CONVERSION_INTENT,
    });

    expect(result.passed).toBe(true);
    expect(result.selectedPsychologies.length).toBeGreaterThan(0);
    expect(result.selectedMechanisms.length).toBeGreaterThan(0);
    expect(result.selectedRecipes.length).toBeGreaterThan(0);
    expect(result.explanation).toBeDefined();
  });
});
