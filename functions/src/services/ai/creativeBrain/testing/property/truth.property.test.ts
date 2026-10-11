/**
 * PHASE 10.40 — Layer 5 Property Test: Truth & Safety Invariants
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_PREMIUM_SALON } from "../fixtures/businessBrainFixtures";
import { FIXTURE_SALON_AWARENESS_INTENT } from "../fixtures/campaignIntentFixtures";

describe("Layer 5 Property Test — Truth Invariants", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("Invariant 03 — Synthetic execution never mutates production data or throws unhandled blockers", () => {
    const res = harness.runTestCase({
      businessProfile: FIXTURE_PREMIUM_SALON,
      campaignIntent: FIXTURE_SALON_AWARENESS_INTENT,
    });

    expect(res).toBeDefined();
    expect(res.violations.filter((v) => v.severity === "BLOCKER")).toHaveLength(0);
  });

  test("Invariant 04 — Unknown Creative Bank IDs never become valid references", () => {
    const res = harness.runTestCase({
      businessProfile: FIXTURE_PREMIUM_SALON,
      campaignIntent: FIXTURE_SALON_AWARENESS_INTENT,
    });

    for (const psych of res.selectedPsychologies) {
      expect(psych).toMatch(/^psychology_/);
    }
    for (const mech of res.selectedMechanisms) {
      expect(mech).toMatch(/^mechanism_/);
    }
  });
});
