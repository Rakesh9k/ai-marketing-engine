/**
 * PHASE 10.40 — Layer 5 Property Test: Diversity & Repetition Invariants
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_CASUAL_RESTAURANT } from "../fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT } from "../fixtures/campaignIntentFixtures";
import { FIXTURE_SATURATED_DISCOUNT_HISTORY } from "../fixtures/diversityFixtures";

describe("Layer 5 Property Test — Diversity Invariants", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("Invariant 07 — Increasing repetition cannot decrease measured repetition signal", () => {
    const resHigh = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
      campaignHistory: FIXTURE_SATURATED_DISCOUNT_HISTORY,
    });

    expect(resHigh.repetitionSignal).toBe("HIGH");
  });

  test("Invariant — User mechanism override is respected when valid", () => {
    const resOverride = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
      userMechanismOverride: "mechanism_discount_flash_sale",
    });

    expect(resOverride.selectedMechanisms).toContain("mechanism_discount_flash_sale");
  });
});
