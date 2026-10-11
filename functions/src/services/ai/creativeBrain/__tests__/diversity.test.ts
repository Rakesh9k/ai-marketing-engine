import {
  MechanismCanonicalizer,
  FingerprintService,
  DiversityScoreService,
  MechanismSaturationService,
  CreativeFatigueService,
  DiversityOpportunityService,
  FirestoreDiversityRepository,
  CreativeDiversityService,
} from "../diversity";

describe("Phase 10.32 — Creative Diversity Control System", () => {
  let canonicalizer: MechanismCanonicalizer;
  let fingerprintService: FingerprintService;
  let scoreService: DiversityScoreService;
  let saturationService: MechanismSaturationService;
  let fatigueService: CreativeFatigueService;
  let opportunityService: DiversityOpportunityService;
  let repository: FirestoreDiversityRepository;
  let service: CreativeDiversityService;

  const BIZ_1 = "biz_restaurant_001";
  const TENANT_A = "tenant_hyderabad_rest";
  const TENANT_B = "tenant_bangalore_retail";

  beforeEach(() => {
    canonicalizer = new MechanismCanonicalizer();
    fingerprintService = new FingerprintService(canonicalizer);
    scoreService = new DiversityScoreService();
    saturationService = new MechanismSaturationService(canonicalizer);
    fatigueService = new CreativeFatigueService();
    opportunityService = new DiversityOpportunityService();
    repository = new FirestoreDiversityRepository();
    repository.clearInMemoryState();

    service = new CreativeDiversityService(
      fingerprintService,
      scoreService,
      saturationService,
      fatigueService,
      opportunityService,
      repository
    );
  });

  describe("1. Canonical Mechanism & Family Resolver (MechanismCanonicalizer)", () => {
    it("should resolve surface aliases into canonical mechanism IDs and strategic families", () => {
      expect(canonicalizer.getCanonicalId("Discount")).toBe("VALUE_DISCOUNT");
      expect(canonicalizer.getCanonicalId("Price Reduction")).toBe("VALUE_DISCOUNT");
      expect(canonicalizer.getCanonicalId("Special Deal")).toBe("VALUE_DISCOUNT");
      expect(canonicalizer.getFamilyId("VALUE_DISCOUNT")).toBe("VALUE");

      expect(canonicalizer.getCanonicalId("Local Pride")).toBe("IDENTITY_LOCAL");
      expect(canonicalizer.getFamilyId("IDENTITY_LOCAL")).toBe("IDENTITY");
    });
  });

  describe("2. Fingerprint Extraction (FingerprintService)", () => {
    it("should produce normalized CreativeFingerprint and DiversityFingerprint", () => {
      const fp = fingerprintService.createFingerprint({
        campaignId: "cmp_1",
        businessId: BIZ_1,
        mechanismIds: ["Discount"],
        psychologyIds: ["Choice Simplification"],
        emotionalTerritoryIds: ["Relief"],
      });

      expect(fp.mechanismIds[0]).toBe("VALUE_DISCOUNT");

      const divFp = fingerprintService.extractDiversityFingerprint(fp);
      expect(divFp.primaryMechanisms[0]).toBe("VALUE_DISCOUNT");
      expect(divFp.psychologyFamilies[0]).toBe("CHOICE SIMPLIFICATION");
    });
  });

  describe("3. Diversity Scoring Engine (DiversityScoreService)", () => {
    it("should score 100 HEALTHY when campaign history is diverse", () => {
      const fp1 = fingerprintService.createFingerprint({ campaignId: "c1", businessId: BIZ_1, mechanismIds: ["Discount"] });
      const fp2 = fingerprintService.createFingerprint({ campaignId: "c2", businessId: BIZ_1, mechanismIds: ["Local Pride"] });
      const fp3 = fingerprintService.createFingerprint({ campaignId: "c3", businessId: BIZ_1, mechanismIds: ["Testimonials"] });
      const fp4 = fingerprintService.createFingerprint({ campaignId: "c4", businessId: BIZ_1, mechanismIds: ["Demonstration"] });
      const fp5 = fingerprintService.createFingerprint({ campaignId: "c5", businessId: BIZ_1, mechanismIds: ["Customer Story"] });

      const result = scoreService.calculateDiversityScore([fp1, fp2, fp3, fp4, fp5]);

      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.band).toMatch(/HEALTHY|GOOD/);
      expect(result.consecutiveRepetitions).toBe(1);
    });

    it("should penalize score (LOW or CRITICALLY_REPETITIVE) when 5 consecutive discount campaigns are recorded", () => {
      const discountFps = [1, 2, 3, 4, 5].map((i) =>
        fingerprintService.createFingerprint({ campaignId: `c_${i}`, businessId: BIZ_1, mechanismIds: ["Discount"] })
      );

      const result = scoreService.calculateDiversityScore(discountFps);

      expect(result.score).toBeLessThan(40);
      expect(result.consecutiveRepetitions).toBe(5);
      expect(result.band).toMatch(/LOW|CRITICALLY_REPETITIVE/);
    });
  });

  describe("4. Mechanism Saturation & Alerts (MechanismSaturationService)", () => {
    it("should identify OVERUSED mechanisms and generate alerts and cooldowns", () => {
      const discountFps = [1, 2, 3, 4, 5].map((i) =>
        fingerprintService.createFingerprint({ campaignId: `c_${i}`, businessId: BIZ_1, mechanismIds: ["Discount"] })
      );

      const { saturations, alerts, cooldowns } = saturationService.analyzeSaturation(discountFps);

      expect(saturations).toHaveLength(1);
      expect(saturations[0].status).toBe("OVERUSED");
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe("MECHANISM_OVERUSE");
      expect(cooldowns.length).toBeGreaterThan(0);
    });
  });

  describe("5. Fatigue Detection (CreativeFatigueService)", () => {
    it("should distinguish repetition (POSSIBLE) from performance decline (STRONG fatigue)", () => {
      const discountFps = [1, 2, 3, 4, 5].map((i) =>
        fingerprintService.createFingerprint({ campaignId: `c_${i}`, businessId: BIZ_1, mechanismIds: ["Discount"] })
      );

      const { saturations } = saturationService.analyzeSaturation(discountFps);

      // Scenario A: High repetition, but performance holding strong
      const signalsA = fatigueService.evaluateFatigue(saturations, [
        { mechanismId: "VALUE_DISCOUNT", historicalCtr: 0.05, recentCtr: 0.05 },
      ]);
      expect(signalsA[0].status).toBe("POSSIBLE");

      // Scenario B: High repetition AND performance declining
      const signalsB = fatigueService.evaluateFatigue(saturations, [
        { mechanismId: "VALUE_DISCOUNT", historicalCtr: 0.05, recentCtr: 0.02 }, // 60% drop
      ]);
      expect(signalsB[0].status).toBe("STRONG");
    });
  });

  describe("6. Opportunities & Blind Spots (DiversityOpportunityService)", () => {
    it("should identify underused compatible mechanisms and creative blind spots", () => {
      const discountFps = [1, 2, 3, 4, 5].map((i) =>
        fingerprintService.createFingerprint({ campaignId: `c_${i}`, businessId: BIZ_1, mechanismIds: ["Discount"] })
      );

      const { saturations } = saturationService.analyzeSaturation(discountFps);
      const { opportunities, blindSpots } = opportunityService.findDiversityOpportunities(saturations, "RESTAURANT");

      expect(opportunities.length).toBeGreaterThan(0);
      expect(opportunities.some((o) => o.mechanismId === "IDENTITY_LOCAL")).toBe(true);
      expect(blindSpots.length).toBeGreaterThan(0);
    });
  });

  describe("7. Master Facade Orchestration (CreativeDiversityService)", () => {
    it("should record campaign fingerprints and compute diversity profile", async () => {
      for (let i = 1; i <= 5; i++) {
        await service.recordCampaignFingerprint({
          campaignId: `cmp_${i}`,
          businessId: BIZ_1,
          tenantId: TENANT_A,
          mechanismIds: ["Discount"],
        });
      }

      const profile = await service.getCreativeDiversityProfile(BIZ_1, TENANT_A);

      expect(profile.businessId).toBe(BIZ_1);
      expect(profile.currentScore).toBeLessThan(40);
      expect(profile.repetitionAlerts.length).toBeGreaterThan(0);
      expect(profile.explorationRecommendations.length).toBeGreaterThan(0);
    });

    it("should enforce tenant security isolation", async () => {
      await service.recordCampaignFingerprint({
        campaignId: "cmp_sec_1",
        businessId: BIZ_1,
        tenantId: TENANT_A,
        mechanismIds: ["Discount"],
      });

      await expect(service.getCreativeDiversityProfile(BIZ_1, TENANT_B)).rejects.toThrow(
        "Tenant Security Exception"
      );
    });

    it("should compute DiversityPressure and DiversityContext for Creative Brain candidate ranking", async () => {
      for (let i = 1; i <= 5; i++) {
        await service.recordCampaignFingerprint({
          campaignId: `cmp_${i}`,
          businessId: BIZ_1,
          tenantId: TENANT_A,
          mechanismIds: ["Discount"],
        });
      }

      const pressure = await service.getDiversityPressure(BIZ_1);
      expect(pressure.level).toMatch(/HIGH|CRITICAL/);
      expect(pressure.reasons.length).toBeGreaterThan(0);

      const context = await service.getDiversityContext(BIZ_1);
      expect(context.saturatedMechanisms).toContain("VALUE_DISCOUNT");
      expect(context.explorationBudget).toBe(70);
    });

    it("should format human & admin explainability string for diversity score", async () => {
      await service.recordCampaignFingerprint({
        campaignId: "cmp_exp_1",
        businessId: BIZ_1,
        tenantId: TENANT_A,
        mechanismIds: ["Discount"],
      });

      const explanation = await service.explainDiversityScore(BIZ_1);
      expect(explanation).toContain("Creative Diversity Score:");
    });
  });
});
