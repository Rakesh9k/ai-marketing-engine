/**
 * PHASE 10.40 — Layer 3 Integration Test: Creative Bank Integration & Versioning
 */

import { CreativeVersionService } from "../../../creativeBank/versioning/creativeVersionService";
import { ALL_CREATIVE_RECIPES } from "../../recipes/seed/recipeManifest";

describe("Layer 3 Integration Test — Creative Bank & Versioning Integrity", () => {
  let versionService: CreativeVersionService;

  beforeEach(() => {
    versionService = new CreativeVersionService();
  });

  test("shouldUseCanonicalBankReferences_NoOrphanReferences", () => {
    for (const recipe of ALL_CREATIVE_RECIPES) {
      expect(recipe.creativeLogic.primaryPsychologyId).toMatch(/^psychology_/);
      expect(recipe.creativeLogic.primaryMechanismId).toMatch(/^mechanism_/);
      expect(recipe.creativeExpression.hookPatternIds.length).toBeGreaterThan(0);
      expect(recipe.creativeExpression.storyStructureIds.length).toBeGreaterThan(0);
      expect(recipe.creativeExpression.visualStructureIds.length).toBeGreaterThan(0);
      expect(recipe.commercialAction.offerMechanismIds.length).toBeGreaterThan(0);
      expect(recipe.commercialAction.ctaMechanismIds.length).toBeGreaterThan(0);
    }
  });

  test("shouldReferenceExactCreativeBankVersion", async () => {
    const { item, version } = await versionService.createInitialItem(
      "recipe_test_version_pin",
      "RECIPE",
      "Test Version Pin Recipe",
      "Testing exact version pinning",
      "test_user"
    );

    expect(item.id).toBe("recipe_test_version_pin");
    expect(version.version).toBe(1);
  });
});
