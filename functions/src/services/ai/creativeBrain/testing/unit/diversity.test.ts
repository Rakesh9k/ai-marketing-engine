/**
 * PHASE 10.40 — Layer 1 Deterministic Unit Test: Diversity & Repetition
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_CASUAL_RESTAURANT } from "../fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT } from "../fixtures/campaignIntentFixtures";
import { FIXTURE_SATURATED_DISCOUNT_HISTORY, FIXTURE_DIVERSE_BALANCED_HISTORY } from "../fixtures/diversityFixtures";

describe("Layer 1 Unit Test — Diversity & Repetition", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("shouldAvoidRepeatedMechanisms_HighRepetitionSignal", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
      campaignHistory: FIXTURE_SATURATED_DISCOUNT_HISTORY,
    });

    expect(result.repetitionSignal).toBe("HIGH");
  });

  test("shouldShowLowRepetitionSignalForDiverseHistory", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
      campaignHistory: FIXTURE_DIVERSE_BALANCED_HISTORY,
    });

    expect(result.repetitionSignal).toBe("LOW");
  });

  test("shouldRespectUserMechanismOverride", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
      campaignHistory: FIXTURE_SATURATED_DISCOUNT_HISTORY,
      userMechanismOverride: "mechanism_discount_flash_sale",
    });

    expect(result.selectedMechanisms).toContain("mechanism_discount_flash_sale");
  });
});
