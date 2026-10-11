/**
 * PHASE 10.40 — Layer 4 Regression Test: Generic Strategy Collapse Guard
 * Ensures the system does not collapse into generic Discount + Urgency + Book Now.
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_CASUAL_RESTAURANT, FIXTURE_PREMIUM_SALON, FIXTURE_REAL_ESTATE_DEVELOPER } from "../fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT, FIXTURE_SALON_AWARENESS_INTENT, FIXTURE_REAL_ESTATE_CONVERSION_INTENT } from "../fixtures/campaignIntentFixtures";

describe("Layer 4 Regression Test — Generic Strategy Collapse Guard", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("shouldDetectGenericPromotionCollapse_DiverseCasesMustNotDefaultToDiscountFlashSale", () => {
    const res1 = harness.runTestCase({ businessProfile: FIXTURE_CASUAL_RESTAURANT, campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT });
    const res2 = harness.runTestCase({ businessProfile: FIXTURE_PREMIUM_SALON, campaignIntent: FIXTURE_SALON_AWARENESS_INTENT });
    const res3 = harness.runTestCase({ businessProfile: FIXTURE_REAL_ESTATE_DEVELOPER, campaignIntent: FIXTURE_REAL_ESTATE_CONVERSION_INTENT });

    const selectedMechanisms = [res1.selectedMechanisms[0], res2.selectedMechanisms[0], res3.selectedMechanisms[0]];
    const discountCount = selectedMechanisms.filter((m) => m === "mechanism_discount_flash_sale").length;

    const discountCollapseRate = discountCount / selectedMechanisms.length;
    expect(discountCollapseRate).toBeLessThan(0.40); // threshold
  });
});
