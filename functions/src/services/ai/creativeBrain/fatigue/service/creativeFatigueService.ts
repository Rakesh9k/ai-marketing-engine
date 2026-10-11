import type {
  CreativeFatigueProfile,
  CreativeFatigueSignal,
  FatigueRecommendation,
  FatigueIntervention,
  FatigueContext,
} from "../fatigue.types";
import { FrequencyTracker } from "../frequency/frequencyTracker";
import { CreativeSimilarityService } from "../similarity/creativeSimilarityService";
import type { EmpiricalPerformanceInput } from "../performance/fatiguePerformanceService";
import { FatiguePerformanceService } from "../performance/fatiguePerformanceService";
import { FatigueScoreService } from "../score/fatigueScoreService";
import { FatigueRecommendationService } from "../recommendation/fatigueRecommendationService";
import { FirestoreFatigueRepository } from "../persistence/firestoreFatigueRepository";
import { FirestoreDiversityRepository } from "../../diversity/persistence/firestoreDiversityRepository";

export class CreativeFatigueService {
  private tracker: FrequencyTracker;
  private similarityService: CreativeSimilarityService;
  private perfService: FatiguePerformanceService;
  private scoreService: FatigueScoreService;
  private recommendationService: FatigueRecommendationService;
  private fatigueRepo: FirestoreFatigueRepository;
  private diversityRepo: FirestoreDiversityRepository;

  constructor(
    tracker?: FrequencyTracker,
    similarityService?: CreativeSimilarityService,
    perfService?: FatiguePerformanceService,
    scoreService?: FatigueScoreService,
    recommendationService?: FatigueRecommendationService,
    fatigueRepo?: FirestoreFatigueRepository,
    diversityRepo?: FirestoreDiversityRepository
  ) {
    this.tracker = tracker || new FrequencyTracker();
    this.similarityService = similarityService || new CreativeSimilarityService();
    this.perfService = perfService || new FatiguePerformanceService();
    this.scoreService = scoreService || new FatigueScoreService();
    this.recommendationService = recommendationService || new FatigueRecommendationService();
    this.fatigueRepo = fatigueRepo || new FirestoreFatigueRepository();
    this.diversityRepo = diversityRepo || new FirestoreDiversityRepository();
  }

  /**
   * Evaluates and retrieves full Creative Fatigue Profile for a business.
   */
  public async getCreativeFatigueProfile(
    businessId: string,
    tenantId: string
  ): Promise<CreativeFatigueProfile> {
    const recentFingerprints = await this.diversityRepo.getRecentFingerprints(businessId, 10);

    if (recentFingerprints.length > 0 && recentFingerprints[0].tenantId && recentFingerprints[0].tenantId !== tenantId) {
      throw new Error(`Tenant Security Exception: Tenant '${tenantId}' cannot access business '${businessId}'`);
    }

    const mechRecords = this.tracker.trackFrequency(
      businessId,
      "MECHANISM",
      (f) => f.mechanismIds,
      recentFingerprints
    );
    const hookRecords = this.tracker.trackFrequency(
      businessId,
      "HOOK",
      (f) => f.hookPatternIds,
      recentFingerprints
    );
    const styleRecords = this.tracker.trackFrequency(
      businessId,
      "STYLE",
      (f) => (f.format ? [f.format] : []),
      recentFingerprints
    );
    const visualRecords = this.tracker.trackFrequency(
      businessId,
      "VISUAL",
      (f) => f.visualPatternIds,
      recentFingerprints
    );

    const similarity = this.similarityService.calculateRecentSimilarity(recentFingerprints);

    const mechSignals = mechRecords.map((r) =>
      this.scoreService.calculateFatigueSignal({
        record: r,
        similarityScore: similarity,
        diversityPressureScore: 40,
      })
    );

    const hookSignals = hookRecords.map((r) =>
      this.scoreService.calculateFatigueSignal({
        record: r,
        similarityScore: similarity,
        diversityPressureScore: 30,
      })
    );

    const styleSignals = styleRecords.map((r) =>
      this.scoreService.calculateFatigueSignal({
        record: r,
        similarityScore: similarity,
        diversityPressureScore: 20,
      })
    );

    const visualSignals = visualRecords.map((r) =>
      this.scoreService.calculateFatigueSignal({
        record: r,
        similarityScore: similarity,
        diversityPressureScore: 20,
      })
    );

    const allSignals = [...mechSignals, ...hookSignals, ...styleSignals, ...visualSignals];
    const avgScore =
      allSignals.length > 0
        ? Math.round(allSignals.reduce((sum, s) => sum + s.fatigueScore, 0) / allSignals.length)
        : 0;

    const profileStatus =
      avgScore >= 75
        ? "CRITICAL"
        : avgScore >= 60
        ? "HIGH"
        : avgScore >= 45
        ? "ELEVATED"
        : avgScore >= 30
        ? "WATCH"
        : "HEALTHY";

    const profile: CreativeFatigueProfile = {
      businessId,
      tenantId,
      overallFatigueScore: avgScore,
      status: profileStatus,
      mechanismSignals: mechSignals,
      hookSignals,
      styleSignals,
      visualSignals,
      copyPatternSignals: [],
      psychologySignals: [],
      storySignals: [],
      recentWindowSize: recentFingerprints.length,
      updatedAt: new Date().toISOString(),
    };

    await this.fatigueRepo.saveProfile(profile);
    return profile;
  }

