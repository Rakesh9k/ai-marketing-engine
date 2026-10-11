/**
 * PHASE 10.40 — Layer 1 Deterministic Unit Test: CTA Selection across Decision Stages
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_CASUAL_RESTAURANT, FIXTURE_PREMIUM_SALON, FIXTURE_REAL_ESTATE_DEVELOPER } from "../fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT, FIXTURE_SALON_AWARENESS_INTENT, FIXTURE_REAL_ESTATE_CONVERSION_INTENT } from "../fixtures/campaignIntentFixtures";

describe("Layer 1 Unit Test — CTA Decision Stage Adaptation", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("shouldAdaptCTAToDecisionStage_Awareness", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_PREMIUM_SALON,
      campaignIntent: FIXTURE_SALON_AWARENESS_INTENT, // AWARENESS stage
    });

    expect(result.passed).toBe(true);
    expect(result.selectedCTAs.length).toBeGreaterThan(0);
    expect(
      result.selectedCTAs.some((cta) =>
        ["cta_book_free_consultation", "cta_explore_the_menu", "cta_download_brochure_floorplan"].includes(cta)
      )
    ).toBe(true);
  });

  test("shouldAdaptCTAToDecisionStage_Conversion", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT, // CONVERSION stage
    });

    expect(result.passed).toBe(true);
    expect(
      result.selectedCTAs.some((cta) =>
        ["cta_reserve_table_now", "cta_order_on_whatsapp"].includes(cta)
      )
    ).toBe(true);
  });

  test("shouldAdaptCTAToDecisionStage_RealEstateConversion", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_REAL_ESTATE_DEVELOPER,
      campaignIntent: FIXTURE_REAL_ESTATE_CONVERSION_INTENT,
    });

    expect(result.passed).toBe(true);
    expect(
      result.selectedCTAs.some((cta) =>
        ["cta_schedule_site_visit", "cta_download_brochure_floorplan", "cta_get_instant_quote"].includes(cta)
      )
    ).toBe(true);
  });
});
