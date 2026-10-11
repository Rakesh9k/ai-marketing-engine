/**
 * PHASE 10.40 — Layer 3 Integration Test: Cultural Sensitivity & Local Context Integration
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_CASUAL_RESTAURANT } from "../fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT } from "../fixtures/campaignIntentFixtures";
import { FIXTURE_HYDERABAD_KONDAPUR } from "../fixtures/culturalFixtures";

describe("Layer 3 Integration Test — Cultural Context Integration", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("shouldIntegrateCulturalContextWithoutForcedLocalization", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
      culturalContext: FIXTURE_HYDERABAD_KONDAPUR,
    });

    expect(result.passed).toBe(true);
    expect(result.selectedRecipes.length).toBeGreaterThan(0);
  });
});
