/**
 * PHASE 10.40 — Layer 1 Deterministic Unit Test: Psychology Selection
 * Tests psychology selection for different business situations without LLM dependencies.
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_CASUAL_RESTAURANT, FIXTURE_PREMIUM_SALON, FIXTURE_REAL_ESTATE_DEVELOPER } from "../fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT, FIXTURE_SALON_AWARENESS_INTENT, FIXTURE_REAL_ESTATE_CONVERSION_INTENT } from "../fixtures/campaignIntentFixtures";

describe("Layer 1 Unit Test — Psychology Selection", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("shouldSelectConvenienceForWeekendFamily", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
    });

    expect(result.passed).toBe(true);
    expect(
      result.selectedPsychologies.some((p) =>
        ["psychology_choice_simplification", "psychology_cognitive_ease", "psychology_belonging"].includes(p)
      )
    ).toBe(true);
  });

  test("shouldPreferDemonstrationForVisualProduct", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_PREMIUM_SALON,
      campaignIntent: FIXTURE_SALON_AWARENESS_INTENT,
    });

    expect(result.passed).toBe(true);
    expect(
      result.selectedPsychologies.some((p) =>
        ["psychology_transformation", "psychology_risk_reversal", "psychology_identity_signaling"].includes(p)
      )
    ).toBe(true);
  });

  test("shouldSelectTrustAndRiskReversalForRealEstate", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_REAL_ESTATE_DEVELOPER,
      campaignIntent: FIXTURE_REAL_ESTATE_CONVERSION_INTENT,
    });

    expect(result.passed).toBe(true);
    expect(
      result.selectedPsychologies.some((p) =>
        ["psychology_trust", "psychology_effort_reduction", "psychology_status_signaling", "psychology_risk_reversal"].includes(p)
      )
    ).toBe(true);
  });
});
