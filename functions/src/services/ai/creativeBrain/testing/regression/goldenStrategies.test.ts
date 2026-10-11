/**
 * PHASE 10.40 — Layer 4 Golden Regression Test: Golden Creative Intelligence Cases
 * Connects Phase 10.39 synthetic scenarios to permanent regression tests.
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_CASUAL_RESTAURANT, FIXTURE_PREMIUM_SALON, FIXTURE_REAL_ESTATE_DEVELOPER } from "../fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT, FIXTURE_SALON_AWARENESS_INTENT, FIXTURE_REAL_ESTATE_CONVERSION_INTENT } from "../fixtures/campaignIntentFixtures";

describe("Layer 4 Regression Test — Golden Creative Intelligence Scenarios", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("Golden Case 01 — Restaurant Weekend Family Remains Convenience / Occasion Oriented", () => {
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
    expect(
      result.selectedMechanisms.some((m) =>
        ["mechanism_curated_family_set", "mechanism_decision_relief"].includes(m)
      )
    ).toBe(true);
  });

  test("Golden Case 02 — Salon Makeover Remains Transformation / Proof Oriented", () => {
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

  test("Golden Case 03 — Real Estate Upgrade Remains Lifestyle / Connectivity / Trust Oriented", () => {
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
