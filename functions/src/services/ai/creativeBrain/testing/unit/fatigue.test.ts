/**
 * PHASE 10.40 — Layer 1 Deterministic Unit Test: Fatigue Detection
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_CASUAL_RESTAURANT } from "../fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT } from "../fixtures/campaignIntentFixtures";
import { FIXTURE_SATURATED_DISCOUNT_HISTORY, FIXTURE_STRONG_STABLE_REPETITION_HISTORY } from "../fixtures/diversityFixtures";

describe("Layer 1 Unit Test — Fatigue Detection", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("shouldNotDeclareFatigueFromRepetitionAlone", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
      campaignHistory: FIXTURE_STRONG_STABLE_REPETITION_HISTORY,
    });

    expect(result.repetitionSignal).toBe("HIGH");
    expect(result.fatigueSignal).toBe("UNCONFIRMED");
  });

  test("shouldDetectLikelyFatigueWhenRepetitionAndDecliningPerformanceExist", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
      campaignHistory: FIXTURE_SATURATED_DISCOUNT_HISTORY,
    });

    expect(result.repetitionSignal).toBe("HIGH");
    expect(result.fatigueSignal).toBe("LIKELY");
  });
});
