/**
 * PHASE 10.40 — Layer 1 Deterministic Unit Test: Platform Compatibility
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_CASUAL_RESTAURANT } from "../fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT } from "../fixtures/campaignIntentFixtures";
import { FIXTURE_INSTAGRAM_STORY, FIXTURE_WHATSAPP_DIRECT } from "../fixtures/platformFixtures";

describe("Layer 1 Unit Test — Platform Compatibility", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("shouldRespectPlatformCompatibility_InstagramStory", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
      platformContext: FIXTURE_INSTAGRAM_STORY,
    });

    expect(result.passed).toBe(true);
    expect(result.selectedVisuals.length).toBeGreaterThan(0);
  });

  test("shouldRespectPlatformCompatibility_WhatsAppDirect", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
      platformContext: FIXTURE_WHATSAPP_DIRECT,
    });

    expect(result.passed).toBe(true);
    expect(result.selectedCTAs).toBeDefined();
  });
});
