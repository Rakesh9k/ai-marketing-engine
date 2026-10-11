/**
 * PHASE 10.40 — Layer 1 Deterministic Unit Test: Anti-Pattern Detection
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_PREMIUM_SALON } from "../fixtures/businessBrainFixtures";
import { FIXTURE_SALON_AWARENESS_INTENT } from "../fixtures/campaignIntentFixtures";

describe("Layer 1 Unit Test — Anti-Pattern & Truth Enforcement", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("shouldAvoidFakeScarcity_NoExpiryOrInventoryProof", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_PREMIUM_SALON, // No expiry or inventory limits verified
      campaignIntent: FIXTURE_SALON_AWARENESS_INTENT,
    });

    const hasScarcityViolation = result.violations.some((v) => v.code === "UNSUPPORTED_SCARCITY");
    expect(hasScarcityViolation).toBe(false);
    expect(result.passed).toBe(true);
  });

  test("shouldNotInventSocialProof_NoTestimonialEvidence", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_PREMIUM_SALON, // hasTestimonials: false, hasReviewCount: false
      campaignIntent: FIXTURE_SALON_AWARENESS_INTENT,
    });

    const hasProofViolation = result.violations.some((v) => v.code === "UNSUPPORTED_SOCIAL_PROOF");
    expect(hasProofViolation).toBe(false);
    expect(result.passed).toBe(true);
  });

  test("shouldRespectBusinessBrain_ForbiddenWordsRejection", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_PREMIUM_SALON, // Forbidden: ["crazy deal", "cheap", "hurry up"]
      campaignIntent: FIXTURE_SALON_AWARENESS_INTENT,
    });

    const hasForbiddenViolation = result.violations.some((v) => v.code === "BRAND_VOICE_VIOLATION");
    expect(hasForbiddenViolation).toBe(false);
    expect(result.passed).toBe(true);
  });
});
