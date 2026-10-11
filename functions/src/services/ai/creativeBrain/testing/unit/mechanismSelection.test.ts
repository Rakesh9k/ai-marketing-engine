/**
 * PHASE 10.40 — Layer 1 Deterministic Unit Test: Mechanism Selection
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_CASUAL_RESTAURANT, FIXTURE_PREMIUM_SALON, FIXTURE_REAL_ESTATE_DEVELOPER } from "../fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT, FIXTURE_SALON_AWARENESS_INTENT, FIXTURE_REAL_ESTATE_CONVERSION_INTENT } from "../fixtures/campaignIntentFixtures";

describe("Layer 1 Unit Test — Mechanism Selection", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("shouldSelectFamilyComboOrConvenienceMechanismForRestaurant", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
    });

    expect(result.passed).toBe(true);
    expect(
      result.selectedMechanisms.some((m) =>
        ["mechanism_curated_family_set", "mechanism_decision_relief", "mechanism_express_lunch_box"].includes(m)
      )
    ).toBe(true);
  });

  test("shouldSelectGlowOrColorTrialMechanismForSalon", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_PREMIUM_SALON,
      campaignIntent: FIXTURE_SALON_AWARENESS_INTENT,
    });

    expect(result.passed).toBe(true);
    expect(
      result.selectedMechanisms.some((m) =>
        ["mechanism_priority_slot_guarantee", "mechanism_ammonia_free_color_trial", "mechanism_digital_detox_spa_package"].includes(m)
      )
    ).toBe(true);
  });

  test("shouldSelectCommuteOrFixedPriceContractForRealEstate", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_REAL_ESTATE_DEVELOPER,
      campaignIntent: FIXTURE_REAL_ESTATE_CONVERSION_INTENT,
    });

    expect(result.passed).toBe(true);
    expect(
      result.selectedMechanisms.some((m) =>
        ["mechanism_commute_time_calculator", "mechanism_fixed_price_timeline_contract", "mechanism_nri_concierge_desk"].includes(m)
      )
    ).toBe(true);
  });
});
