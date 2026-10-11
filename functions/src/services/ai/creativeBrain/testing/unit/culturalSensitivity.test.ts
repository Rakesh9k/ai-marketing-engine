/**
 * PHASE 10.40 — Layer 1 Deterministic Unit Test: Cultural Sensitivity
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_PREMIUM_SALON, FIXTURE_CASUAL_RESTAURANT } from "../fixtures/businessBrainFixtures";
import { FIXTURE_SALON_AWARENESS_INTENT, FIXTURE_WEEKEND_FAMILY_INTENT } from "../fixtures/campaignIntentFixtures";
import { FIXTURE_HYDERABAD_KONDAPUR } from "../fixtures/culturalFixtures";

describe("Layer 1 Unit Test — Cultural Sensitivity", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("shouldRespectBusinessLanguagePreference_EnglishFirstOverCityDefault", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_PREMIUM_SALON, // ENGLISH_ONLY
      campaignIntent: FIXTURE_SALON_AWARENESS_INTENT,
      culturalContext: FIXTURE_HYDERABAD_KONDAPUR,
    });

    expect(result.passed).toBe(true);
    expect(result.reasoningTrace?.constraintsApplied).toContain("Language: ENGLISH_ONLY");
  });

  test("shouldUseCulturalContextOnlyWhenRelevant", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
      culturalContext: FIXTURE_HYDERABAD_KONDAPUR,
    });

    expect(result.passed).toBe(true);
    expect(result.reasoningTrace?.inputFactors).toBeDefined();
  });
});
