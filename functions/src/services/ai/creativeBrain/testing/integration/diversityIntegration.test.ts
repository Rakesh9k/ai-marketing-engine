/**
 * PHASE 10.40 — Layer 3 Integration Test: Diversity & Fatigue Signals
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_CASUAL_RESTAURANT } from "../fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT } from "../fixtures/campaignIntentFixtures";
import { FIXTURE_SATURATED_DISCOUNT_HISTORY } from "../fixtures/diversityFixtures";

describe("Layer 3 Integration Test — Diversity & Fatigue Integration", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("shouldDetectRepeatedMechanismsAndFatigueSignal", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
      campaignHistory: FIXTURE_SATURATED_DISCOUNT_HISTORY,
    });

    expect(result.repetitionSignal).toBe("HIGH");
    expect(result.fatigueSignal).toBe("LIKELY");
    expect(result.reasoningTrace?.diversityInfluence).toContain("Repetition Signal: HIGH");
  });
});
