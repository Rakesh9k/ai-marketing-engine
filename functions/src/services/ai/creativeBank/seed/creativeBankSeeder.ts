/**
 * PHASE 10.37 — Seed Initial Creative Intelligence Bank
 * Creative Bank Seeder Service
 */

import { CreativeVersionService } from "../versioning/creativeVersionService";
import type { CreativeBankSeedManifest } from "./seedManifest";
import { ALL_CREATIVE_SEEDS, SEED_MANIFEST } from "./seedManifest";

export interface SeedingResult {
  success: boolean;
  totalSeedsCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  manifest: CreativeBankSeedManifest;
  errors: { itemId: string; error: string }[];
  executionTimeMs: number;
}

export class CreativeBankSeeder {
  private versionService: CreativeVersionService;

  constructor(versionService?: CreativeVersionService) {
    this.versionService = versionService || new CreativeVersionService();
  }

  /**
   * Idempotent seed function populating the initial 465 Creative Intelligence Bank items.
   */
  public async seedCreativeBank(options?: {
    forceUpdate?: boolean;
    actorId?: string;
  }): Promise<SeedingResult> {
    const startTime = Date.now();
    const actorId = options?.actorId || "system_seeder";
    const forceUpdate = options?.forceUpdate || false;

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: { itemId: string; error: string }[] = [];

    // Verify Manifest integrity first
    if (!SEED_MANIFEST.valid) {
      return {
        success: false,
        totalSeedsCount: ALL_CREATIVE_SEEDS.length,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        manifest: SEED_MANIFEST,
        errors: [{ itemId: "MANIFEST", error: "Seed manifest validation failed. Total seeds count mismatch." }],
        executionTimeMs: Date.now() - startTime
      };
    }

    for (const seed of ALL_CREATIVE_SEEDS) {
      try {
        const existingItem = await this.versionService.getItem(seed.id);

        if (!existingItem) {
          // 1. Create initial item version v1
          const created = await this.versionService.createInitialItem(
            seed.id,
            seed.type,
            seed.canonicalName,
            seed.definition,
            actorId,
            seed.scope
          );

          // 2. Attach enriched metadata and relationships to v1
          created.version.purpose = seed.purpose;
          created.version.useCases = seed.useCases;
          created.version.antiPatterns = seed.antiPatterns;
          created.version.maturity = seed.maturity as any;
          created.version.relationships = (seed.relationships || []).map((r) => ({
            targetItemId: r.targetItemId,
            relationshipType: r.relationshipType,
            confidence: r.confidence
          }));

          // 3. Activate version v1
          await this.versionService.activateCreativeBankVersion(
            seed.id,
            created.version.id,
            1,
            actorId
          );

          createdCount++;
        } else if (forceUpdate) {
          const newVersion = await this.versionService.createCreativeBankVersion({
            itemId: seed.id,
            definition: seed.definition,
            purpose: seed.purpose,
            useCases: seed.useCases,
            antiPatterns: seed.antiPatterns,
            changeType: "DEFINITION_UPDATE",
            changeSummary: "Force update from seed manifest",
            changeReason: "Re-seeding forced by admin",
            createdBy: actorId,
            relationships: (seed.relationships || []).map((r) => ({
              targetItemId: r.targetItemId,
              relationshipType: r.relationshipType,
              confidence: r.confidence
            }))
          });

          await this.versionService.activateCreativeBankVersion(
            seed.id,
            newVersion.id,
            existingItem.currentVersion,
            actorId
          );

          updatedCount++;
        } else {
          skippedCount++;
        }
      } catch (err: any) {
        errors.push({ itemId: seed.id, error: err.message || String(err) });
      }
    }

    const success = errors.length === 0;

    return {
      success,
      totalSeedsCount: ALL_CREATIVE_SEEDS.length,
      createdCount,
      updatedCount,
      skippedCount,
      manifest: SEED_MANIFEST,
      errors,
      executionTimeMs: Date.now() - startTime
    };
  }
}
