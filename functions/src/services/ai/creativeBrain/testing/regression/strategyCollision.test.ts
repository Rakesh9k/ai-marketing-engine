/**
 * PHASE 10.40 — Layer 4 Regression Test: Strategy Collision & Differentiation
 * Ensures distinct business scenarios produce meaningfully different strategies without strategy collision.
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_CASUAL_RESTAURANT, FIXTURE_PREMIUM_SALON, FIXTURE_REAL_ESTATE_DEVELOPER } from "../fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT, FIXTURE_SALON_AWARENESS_INTENT, FIXTURE_REAL_ESTATE_CONVERSION_INTENT } from "../fixtures/campaignIntentFixtures";

describe("Layer 4 Regression Test — Strategy Collision & Differentiation", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("shouldDetectStrategicCollision_RestaurantVsSalonVsRealEstateMustDiffer", () => {
    const resRestaurant = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
    });

    const resSalon = harness.runTestCase({
      businessProfile: FIXTURE_PREMIUM_SALON,
      campaignIntent: FIXTURE_SALON_AWARENESS_INTENT,
    });

    const resRealEstate = harness.runTestCase({
      businessProfile: FIXTURE_REAL_ESTATE_DEVELOPER,
      campaignIntent: FIXTURE_REAL_ESTATE_CONVERSION_INTENT,
    });

    // Check primary mechanisms differ
    expect(resRestaurant.selectedMechanisms[0]).not.toEqual(resSalon.selectedMechanisms[0]);
    expect(resSalon.selectedMechanisms[0]).not.toEqual(resRealEstate.selectedMechanisms[0]);
    expect(resRestaurant.selectedRecipes[0]).not.toEqual(resRealEstate.selectedRecipes[0]);
  });
});
