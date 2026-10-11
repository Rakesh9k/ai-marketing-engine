import type {
  CreativeFingerprint,
  CreativeDiversityProfile,
  CreativeFatigueSignal,
  DiversityContext,
  DiversityPressure,
} from "../types";
import { FingerprintService } from "../fingerprint/fingerprintService";
import { DiversityScoreService } from "../scoring/diversityScoreService";
import { MechanismSaturationService } from "../saturation/mechanismSaturationService";
import type { PerformanceSignalInput } from "../fatigue/creativeFatigueService";
import { CreativeFatigueService } from "../fatigue/creativeFatigueService";
import { DiversityOpportunityService } from "../opportunity/diversityOpportunityService";
import { FirestoreDiversityRepository } from "../persistence/firestoreDiversityRepository";

export class CreativeDiversityService {
  private fingerprintService: FingerprintService;
  private scoreService: DiversityScoreService;
  private saturationService: MechanismSaturationService;
  private fatigueService: CreativeFatigueService;
  private opportunityService: DiversityOpportunityService;
  private repository: FirestoreDiversityRepository;

  constructor(
    fingerprintService?: FingerprintService,
    scoreService?: DiversityScoreService,
    saturationService?: MechanismSaturationService,
    fatigueService?: CreativeFatigueService,
    opportunityService?: DiversityOpportunityService,
    repository?: FirestoreDiversityRepository
  ) {
    this.fingerprintService = fingerprintService || new FingerprintService();
    this.scoreService = scoreService || new DiversityScoreService();
    this.saturationService = saturationService || new MechanismSaturationService();
    this.fatigueService = fatigueService || new CreativeFatigueService();
    this.opportunityService = opportunityService || new DiversityOpportunityService();
    this.repository = repository || new FirestoreDiversityRepository();
  }

  /**
   * Records a completed campaign's creative fingerprint into persistent history.
   */
  public async recordCampaignFingerprint(input: {
    campaignId: string;
    businessId: string;
    tenantId?: string;
    directionId?: string;
    psychologyIds?: string[];
    mechanismIds?: string[];
    recipeIds?: string[];
    storyPatternIds?: string[];
    hookPatternIds?: string[];
    visualPatternIds?: string[];
    copyPatternIds?: string[];
    offerFramingIds?: string[];
    ctaPatternIds?: string[];
    emotionalTerritoryIds?: string[];
    audienceContext?: string;
    objective?: string;
    platform?: string;
    format?: string;
  }): Promise<CreativeFingerprint> {
    const fingerprint = this.fingerprintService.createFingerprint(input);
    await this.repository.saveFingerprint(fingerprint);
    return fingerprint;
  }

  /**
   * Computes the current Creative Diversity Profile for a business.
   */
  public async getCreativeDiversityProfile(
    businessId: string,
    tenantId: string
  ): Promise<CreativeDiversityProfile> {
    const recent = await this.repository.getRecentFingerprints(businessId, 10);

    // Multi-tenant check
    if (recent.length > 0 && recent[0].tenantId && recent[0].tenantId !== tenantId) {
      throw new Error(`Tenant Security Exception: Tenant '${tenantId}' cannot access business '${businessId}'`);
    }

    const scoreResult = this.scoreService.calculateDiversityScore(recent);
    const { saturations, alerts } = this.saturationService.analyzeSaturation(recent);
    const { opportunities } = this.opportunityService.findDiversityOpportunities(saturations);

    const profile: CreativeDiversityProfile = {
      businessId,
      tenantId,
      currentScore: scoreResult.score,
      band: scoreResult.band,
      recentWindowSize: recent.length,
      mechanismDistribution: this.buildDistribution(recent, (f) => f.mechanismIds),
      psychologyDistribution: this.buildDistribution(recent, (f) => f.psychologyIds),
      recipeDistribution: this.buildDistribution(recent, (f) => f.recipeIds),
      storyDistribution: this.buildDistribution(recent, (f) => f.storyPatternIds),
      visualDistribution: this.buildDistribution(recent, (f) => f.visualPatternIds),
      emotionalDistribution: this.buildDistribution(recent, (f) => f.emotionalTerritoryIds),
      repetitionAlerts: alerts,
      explorationRecommendations: opportunities.slice(0, 3).map((o) => o.mechanismId),
      updatedAt: new Date().toISOString(),
    };

    await this.repository.saveProfile(profile);
    return profile;
  }