  /**
   * Detects fatigue signals for specific performance inputs & contextual factors.
   */
  public async detectCreativeFatigue(
    businessId: string,
    tenantId: string,
    perfInputs: EmpiricalPerformanceInput[] = [],
    _context?: FatigueContext
  ): Promise<CreativeFatigueSignal[]> {
    const profile = await this.getCreativeFatigueProfile(businessId, tenantId);
    const signals = [...profile.mechanismSignals, ...profile.hookSignals, ...profile.styleSignals, ...profile.visualSignals];

    return signals.map((sig) => {
      const perfInput = perfInputs.find((p) => p.entityId === sig.entityId);
      if (perfInput) {
        const trend = this.perfService.analyzePerformanceTrend(perfInput);
        if (trend.trend === "DECLINING") {
          return {
            ...sig,
            performanceDeclineScore: Math.round(Math.abs(trend.delta) * 100),
            status: sig.fatigueScore >= 60 ? "STRONG" : "LIKELY",
            confidence: trend.confidence,
          };
        }
      }
      return sig;
    });
  }

  /**
   * Retrieves active fatigue recommendations.
   */
  public async getFatigueRecommendations(
    businessId: string,
    tenantId: string
  ): Promise<FatigueRecommendation[]> {
    const signals = await this.detectCreativeFatigue(businessId, tenantId);
    return this.recommendationService.generateRecommendations(signals);
  }

  /**
   * Explains a specific fatigue signal.
   */
  public async explainFatigueSignal(
    signalId: string,
    businessId: string,
    tenantId: string
  ): Promise<string> {
    const signals = await this.detectCreativeFatigue(businessId, tenantId);
    const signal = signals.find((s) => s.id === signalId || s.entityId === signalId);

    if (!signal) {
      return `No active fatigue signal found for '${signalId}'.`;
    }

    return signal.explanation;
  }

  /**
   * Records a user or automated fatigue intervention.
   */
  public async recordIntervention(intervention: FatigueIntervention): Promise<void> {
    await this.fatigueRepo.saveIntervention(intervention);
  }

  /**
   * Retrieves intervention history for a tenant.
   */
  public async getFatigueInterventions(
    businessId: string,
    tenantId: string
  ): Promise<FatigueIntervention[]> {
    const history = await this.fatigueRepo.getInterventions(businessId);
    if (history.length > 0 && history[0].tenantId && history[0].tenantId !== tenantId) {
      throw new Error(`Tenant Security Exception: Tenant '${tenantId}' cannot access history for '${businessId}'`);
    }
    return history;
  }
}
