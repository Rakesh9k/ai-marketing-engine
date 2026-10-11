/**
 * PHASE 10.40 — Layer 1 Deterministic Unit Test: Explanation Generation
 */

import { CreativeIntelligenceTestHarness } from "../creativeIntelligenceTestHarness";
import { FIXTURE_CASUAL_RESTAURANT } from "../fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT } from "../fixtures/campaignIntentFixtures";

describe("Layer 1 Unit Test — Grounded Explanation Generation", () => {
  let harness: CreativeIntelligenceTestHarness;

  beforeEach(() => {
    harness = new CreativeIntelligenceTestHarness();
  });

  test("shouldExplainCreativeChoice_ContainRealInputs", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
    });

    expect(result.passed).toBe(true);
    expect(result.explanation).toBeDefined();
    expect(result.explanation).toContain("Mitra selected");
    expect(result.reasoningTrace).toBeDefined();
    expect(result.reasoningTrace?.finalDecision).toBeDefined();
  });

  test("shouldProduceTraceableReasoning_WithInputFactors", () => {
    const result = harness.runTestCase({
      businessProfile: FIXTURE_CASUAL_RESTAURANT,
      campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT,
    });

    const trace = result.reasoningTrace;
    expect(trace).toBeDefined();
    expect(trace?.inputFactors.length).toBeGreaterThan(0);
    expect(trace?.selectedFactors.length).toBeGreaterThan(0);
    expect(trace?.constraintsApplied.length).toBeGreaterThan(0);
  });
});
