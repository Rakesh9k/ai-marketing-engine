import {
  FrequencyTracker,
  CreativeSimilarityService,
  FatiguePerformanceService,
  FatigueScoreService,
  FatigueRecommendationService,
  FirestoreFatigueRepository,
  CreativeFatigueService,
} from "../fatigue";
import { FingerprintService } from "../diversity";

describe("Phase 10.33 — Creative Intelligence Creative Fatigue Detection Engine", () => {
  let tracker: FrequencyTracker;
  let similarityService: CreativeSimilarityService;
  let perfService: FatiguePerformanceService;
  let scoreService: FatigueScoreService;
  let recommendationService: FatigueRecommendationService;
  let fatigueRepo: FirestoreFatigueRepository;
  let fingerprintService: FingerprintService;
  let service: CreativeFatigueService;

  const BIZ_1 = "biz_restaurant_001";
  const TENANT_A = "tenant_hyderabad_rest";
  const TENANT_B = "tenant_bangalore_retail";

  beforeEach(() => {
    tracker = new FrequencyTracker();
    similarityService = new CreativeSimilarityService();
    perfService = new FatiguePerformanceService();
    scoreService = new FatigueScoreService();
    recommendationService = new FatigueRecommendationService();
    fatigueRepo = new FirestoreFatigueRepository();
    fatigueRepo.clearInMemoryState();

    fingerprintService = new FingerprintService();
    service = new CreativeFatigueService(
      tracker,
      similarityService,
      perfService,
      scoreService,
      recommendationService,
      fatigueRepo
    );
  });

  describe("1. Frequency Tracking & Recency (FrequencyTracker)", () => {
    it("should calculate usage count, usage rate, and consecutive streaks accurately", () => {
      const fingerprints = [1, 2, 3, 4, 5].map((i) =>
        fingerprintService.createFingerprint({
          campaignId: `c_${i}`,
          businessId: BIZ_1,
          mechanismIds: [i <= 3 ? "Discount" : "Local Pride"],
        })
      );

      const records = tracker.trackFrequency(BIZ_1, "MECHANISM", (f) => f.mechanismIds, fingerprints);

      const discountRec = records.find((r) => r.entityId === "VALUE_DISCOUNT");
      const localRec = records.find((r) => r.entityId === "IDENTITY_LOCAL");

      expect(discountRec?.usageCount).toBe(3);
      expect(discountRec?.consecutiveUses).toBe(0); // Not consecutive up to the end
      expect(localRec?.consecutiveUses).toBe(2); // Ends with 2 consecutive Local Pride
    });
  });

  describe("2. Multi-Dimensional Similarity (CreativeSimilarityService)", () => {
    it("should compute creative distance between fingerprints and average similarity across history", () => {
      const fp1 = fingerprintService.createFingerprint({
        campaignId: "c1",
        businessId: BIZ_1,
        mechanismIds: ["Discount"],
        hookPatternIds: ["hook_1"],
      });
      const fp2 = fingerprintService.createFingerprint({
        campaignId: "c2",
        businessId: BIZ_1,
        mechanismIds: ["Discount"],
        hookPatternIds: ["hook_1"],
      });

      const dist = similarityService.calculateCreativeDistance(fp1, fp2);
      expect(dist.mechanismDistance).toBe(0);
      expect(dist.overall).toBeLessThan(40); // High similarity -> low distance

      const similarity = similarityService.calculateRecentSimilarity([fp1, fp2]);
      expect(similarity).toBeGreaterThan(60);
    });
  });

  describe("3. Performance Trend Analysis (FatiguePerformanceService)", () => {
    it("should calculate empirical performance deltas without fabricating missing data", () => {
      const trendDeclining = perfService.analyzePerformanceTrend({
        entityId: "VALUE_DISCOUNT",
        metric: "CTR",
        historicalValue: 0.05,
        recentValue: 0.03, // 40% decline
        sampleSize: 5,
      });

      expect(trendDeclining.trend).toBe("DECLINING");
      expect(trendDeclining.delta).toBe(-0.4);
      expect(trendDeclining.confidence).toBeGreaterThan(0.7);

      const trendNoData = perfService.analyzePerformanceTrend({
        entityId: "VALUE_DISCOUNT",
        metric: "CTR",
        sampleSize: 1,
      });

      expect(trendNoData.trend).toBe("STABLE");
      expect(trendNoData.confidence).toBe(0.3); // Low confidence
    });
  });

  describe("4. Fatigue Scoring & Performance Capping (FatigueScoreService)", () => {
    it("should cap status at POSSIBLE when repetition is high but performance is strong", () => {
      const records = tracker.trackFrequency(
        BIZ_1,
        "MECHANISM",
        (f) => f.mechanismIds,
        [1, 2, 3, 4, 5].map((i) =>
          fingerprintService.createFingerprint({ campaignId: `c_${i}`, businessId: BIZ_1, mechanismIds: ["Discount"] })
        )
      );

      const discountRec = records.find((r) => r.entityId === "VALUE_DISCOUNT")!;

      // Scenario A: High repetition, strong performance
      const signalA = scoreService.calculateFatigueSignal({
        record: discountRec,
        similarityScore: 80,
        diversityPressureScore: 70,
        performanceTrend: {
          mechanismId: "VALUE_DISCOUNT",
          campaignCount: 5,
          historicalPerformance: 0.03,
          recentPerformance: 0.05,
          delta: 0.66,
          trend: "IMPROVING",
          confidence: 0.85,
        },
      });

      expect(signalA.status).not.toBe("STRONG"); // Performance capping safeguard
      expect(signalA.status).toBe("POSSIBLE");

      // Scenario B: High repetition, declining performance
      const signalB = scoreService.calculateFatigueSignal({
        record: discountRec,
        similarityScore: 80,
        diversityPressureScore: 70,
        performanceTrend: {
          mechanismId: "VALUE_DISCOUNT",
          campaignCount: 5,
          historicalPerformance: 0.05,
          recentPerformance: 0.02,
          delta: -0.60,
          trend: "DECLINING",
          confidence: 0.85,
        },
      });

      expect(signalB.status).toBe("STRONG");
    });
  });

  describe("5. Recommendations & Interventions (FatigueRecommendationService)", () => {
    it("should produce non-alarmist specific recommendations and intervention logs", () => {
      const signal = {
        id: "sig_1",
        entityType: "MECHANISM" as const,
        entityId: "VALUE_DISCOUNT",
        entityName: "Discount",
        frequencyScore: 80,
        recencyScore: 80,
        repetitionScore: 80,
        similarityScore: 80,
        performanceDeclineScore: 40,
        diversityPressureScore: 70,
        confidence: 0.85,
        fatigueScore: 78,
        status: "STRONG" as const,
        explanation: "High repetition with declining CTR.",
        generatedAt: new Date().toISOString(),
      };

      const recs = recommendationService.generateRecommendations([signal]);
      expect(recs).toHaveLength(1);
      expect(recs[0].type).toBe("ROTATE_MECHANISM");
      expect(recs[0].suggestedAlternatives).toContain("Demonstration");

      const intervention = recommendationService.createIntervention(
        BIZ_1,
        TENANT_A,
        signal,
        recs[0].suggestedAlternatives,
        "TRANSFORMATION_DEMO",
        "USER"
      );

      expect(intervention.businessId).toBe(BIZ_1);
      expect(intervention.selectedMechanismId).toBe("TRANSFORMATION_DEMO");
    });
  });

  describe("6. Master Facade Orchestration (CreativeFatigueService)", () => {
    it("should compute Creative Fatigue Profile across recent campaigns", async () => {
      for (let i = 1; i <= 5; i++) {
        await service.getCreativeFatigueProfile(BIZ_1, TENANT_A);
      }

      const profile = await service.getCreativeFatigueProfile(BIZ_1, TENANT_A);
      expect(profile.businessId).toBe(BIZ_1);
      expect(profile.status).toBeDefined();
    });

    it("should enforce tenant security isolation", async () => {
      await service.recordIntervention({
        id: "int_sec_1",
        businessId: BIZ_1,
        tenantId: TENANT_A,
        triggerSignalId: "VALUE_DISCOUNT",
        previousMechanismIds: ["Discount"],
        recommendedMechanismIds: ["TRANSFORMATION_DEMO"],
        selectedBy: "MITRA",
        createdAt: new Date().toISOString(),
      });

      await expect(service.getFatigueInterventions(BIZ_1, TENANT_B)).rejects.toThrow(
        "Tenant Security Exception"
      );
    });

    it("should format human-readable explanation string for fatigue signal", async () => {
      const explanation = await service.explainFatigueSignal("VALUE_DISCOUNT", BIZ_1, TENANT_A);
      expect(explanation).toBeDefined();
    });
  });
});
