/**
 * PHASE 10.37 — Seed Initial Creative Intelligence Bank
 * Seed Manifest & Validation
 */

import type { SeedItemDefinition} from "./psychology.seed";
import { PSYCHOLOGY_SEEDS } from "./psychology.seed";
import { MECHANISM_SEEDS } from "./mechanisms.seed";
import { INSIGHT_SEEDS } from "./insights.seed";
import { HOOK_SEEDS } from "./hooks.seed";
import { STORY_SEEDS } from "./stories.seed";
import { VISUAL_SEEDS } from "./visuals.seed";
import { COPY_SEEDS } from "./copy.seed";
import { OFFER_SEEDS } from "./offers.seed";
import { CTA_SEEDS } from "./ctas.seed";
import { STYLE_SEEDS } from "./styles.seed";
import { AUDIENCE_SEEDS } from "./audiences.seed";
import { RECIPE_SEEDS } from "./recipes.seed";
import { RULE_SEEDS } from "./rules.seed";
import { ANTI_PATTERN_SEEDS } from "./antiPatterns.seed";

export const getAllCreativeSeeds = (): SeedItemDefinition[] => [
  ...PSYCHOLOGY_SEEDS,
  ...MECHANISM_SEEDS,
  ...INSIGHT_SEEDS,
  ...HOOK_SEEDS,
  ...STORY_SEEDS,
  ...VISUAL_SEEDS,
  ...COPY_SEEDS,
  ...OFFER_SEEDS,
  ...CTA_SEEDS,
  ...STYLE_SEEDS,
  ...AUDIENCE_SEEDS,
  ...RECIPE_SEEDS,
  ...RULE_SEEDS,
  ...ANTI_PATTERN_SEEDS
];

export const ALL_CREATIVE_SEEDS: SeedItemDefinition[] = getAllCreativeSeeds();

export interface SeedCategorySummary {
  category: string;
  expectedCount: number;
  actualCount: number;
  valid: boolean;
}

export interface CreativeBankSeedManifest {
  totalExpectedCount: number;
  totalActualCount: number;
  valid: boolean;
  categories: SeedCategorySummary[];
  checksum: string;
  createdAt: string;
}

export function generateSeedManifest(): CreativeBankSeedManifest {
  const categoryExpectations: { category: string; seeds: SeedItemDefinition[]; count: number }[] = [
    { category: "PSYCHOLOGY", seeds: PSYCHOLOGY_SEEDS, count: 20 },
    { category: "MECHANISM", seeds: MECHANISM_SEEDS, count: 50 },
    { category: "INSIGHT", seeds: INSIGHT_SEEDS, count: 30 },
    { category: "HOOK", seeds: HOOK_SEEDS, count: 40 },
    { category: "STORY", seeds: STORY_SEEDS, count: 30 },
    { category: "VISUAL", seeds: VISUAL_SEEDS, count: 40 },
    { category: "COPY", seeds: COPY_SEEDS, count: 30 },
    { category: "OFFER", seeds: OFFER_SEEDS, count: 30 },
    { category: "CTA", seeds: CTA_SEEDS, count: 15 },
    { category: "STYLE", seeds: STYLE_SEEDS, count: 20 },
    { category: "AUDIENCE", seeds: AUDIENCE_SEEDS, count: 30 },
    { category: "RECIPE", seeds: RECIPE_SEEDS, count: 30 },
    { category: "RULE", seeds: RULE_SEEDS, count: 50 },
    { category: "ANTI_PATTERN", seeds: ANTI_PATTERN_SEEDS, count: 50 }
  ];

  const categories: SeedCategorySummary[] = categoryExpectations.map((item) => ({
    category: item.category,
    expectedCount: item.count,
    actualCount: item.seeds.length,
    valid: item.seeds.length === item.count
  }));

  const totalExpectedCount = 465;
  const totalActualCount = categories.reduce((sum, c) => sum + c.actualCount, 0);
  const valid = totalActualCount === totalExpectedCount && categories.every((c) => c.valid);

  const seeds = getAllCreativeSeeds();
  // Simple deterministic hash for manifest verification
  const idConcatenation = seeds.map((s) => s.id).sort().join("|");
  let hash = 0;
  for (let i = 0; i < idConcatenation.length; i++) {
    const char = idConcatenation.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const checksum = `cb_seed_${Math.abs(hash).toString(16)}`;

  return {
    totalExpectedCount,
    totalActualCount,
    valid,
    categories,
    checksum,
    createdAt: new Date().toISOString()
  };
}

export const SEED_MANIFEST = generateSeedManifest();
