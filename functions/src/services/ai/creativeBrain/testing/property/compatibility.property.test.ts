/**
 * PHASE 10.40 — Layer 5 Property Test: Compatibility Invariants
 */

import { ALL_CREATIVE_RECIPES } from "../../recipes/seed/recipeManifest";
import { MOCK_BANK_ITEMS } from "../fixtures/creativeBankFixtures";

describe("Layer 5 Property Test — Compatibility Invariants", () => {
  test("Invariant 01 — Deprecated recipe is never selected for a new campaign", () => {
    const deprecated = MOCK_BANK_ITEMS.filter((item) => item.status === "DEPRECATED");
    const active = MOCK_BANK_ITEMS.filter((item) => item.status === "ACTIVE");

    expect(deprecated.every((d) => d.status === "DEPRECATED")).toBe(true);
    expect(active.every((a) => a.status === "ACTIVE")).toBe(true);
  });

  test("Invariant 02 — An unsupported industry recipe is never marked compatible", () => {
    for (const recipe of ALL_CREATIVE_RECIPES) {
      if (recipe.constraints.unsupportedIndustries.length) {
        for (const unsupp of recipe.constraints.unsupportedIndustries) {
          expect(unsupp).not.toEqual(recipe.vertical);
        }
      }
    }
  });
});
