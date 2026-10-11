/**
 * PHASE 10.36 — Creative Knowledge Versioning System Unit & Integration Test Suite
 */

import { CreativeVersionService } from "../../creativeBank/versioning/creativeVersionService";
import { CreativeVersionRepository } from "../../creativeBank/versioning/creativeVersionRepository";

describe("Phase 10.36 — Creative Knowledge Versioning System", () => {
  const repo = new CreativeVersionRepository();
  const service = new CreativeVersionService(repo);

  const ITEM_1 = "mechanism_local_pride_001";
  const ITEM_2 = "mechanism_duplicate_002";
  const USER_1 = "admin_user_1";

  describe("1. Basic Item Creation & Version Increments", () => {
    it("should initialize a new Creative Bank item with v1 DRAFT version", async () => {
      const { item, version } = await service.createInitialItem(
        ITEM_1,
        "MECHANISM",
        "Local Pride",
        "Use local identity to build familiarity",
        USER_1
      );

      expect(item.id).toBe(ITEM_1);
      expect(item.currentVersion).toBe(1);
      expect(version.version).toBe(1);
      expect(version.status).toBe("DRAFT");
    });

    it("should activate v1 and make it immutable, then create v2 draft with monotonically increasing version number", async () => {
      await service.activateCreativeBankVersion(ITEM_1, `${ITEM_1}_v1`, 1, USER_1);

      const v1Active = await service.getCreativeBankVersion(ITEM_1, 1);
      expect(v1Active?.status).toBe("ACTIVE");

      const v2Draft = await service.createCreativeBankVersion({
        itemId: ITEM_1,
        definition: "Use authentic local identity when it strengthens audience belonging",
        changeType: "DEFINITION_UPDATE",
        changeSummary: "Refined definition for authenticity",
        changeReason: "Performance research recommendation",
        createdBy: USER_1,
      });

      expect(v2Draft.version).toBe(2);
      expect(v2Draft.status).toBe("DRAFT");
      expect(v2Draft.supersedesVersionId).toBe(`${ITEM_1}_v1`);
    });
  });

  describe("2. Critical Regression Test 1 — Immutable Version History", () => {
    it("should preserve v1 definition completely unchanged when v2 is updated and activated", async () => {
      await service.activateCreativeBankVersion(ITEM_1, `${ITEM_1}_v2`, 1, USER_1);

      const v1 = await service.getCreativeBankVersion(ITEM_1, 1);
      const v2 = await service.getCreativeBankVersion(ITEM_1, 2);

      expect(v1?.definition).toBe("Use local identity to build familiarity");
      expect(v2?.definition).toBe("Use authentic local identity when it strengthens audience belonging");
      expect(v1?.status).toBe("SUPERSEDED");
      expect(v2?.status).toBe("ACTIVE");
    });
  });

  describe("3. Critical Regression Test 2 & 7 — Historical Campaign Reproducibility & Snapshots", () => {
    it("should pin exact historical version references into campaign snapshots", async () => {
      const historicalCampaignSnapshot = service.createKnowledgeSnapshot(
        [],
        [{ itemId: ITEM_1, versionId: `${ITEM_1}_v1`, version: 1 }]
      );

      expect(historicalCampaignSnapshot.mechanisms[0].version).toBe(1);
      expect(historicalCampaignSnapshot.mechanisms[0].versionId).toBe(`${ITEM_1}_v1`);

      // Current version is v2, but historical campaign resolves exact stored v1
      const resolved = await service.resolveCreativeKnowledgeVersion({
        itemId: ITEM_1,
        versionId: historicalCampaignSnapshot.mechanisms[0].versionId,
        mode: "HISTORICAL",
      });

      expect(resolved?.version).toBe(1);
      expect(resolved?.definition).toBe("Use local identity to build familiarity");
    });
  });

  describe("4. Critical Regression Test 3 & 4 — Deprecation & Restoration", () => {
    it("should deprecate a version with replacement references without breaking historical references", async () => {
      const v2Dep = await service.deprecateCreativeBankVersion(
        ITEM_1,
        `${ITEM_1}_v2`,
        USER_1,
        "Deprecated due to temporary policy update",
        undefined,
        `${ITEM_1}_v1`
      );

      expect(v2Dep.status).toBe("DEPRECATED");
      expect(v2Dep.replacementVersionId).toBe(`${ITEM_1}_v1`);
    });

    it("should restore a historical version by creating a NEW version (v3) rather than mutating historical records", async () => {
      const v3Restored = await service.restoreCreativeBankVersion(
        ITEM_1,
        1, // Restore v1
        USER_1,
        "Restoring original v1 definition"
      );

      expect(v3Restored.version).toBe(3);
      expect(v3Restored.restoredFromVersionId).toBe(`${ITEM_1}_v1`);
      expect(v3Restored.changeType).toBe("RESTORATION");

      // Verify v1 & v2 remain immutable
      const v1 = await service.getCreativeBankVersion(ITEM_1, 1);
      const v2 = await service.getCreativeBankVersion(ITEM_1, 2);

      expect(v1?.version).toBe(1);
      expect(v2?.version).toBe(2);
    });
  });

  describe("5. Critical Regression Test 6 — Optimistic Concurrency Protection", () => {
    it("should reject concurrent activation attempts with Concurrency Exception when expectedCurrentVersion is mismatched", async () => {
      await service.activateCreativeBankVersion(ITEM_1, `${ITEM_1}_v3`, 2, USER_1);

      const v4Draft = await service.createCreativeBankVersion({
        itemId: ITEM_1,
        definition: "Definition v4",
        changeType: "DEFINITION_UPDATE",
        changeSummary: "v4 draft",
        createdBy: USER_1,
      });

      // User A attempts activation expecting current version 3 (succeeds)
      await service.activateCreativeBankVersion(ITEM_1, v4Draft.id, 3, USER_1);

      // User B attempts activation expecting current version 3 (fails because current is now 4)
      await expect(
        service.activateCreativeBankVersion(ITEM_1, v4Draft.id, 3, USER_1)
      ).rejects.toThrow("Concurrency Exception");
    });
  });

  describe("6. Version Comparison Diff & Impact Analysis", () => {
    it("should compute structured version diff between v1 and v2", async () => {
      const diff = await service.getCreativeVersionDiff(ITEM_1, 1, 2);
      expect(diff.itemId).toBe(ITEM_1);
      expect(diff.fromVersion).toBe(1);
      expect(diff.toVersion).toBe(2);
      expect(diff.changedFields.length).toBeGreaterThan(0);
      expect(diff.changedFields[0].field).toBe("definition");
    });

    it("should perform version impact analysis before deprecation", async () => {
      const v3 = await service.getCreativeBankVersion(ITEM_1, 3);
      expect(v3).toBeDefined();

      const impact = await service.getVersionImpact(ITEM_1, v3!.id, 5, 2);
      expect(impact.activeCampaignCount).toBe(5);
      expect(impact.safeToDeprecate).toBe(false); // active campaigns present
    });
  });

  describe("7. Merging & Audit History", () => {
    it("should merge a duplicate item into canonical target item while preserving full history", async () => {
      await service.createInitialItem(
        ITEM_2,
        "MECHANISM",
        "Duplicate Local Pride",
        "Duplicate definition",
        USER_1
      );

      const res = await service.mergeCreativeBankVersions(
        ITEM_2,
        ITEM_1,
        USER_1,
        "Duplicate item discovered during audit"
      );

      expect(res.sourceItem.status).toBe("DEPRECATED");
      expect(res.sourceItem.replacementId).toBe(ITEM_1);

      const historySource = await service.getCreativeBankVersionHistory(ITEM_2);
      expect(historySource.length).toBeGreaterThan(0);
    });

    it("should retrieve full audit history for an item", async () => {
      const logs = await service.getAuditHistory(ITEM_1);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((l) => l.action === "CREATIVE_VERSION_ACTIVATED")).toBe(true);
    });
  });
});
