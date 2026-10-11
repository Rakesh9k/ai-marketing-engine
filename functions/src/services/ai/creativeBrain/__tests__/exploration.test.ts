import {
  STRATEGIC_AXES_TAXONOMY,
  INDUSTRY_EXPLORATION_MAP,
  DirectionDiversityEngine,
  DirectionCandidateGenerator,
  DirectionScoringEngine,
  DirectionDifferenceExplainer,
  DirectionSwitchingEngine,
  FirestoreDirectionRepository,
  DirectionExplorationService,
} from "../exploration";
import type { StrategicDirectionCandidate } from "../types/directions";

describe("Phase 10.31 — Creative Intelligence Strategic Exploration System ('Explore Another Direction')", () => {
  let diversityEngine: DirectionDiversityEngine;
  let generator: DirectionCandidateGenerator;
  let scoringEngine: DirectionScoringEngine;
  let explainer: DirectionDifferenceExplainer;
  let switchingEngine: DirectionSwitchingEngine;
  let repository: FirestoreDirectionRepository;
  let service: DirectionExplorationService;

  const TENANT_A = "tenant_restaurant_hyderabad";
  const TENANT_B = "tenant_retail_bangalore";
  const SESSION_1 = "sess_explore_1001";
  const CAMPAIGN_1 = "cmp_explore_5001";

  beforeEach(() => {
    diversityEngine = new DirectionDiversityEngine();
    generator = new DirectionCandidateGenerator();
    scoringEngine = new DirectionScoringEngine();
    explainer = new DirectionDifferenceExplainer();
    switchingEngine = new DirectionSwitchingEngine();
    repository = new FirestoreDirectionRepository();
    repository.clearInMemoryState();

    service = new DirectionExplorationService(
      generator,
      diversityEngine,
      scoringEngine,
      explainer,
      switchingEngine,
      repository
    );
  });

  describe("1. Strategic Axes Taxonomy & Industry Mapping", () => {
    it("should provide domain taxonomy across Functional, Emotional, Identity, Social, Transformation, Competitive, and Proof axes", () => {
      expect(STRATEGIC_AXES_TAXONOMY["CONVENIENCE"].category).toBe("FUNCTIONAL");
      expect(STRATEGIC_AXES_TAXONOMY["FAMILY_CONNECTION"].category).toBe("EMOTIONAL");
      expect(STRATEGIC_AXES_TAXONOMY["LOCAL_PRIDE"].category).toBe("IDENTITY");
      expect(STRATEGIC_AXES_TAXONOMY["TRANSFORMATION"].category).toBe("TRANSFORMATION");
      expect(STRATEGIC_AXES_TAXONOMY["EXPERT_TRUST"].category).toBe("PROOF");
    });

    it("should map industry-specific exploration priority axes for Restaurant, Salon, and Real Estate", () => {
      expect(INDUSTRY_EXPLORATION_MAP["RESTAURANT"]).toContain("CONVENIENCE");
      expect(INDUSTRY_EXPLORATION_MAP["RESTAURANT"]).toContain("FAMILY_CONNECTION");
      expect(INDUSTRY_EXPLORATION_MAP["SALON"]).toContain("TRANSFORMATION");
      expect(INDUSTRY_EXPLORATION_MAP["REAL_ESTATE"]).toContain("INVESTMENT_SECURITY");
    });
  });

  describe("2. Direction Diversity Engine & Strategic Distance", () => {
    it("should calculate multi-dimensional strategic distance between different directions", () => {
      const pool = generator.generateCandidatePool({
        sessionId: SESSION_1,
        tenantId: TENANT_A,
      });

      const convenience = pool.find((d) => d.name.includes("Convenience"))!;
      const family = pool.find((d) => d.name.includes("Family"))!;

      const dist = diversityEngine.calculateStrategicDistance(convenience, family);

      expect(dist.totalDistance).toBeGreaterThanOrEqual(diversityEngine.MIN_STRATEGIC_DISTANCE);
      expect(dist.psychologyDistance).toBeGreaterThan(0);
      expect(dist.mechanismDistance).toBeGreaterThan(0);
    });

    it("should filter out near-duplicate candidates to ensure distinct options", () => {
      const currentDir: StrategicDirectionCandidate = {
        id: "dir_curr",
        sessionId: SESSION_1,
        tenantId: TENANT_A,
        name: "Convenience & Choice Simplification",
        shortLabel: "CONVENIENCE",
        strategicThesis: "Effort reduction",
        audience: "Families",
        customerTension: "Dinner fatigue",
        desiredEmotion: "Relief",
        marketingObjective: "Orders",
        psychology: [{ id: "p1", name: "Choice Simplification" }],
        mechanisms: [{ id: "m1", name: "Friction Removal" }],
        concept: "Dinner sorted",
        hookTerritory: "Stop cooking",
        visualTerritory: "Reel",
        copyTerritory: "Easy meal",
        offerTreatment: "Standard",
        ctaTreatment: "Order",
        strategicRationale: "Strategic fit",
        whyItFits: "Fits family audience",
        strengths: ["Speed"],
        tradeoffs: ["Less emotional"],
        risks: [],
        thingsToAvoid: [],
        bestWhen: [],
        avoidWhen: [],
        evidence: [],
        compatibilityScore: 0.9,
        strategicFitScore: 0.9,
        distinctivenessScore: 0.8,
        viabilityScore: 88,
        confidence: 0.9,
        source: "RECOMMENDED",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      };

      const nearDuplicate: StrategicDirectionCandidate = {
        ...currentDir,
        id: "dir_dup",
        name: "Convenience & Ease",
        strategicThesis: "Same effort reduction",
      };

      const diverseDir: StrategicDirectionCandidate = {
        ...currentDir,
        id: "dir_div",
        name: "Family Connection & Belonging",
        psychology: [{ id: "p2", name: "Belonging & Emotional Warmth" }],
        mechanisms: [{ id: "m2", name: "Shared Moment Framing" }],
        desiredEmotion: "Belonging",
        customerTension: "Bringing family together",
      };

      const filtered = diversityEngine.filterDiverseCandidates(currentDir, [nearDuplicate, diverseDir], 3);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Family Connection & Belonging");
    });
  });

  describe("3. Candidate Generation & Viability Scoring", () => {
    it("should generate 8-12 candidate pool and enforce minimum viability threshold (70 Pts)", () => {
      const candidates = generator.generateCandidatePool({
        sessionId: SESSION_1,
        campaignId: CAMPAIGN_1,
        tenantId: TENANT_A,
        industry: "RESTAURANT",
      });

      expect(candidates.length).toBeGreaterThanOrEqual(8);

      const scored = scoringEngine.evaluateAndScoreCandidates(candidates);
      expect(scored.every((c) => c.viabilityScore >= 70)).toBe(true);
    });
  });

  describe("4. Explanation of Strategic Difference", () => {
    it("should generate clear shift explanation ('Why different from current?') and tradeoffs", () => {
      const pool = generator.generateCandidatePool({
        sessionId: SESSION_1,
        tenantId: TENANT_A,
      });

      const current = pool[0];
      const alternative = pool[1];

      const diff = explainer.explainDifference(current, alternative);

      expect(diff.currentDirection).toBe(current.name);
      expect(diff.alternativeDirection).toBe(alternative.name);
      expect(diff.keyShift).toContain("Shifts the campaign strategy");
      expect(diff.changedPsychology).toBeDefined();
      expect(diff.changedMechanism).toBeDefined();
    });
  });

  describe("5. Direction Switching & Decision Preservation (DirectionSwitchingEngine)", () => {
    it("should execute direction switch, versioning state and preserving audience & offer while invalidating concept", () => {
      const pool = generator.generateCandidatePool({
        sessionId: SESSION_1,
        tenantId: TENANT_A,
      });

      const current = pool[0];
      current.status = "ACTIVE";
      current.version = 1;

      const selected = pool[1];

      const switchResult = switchingEngine.executeDirectionSwitch(current, selected, pool);

      expect(switchResult.version).toBe(2);
      expect(switchResult.selectedDirection.status).toBe("ACTIVE");
      expect(switchResult.impact.preserved).toContain("Audience Profile Context");
      expect(switchResult.impact.preserved).toContain("Offer Structure & Pricing Constraints");
      expect(switchResult.impact.regenerated).toContain("Psychological Positioning");
      expect(switchResult.impact.regenerated).toContain("Creative Mechanism Selection");
      expect(switchResult.impact.invalidated.some((i) => i.includes(current.concept))).toBe(true);
    });
  });

  describe("6. Master Facade Orchestration (DirectionExplorationService)", () => {
    it("should explore diverse strategic directions for an active campaign", async () => {
      const result = await service.exploreDirections({
        sessionId: SESSION_1,
        campaignId: CAMPAIGN_1,
        tenantId: TENANT_A,
        currentDirectionId: "dir_init",
        count: 3,
      });

      expect(result.currentDirection).toBeDefined();
      expect(result.alternatives).toHaveLength(3);
      expect(result.comparison).toHaveLength(4);
      expect(result.explorationSummary).toContain("Found 3 strategically distinct");
    });

    it("should enforce tenant security isolation during exploration", async () => {
      await service.exploreDirections({
        sessionId: SESSION_1,
        campaignId: CAMPAIGN_1,
        tenantId: TENANT_A,
        currentDirectionId: "dir_init",
      });

      await expect(
        service.exploreDirections({
          sessionId: SESSION_1,
          campaignId: CAMPAIGN_1,
          tenantId: TENANT_B,
          currentDirectionId: "dir_init",
        })
      ).rejects.toThrow("Tenant Security Exception");
    });

    it("should select an alternative direction and record override trace", async () => {
      const exploreRes = await service.exploreDirections({
        sessionId: SESSION_1,
        campaignId: CAMPAIGN_1,
        tenantId: TENANT_A,
        currentDirectionId: "dir_init",
      });

      const altToSelect = exploreRes.alternatives[0];

      const selectRes = await service.selectDirection(SESSION_1, TENANT_A, altToSelect.id);

      expect(selectRes.selectedDirection.name).toBe(altToSelect.name);
      expect(selectRes.version).toBe(2);
      expect(selectRes.impact.preserved.length).toBeGreaterThan(0);
    });

    it("should compare directions side-by-side via facade", async () => {
      await service.exploreDirections({
        sessionId: SESSION_1,
        campaignId: CAMPAIGN_1,
        tenantId: TENANT_A,
        currentDirectionId: "dir_init",
      });

      const comparison = await service.compareDirections(SESSION_1, TENANT_A);
      expect(comparison.length).toBeGreaterThanOrEqual(3);
      expect(comparison[0].audienceFit).toBeDefined();
      expect(comparison[0].distinctiveness).toBeDefined();
    });

    it("should create an A/B direction experiment via facade", async () => {
      const exploreRes = await service.exploreDirections({
        sessionId: SESSION_1,
        campaignId: CAMPAIGN_1,
        tenantId: TENANT_A,
        currentDirectionId: "dir_init",
      });

      const dirIds = [exploreRes.currentDirection.id, exploreRes.alternatives[0].id];

      const exp = await service.createDirectionExperiment(SESSION_1, TENANT_A, dirIds);

      expect(exp.status).toBe("CREATED");
      expect(exp.directionCount).toBe(2);
    });
  });
});
