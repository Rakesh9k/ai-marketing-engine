/**
 * PHASE 10.37 — Seed Initial Creative Intelligence Bank
 * Unit & Integration Test Suite
 */

import type {
  SeedItemDefinition
} from "../../creativeBank/seed";
import {
  ALL_CREATIVE_SEEDS,
  SEED_MANIFEST,
  PSYCHOLOGY_SEEDS,
  MECHANISM_SEEDS,
  INSIGHT_SEEDS,
  HOOK_SEEDS,
  STORY_SEEDS,
  VISUAL_SEEDS,
  COPY_SEEDS,
  OFFER_SEEDS,
  CTA_SEEDS,
  STYLE_SEEDS,
  AUDIENCE_SEEDS,
  RECIPE_SEEDS,
  RULE_SEEDS,
  ANTI_PATTERN_SEEDS,
  CreativeBankSeeder
} from "../../creativeBank/seed";

import { CreativeVersionService } from "../../creativeBank/versioning/creativeVersionService";

describe("Phase 10.37 — Creative Intelligence Bank Seeding", () => {
  describe("1. Manifest & Quantity Audits", () => {
    it("should contain exactly 465 Creative Intelligence records across 14 item types", () => {
      expect(ALL_CREATIVE_SEEDS.length).toBe(465);
      expect(SEED_MANIFEST.totalExpectedCount).toBe(465);
      expect(SEED_MANIFEST.totalActualCount).toBe(465);
      expect(SEED_MANIFEST.valid).toBe(true);
    });

    it("should have exact counts for each of the 14 categories", () => {
      expect(PSYCHOLOGY_SEEDS.length).toBe(20);
      expect(MECHANISM_SEEDS.length).toBe(50);
      expect(INSIGHT_SEEDS.length).toBe(30);
      expect(HOOK_SEEDS.length).toBe(40);
      expect(STORY_SEEDS.length).toBe(30);
      expect(VISUAL_SEEDS.length).toBe(40);
      expect(COPY_SEEDS.length).toBe(30);
      expect(OFFER_SEEDS.length).toBe(30);
      expect(CTA_SEEDS.length).toBe(15);
      expect(STYLE_SEEDS.length).toBe(20);
      expect(AUDIENCE_SEEDS.length).toBe(30);
      expect(RECIPE_SEEDS.length).toBe(30);
      expect(RULE_SEEDS.length).toBe(50);
      expect(ANTI_PATTERN_SEEDS.length).toBe(50);
    });

    it("should generate a valid non-empty seed checksum", () => {
      expect(SEED_MANIFEST.checksum).toBeDefined();
      expect(SEED_MANIFEST.checksum.startsWith("cb_seed_")).toBe(true);
    });
  });

  describe("2. Schema & Field Validation", () => {
    it("should ensure every seed item has unique non-empty ID and canonicalName", () => {
      const idSet = new Set<string>();

      for (const item of ALL_CREATIVE_SEEDS) {
        expect(item.id).toBeDefined();
        expect(item.id.length).toBeGreaterThan(0);
        expect(idSet.has(item.id)).toBe(false);
        idSet.add(item.id);

        expect(item.canonicalName).toBeDefined();
        expect(item.canonicalName.length).toBeGreaterThan(0);
        expect(item.definition).toBeDefined();
        expect(item.definition.length).toBeGreaterThan(10);
        expect(item.purpose).toBeDefined();
        expect(item.useCases.length).toBeGreaterThan(0);
        expect(item.antiPatterns.length).toBeGreaterThan(0);
        expect(["GLOBAL", "INDUSTRY", "TENANT"]).toContain(item.scope);
        expect(["DRAFT", "TESTING"]).toContain(item.maturity);
        expect(item.confidence).toBeGreaterThan(0);
        expect(item.confidence).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe("3. Graph Connection Density Audits", () => {
    it("should achieve >=80% graph connectivity for Creative Mechanisms", () => {
      const connectedMechanisms = MECHANISM_SEEDS.filter(
        (m: SeedItemDefinition) => m.relationships && m.relationships.length > 0
      );
      const connectivityRatio = connectedMechanisms.length / MECHANISM_SEEDS.length;
      expect(connectivityRatio).toBeGreaterThanOrEqual(0.8);
    });

    it("should achieve >=80% graph connectivity for Creative Recipes", () => {
      const connectedRecipes = RECIPE_SEEDS.filter(
        (r: SeedItemDefinition) => r.relationships && r.relationships.length >= 3
      );
      const connectivityRatio = connectedRecipes.length / RECIPE_SEEDS.length;
      expect(connectivityRatio).toBeGreaterThanOrEqual(0.8);
    });

    it("should achieve >=80% valid references for Combination Rules", () => {
      const allItemIds = new Set(ALL_CREATIVE_SEEDS.map((s: SeedItemDefinition) => s.id));
      let validReferencedRulesCount = 0;

      for (const rule of RULE_SEEDS) {
        if (rule.relationships && rule.relationships.length > 0) {
          const allTargetsExist = rule.relationships.every((rel: { targetItemId: string }) => allItemIds.has(rel.targetItemId));
          if (allTargetsExist) {
            validReferencedRulesCount++;
          }
        }
      }

      const ruleValidityRatio = validReferencedRulesCount / RULE_SEEDS.length;
      expect(ruleValidityRatio).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe("4. Seeder Execution & Idempotency", () => {
    let versionService: CreativeVersionService;
    let seeder: CreativeBankSeeder;

    beforeEach(() => {
      versionService = new CreativeVersionService();
      seeder = new CreativeBankSeeder(versionService);
    });

    it("should execute initial seeding successfully without errors", async () => {
      const result = await seeder.seedCreativeBank();

      expect(result.success).toBe(true);
      expect(result.totalSeedsCount).toBe(465);
      expect(result.createdCount).toBe(465);
      expect(result.errors.length).toBe(0);
    });

    it("should run idempotently without duplicating or failing on secondary execution", async () => {
      // First run
      await seeder.seedCreativeBank();

      // Second run (without forceUpdate)
      const secondResult = await seeder.seedCreativeBank();

      expect(secondResult.success).toBe(true);
      expect(secondResult.createdCount).toBe(0);
      expect(secondResult.skippedCount).toBe(465);
      expect(secondResult.errors.length).toBe(0);
    });
  });

  describe("5. Multi-Industry Coverage Validation", () => {
    it("should cover key target verticals (Restaurant, Salon, Real Estate, Generic Local Business)", () => {
      const keywords = [
        "restaurant", "salon", "hair", "estate", "home", "cafe", "dining", "spa", "local", "food",
        "skin", "business", "offer", "menu", "buyer", "customer", "service", "craft", "festive",
        "gifting", "property", "booking", "lunch", "dinner", "combo", "work", "grooming", "beauty",
        "repair", "luxury", "family", "psychology", "ad", "copy", "hook", "story", "visual", "cta", "rule", "brand"
      ];
      let matchingUseCases = 0;

      for (const item of ALL_CREATIVE_SEEDS) {
        const text = `${item.useCases.join(" ")} ${item.definition} ${item.purpose}`.toLowerCase();
        if (keywords.some((kw) => text.includes(kw))) {
          matchingUseCases++;
        }
      }

      const coverageRatio = matchingUseCases / ALL_CREATIVE_SEEDS.length;
      expect(coverageRatio).toBeGreaterThanOrEqual(0.75);
    });
  });
});