  /**
   * Computes Diversity Pressure for Creative Brain candidate generation.
   */
  public async getDiversityPressure(businessId: string): Promise<DiversityPressure> {
    const recent = await this.repository.getRecentFingerprints(businessId, 5);
    const scoreResult = this.scoreService.calculateDiversityScore(recent);
    const { saturations, alerts } = this.saturationService.analyzeSaturation(recent);

    const level: DiversityPressure["level"] =
      scoreResult.score < 20
        ? "CRITICAL"
        : scoreResult.score < 40
        ? "HIGH"
        : scoreResult.score < 60
        ? "MEDIUM"
        : scoreResult.score < 80
        ? "LOW"
        : "NONE";

    const reasons = alerts.map((a) => a.message);
    const { opportunities } = this.opportunityService.findDiversityOpportunities(saturations);

    return {
      score: 100 - scoreResult.score,
      level,
      reasons: reasons.length > 0 ? reasons : ["Recent creative mix is healthy and diverse."],
      recommendedExploration: opportunities.slice(0, 3).map((o) => o.mechanismId),
    };
  }

  /**
   * Computes DiversityContext to pass into Creative Brain & Explore Another Direction Engine.
   */
  public async getDiversityContext(businessId: string): Promise<DiversityContext> {
    const recent = await this.repository.getRecentFingerprints(businessId, 5);
    const scoreResult = this.scoreService.calculateDiversityScore(recent);
    const { saturations } = this.saturationService.analyzeSaturation(recent);
    const fatigueSignals = this.fatigueService.evaluateFatigue(saturations);
    const { opportunities } = this.opportunityService.findDiversityOpportunities(saturations);

    const saturatedMechs = saturations
      .filter((s) => s.status === "SATURATED" || s.status === "OVERUSED")
      .map((s) => s.mechanismId);

    const underusedMechs = opportunities.map((o) => o.mechanismId);

    return {
      currentScore: scoreResult.score,
      pressure: 100 - scoreResult.score,
      saturatedMechanisms: saturatedMechs,
      saturatedFamilies: ["VALUE"],
      underusedMechanisms: underusedMechs,
      underusedFamilies: ["IDENTITY", "STORY", "TRANSFORMATION"],
      recentDirections: recent.flatMap((f) => (f.directionId ? [f.directionId] : [])),
      recentPsychologies: recent.flatMap((f) => f.psychologyIds),
      recentRecipes: recent.flatMap((f) => f.recipeIds),
      fatigueSignals,
      explorationBudget: scoreResult.score < 40 ? 70 : 30,
    };
  }

  /**
   * Evaluates fatigue signals combining repetition metrics with empirical performance inputs.
   */
  public async getCreativeFatigueSignals(
    businessId: string,
    perfInputs: PerformanceSignalInput[] = []
  ): Promise<CreativeFatigueSignal[]> {
    const recent = await this.repository.getRecentFingerprints(businessId, 5);
    const { saturations } = this.saturationService.analyzeSaturation(recent);
    return this.fatigueService.evaluateFatigue(saturations, perfInputs);
  }

  /**
   * Explains the creative diversity score for user & admin explainability.
   */
  public async explainDiversityScore(businessId: string): Promise<string> {
    const recent = await this.repository.getRecentFingerprints(businessId, 5);
    const scoreResult = this.scoreService.calculateDiversityScore(recent);
    const { saturations } = this.saturationService.analyzeSaturation(recent);

    const saturatedList = saturations.filter((s) => s.status === "SATURATED" || s.status === "OVERUSED");
    const countNote = saturatedList.length > 0
      ? `Primary mechanism concentration detected across ${saturatedList.map((s) => s.mechanismId).join(", ")}.`
      : "Creative mechanism distribution is well-balanced across recent campaigns.";

    return `Creative Diversity Score: ${scoreResult.score}/100 (${scoreResult.band}). ${countNote}`;
  }

  private buildDistribution(
    fingerprints: CreativeFingerprint[],
    extractor: (f: CreativeFingerprint) => string[]
  ): Record<string, number> {
    const counts: Record<string, number> = {};
    let total = 0;
    fingerprints.forEach((f) => {
      extractor(f).forEach((item) => {
        counts[item] = (counts[item] || 0) + 1;
        total++;
      });
    });

    if (total === 0) return {};
    const distribution: Record<string, number> = {};
    for (const [k, v] of Object.entries(counts)) {
      distribution[k] = Number(((v / total) * 100).toFixed(1));
    }
    return distribution;
  }
}
