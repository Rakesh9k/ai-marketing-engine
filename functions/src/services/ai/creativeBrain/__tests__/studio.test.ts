import { FirestoreBankRepository } from "../studio/persistence/firestoreBankRepository";
import { BankGovernanceEngine } from "../studio/governance/bankGovernanceEngine";
import { BankQualityEngine } from "../studio/quality/bankQualityEngine";
import { KnowledgeGraphEngine } from "../studio/relationships/knowledgeGraphEngine";
import { CreativeIntelligenceStudioService } from "../studio/service/creativeIntelligenceStudioService";

describe("Phase 10.29 — Creative Intelligence Studio", () => {
  let repository: FirestoreBankRepository;
  let studioService: CreativeIntelligenceStudioService;

  beforeEach(() => {
    repository = new FirestoreBankRepository();
    studioService = new CreativeIntelligenceStudioService(repository);
  });

  test("1. Universal Item Creation computes completeness score and initial version snapshot", async () => {
    const item = await studioService.createItem("admin_user", "CREATIVE_ADMIN", {
      type: "MECHANISM",
      name: "Decision Simplification",
      shortDescription: "Reduce perceived complexity of choosing",
      definition: "Reduce the number of decisions the customer must make before taking the desired action.",
      tags: ["convenience", "decision_friction"],
      industries: ["restaurant", "salon"],
      objectives: ["CONVERSION"],
    });

    expect(item.id).toBeDefined();
    expect(item.version).toBe(1);
    expect(item.completenessScore).toBeGreaterThan(0);
    expect(item.versionHistory.length).toBe(1);
    expect(item.versionHistory[0].reason).toBe("Initial Creation");
  });

  test("2. Governance Engine enforces server-side role permission checks", () => {
    expect(BankGovernanceEngine.canPerformAction("CREATIVE_VIEWER", "EDIT")).toBe(false);
    expect(BankGovernanceEngine.canPerformAction("CREATIVE_EDITOR", "EDIT")).toBe(true);
    expect(BankGovernanceEngine.canPerformAction("CREATIVE_EDITOR", "APPROVE")).toBe(false);
    expect(BankGovernanceEngine.canPerformAction("CREATIVE_REVIEWER", "APPROVE")).toBe(true);
    expect(BankGovernanceEngine.canPerformAction("CREATIVE_ADMIN", "MERGE")).toBe(true);
  });

  test("3. Governance Engine blocks AI draft promotion to VALIDATED without CREATIVE_REVIEWER approval", async () => {
    const aiItem = await studioService.createItem("ai_agent", "CREATIVE_EDITOR", {
      type: "MECHANISM",
      name: "AI Discovered Mechanism",
      shortDescription: "Discovered pattern",
      definition: "AI generated mechanism definition.",
      sourceType: "AI_GENERATED",
    });

    // Attempt promotion as CREATIVE_EDITOR should fail
    await expect(
      studioService.updateItem("editor_user", "CREATIVE_EDITOR", aiItem.id, { status: "VALIDATED" }, "Promote to validated")
    ).rejects.toThrow("human approval");

    // Promotion as CREATIVE_REVIEWER should succeed
    const approved = await studioService.updateItem(
      "reviewer_user",
      "CREATIVE_REVIEWER",
      aiItem.id,
      { status: "VALIDATED" },
      "Human approval granted"
    );

    expect(approved.status).toBe("VALIDATED");
  });

  test("4. Bank Versioning Engine records immutable snapshots and computes version diff", async () => {
    const item = await studioService.createItem("admin_user", "CREATIVE_ADMIN", {
      type: "MECHANISM",
      name: "Local Identity",
      shortDescription: "Local references",
      definition: "Use local landmarks and area references.",
    });

    const updated = await studioService.updateItem(
      "admin_user",
      "CREATIVE_ADMIN",
      item.id,
      { definition: "Updated definition incorporating hyper-local neighborhood cues." },
      "Updated definition"
    );

    expect(updated.version).toBe(2);
    expect(updated.versionHistory.length).toBe(2);

    const diff = await studioService.compareVersions(item.id, 1, 2);
    expect(diff.changedFields.length).toBeGreaterThan(0);
    expect(diff.changedFields.some((f) => f.field === "definition")).toBe(true);
  });

  test("5. Knowledge Graph Engine links items with typed relationships and traverses dependencies", async () => {
    const mech = await studioService.createItem("admin_user", "CREATIVE_ADMIN", {
      type: "MECHANISM",
      name: "Transformation Proof",
      shortDescription: "Before/After proof",
      definition: "Visual proof showing customer transformation.",
    });

    const psych = await studioService.createItem("admin_user", "CREATIVE_ADMIN", {
      type: "PSYCHOLOGY",
      name: "Social Proof",
      shortDescription: "Peer validation",
      definition: "Human tendency to follow peer behavior.",
    });

    const linkedMech = await studioService.linkItems(
      "admin_user",
      "CREATIVE_ADMIN",
      mech.id,
      psych.id,
      "SUPPORTS",
      0.90
    );

    expect(linkedMech.relatedItemIds.length).toBe(1);
    expect(linkedMech.relatedItemIds[0].itemId).toBe(psych.id);
    expect(linkedMech.relatedItemIds[0].relationship).toBe("SUPPORTS");

    const allItems = await repository.searchItems();
    const dependents = KnowledgeGraphEngine.findDependentItems(psych.id, allItems);
    expect(dependents.some((i) => i.id === mech.id)).toBe(true);
  });

  test("6. Quality Engine detects duplicate candidates and merges duplicate items", async () => {
    const target = await studioService.createItem("admin_user", "CREATIVE_ADMIN", {
      type: "MECHANISM",
      name: "Decision Simplification",
      shortDescription: "Reduce choice complexity",
      definition: "Reduce choice complexity for customers.",
    });

    const duplicateCandidate = await studioService.createItem("admin_user", "CREATIVE_ADMIN", {
      type: "MECHANISM",
      name: "Choice Simplification",
      shortDescription: "Reduce choices",
      definition: "Reduce choice overload.",
    });

    const existingItems = await repository.searchItems();
    const duplicates = BankQualityEngine.findDuplicateCandidates({ name: "Decision Simplification" }, existingItems);
    expect(duplicates.length).toBeGreaterThan(0);

    const merged = await studioService.mergeItems("admin_user", "CREATIVE_ADMIN", duplicateCandidate.id, target.id);
    expect(merged.aliases).toContain("Choice Simplification");

    const deprecatedSource = await repository.getItemById(duplicateCandidate.id);
    expect(deprecatedSource?.status).toBe("DEPRECATED");
    expect(deprecatedSource?.deprecationRecord?.replacementItemId).toBe(target.id);
  });

  test("7. Deprecation safety check preserves history and records replacement mapping", async () => {
    const item = await studioService.createItem("admin_user", "CREATIVE_ADMIN", {
      type: "MECHANISM",
      name: "Generic Discount",
      shortDescription: "Price reductions",
      definition: "Simple percentage discount.",
    });

    const replacement = await studioService.createItem("admin_user", "CREATIVE_ADMIN", {
      type: "MECHANISM",
      name: "Value Stack",
      shortDescription: "Bundled value",
      definition: "Bundled value positioning.",
    });

    const deprecated = await studioService.deprecateItem(
      "admin_user",
      "CREATIVE_ADMIN",
      item.id,
      "Replaced by value stack",
      replacement.id
    );

    expect(deprecated.status).toBe("DEPRECATED");
    expect(deprecated.deprecationRecord?.replacementItemId).toBe(replacement.id);
  });

  test("8. Studio Testing Sandbox executes isolated item simulation marked isSandboxTest: true", async () => {
    const item = await studioService.createItem("admin_user", "CREATIVE_ADMIN", {
      type: "MECHANISM",
      name: "Local Identity",
      shortDescription: "Local references",
      definition: "Use hyper-local landmarks and references.",
      industries: ["restaurant"],
    });

    const result = await studioService.runSandboxTest({
      itemId: item.id,
      industry: "restaurant",
      audience: "families",
    });

    expect(result.isSandboxTest).toBe(true);
    expect(result.itemId).toBe(item.id);
    expect(result.simulatedOutput.headline).toBeDefined();
    expect(result.compatibilityWarnings.length).toBe(0);
  });

  test("9. Side-by-side Item Comparison compares two Creative Bank items", async () => {
    const itemA = await studioService.createItem("admin_user", "CREATIVE_ADMIN", {
      type: "MECHANISM",
      name: "Convenience",
      shortDescription: "Easier choice",
      definition: "Focus on ease and speed.",
    });

    const itemB = await studioService.createItem("admin_user", "CREATIVE_ADMIN", {
      type: "MECHANISM",
      name: "Discount",
      shortDescription: "Price reduction",
      definition: "Focus on lower price.",
    });

    const comparison = await studioService.compareItems(itemA.id, itemB.id);
    expect(comparison.itemA.name).toBe("Convenience");
    expect(comparison.itemB.name).toBe("Discount");
  });

  test("10. Studio Overview Dashboard synthesizes health score and review queue", async () => {
    await studioService.createItem("admin_user", "CREATIVE_ADMIN", {
      type: "MECHANISM",
      name: "Transformation Proof",
      shortDescription: "Before/After proof",
      definition: "Visual proof showing customer transformation.",
    });

    const overview = await studioService.getStudioOverview();
    expect(overview.totalItemsCount).toBeGreaterThan(0);
    expect(overview.bankHealthScore).toBeGreaterThan(0);
    expect(overview.reviewQueueCount).toBeGreaterThan(0);
  });

  test("11. Search and Scope Isolation respects tenant and global boundaries", async () => {
    await studioService.createItem("admin_user", "CREATIVE_ADMIN", {
      type: "MECHANISM",
      name: "Global Mechanism",
      shortDescription: "Global scope",
      definition: "Global mechanism.",
      scope: "GLOBAL",
    });

    await studioService.createItem("admin_user", "CREATIVE_ADMIN", {
      type: "MECHANISM",
      name: "Tenant Mechanism",
      shortDescription: "Tenant scope",
      definition: "Tenant mechanism.",
      scope: "TENANT",
      tenantId: "tenant_X",
    });

    const globalResults = await studioService.searchBank(undefined, { scope: "GLOBAL" });
    const tenantResults = await studioService.searchBank(undefined, { scope: "TENANT", tenantId: "tenant_X" });

    expect(globalResults.some((i) => i.name === "Global Mechanism")).toBe(true);
    expect(tenantResults.some((i) => i.name === "Tenant Mechanism")).toBe(true);
    expect(tenantResults.some((i) => i.name === "Global Mechanism")).toBe(false);
  });

  test("12. Audit Logger logs all sensitive mutations", async () => {
    const item = await studioService.createItem("admin_user", "CREATIVE_ADMIN", {
      type: "MECHANISM",
      name: "Audited Mechanism",
      shortDescription: "Audited item",
      definition: "Audited definition.",
    });

    const logs = await repository.getAuditLogs(item.id);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe("CREATE");
    expect(logs[0].actor).toBe("admin_user");
  });
});
