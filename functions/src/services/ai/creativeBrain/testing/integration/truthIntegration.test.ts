/**
 * PHASE 10.40 — Layer 3 Integration Test: Truth & Safety Integration
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_PREMIUM_SALON } from "../fixtures/businessBrainFixtures";
import { FIXTURE_SALON_AWARENESS_INTENT } from "../fixtures/campaignIntentFixtures";

describe("Layer 3 Integration Test — Truth & Safety Integration", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("shouldEnforceTruthGuardrails_NoFakeScarcityAndNoInventedSocialProof", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_PREMIUM_SALON,
      campaignIntent: FIXTURE_SALON_AWARENESS_INTENT,
    });

    expect(result.passed).toBe(true);
    expect(result.violations.filter((v) => v.severity === "BLOCKER")).toHaveLength(0);
  });
});
