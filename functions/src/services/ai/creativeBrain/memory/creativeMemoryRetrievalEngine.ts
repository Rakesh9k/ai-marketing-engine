/**
 * PHASE 21 — Creative Memory Retrieval & Context Summarization Engine
 * Filters tenant history, computes contextual similarity & recency weighting, handles cold-start,
 * generates explainable recommendations, and returns summarized CreativeMemoryContext for Creative Brain.
 */

import type {
  CanonicalCreativeMemory,
  CreativeMemoryContext,
  CreativeMemoryQuery,
  CreativeMemoryRetrieval,
  MemoryRecommendation,
} from './canonicalMemory.types';
import { PreferenceSignalEngine } from './preferenceSignalEngine';
import { RepetitionDetector } from './repetitionDetector';
import { TerritoryTracker } from './territoryTracker';

export class CreativeMemoryRetrievalEngine {
  private readonly repetitionDetector: RepetitionDetector;
  private readonly territoryTracker: TerritoryTracker;
  private readonly preferenceEngine: PreferenceSignalEngine;

  constructor(
    repetitionDetector?: RepetitionDetector,
    territoryTracker?: TerritoryTracker,
    preferenceEngine?: PreferenceSignalEngine
  ) {
    this.repetitionDetector = repetitionDetector || new RepetitionDetector();
    this.territoryTracker = territoryTracker || new TerritoryTracker();
    this.preferenceEngine = preferenceEngine || new PreferenceSignalEngine();
  }

  /**
   * Executes a contextual retrieval query against memory store.
   */
  public queryMemory(
    query: CreativeMemoryQuery,
    allMemories: CanonicalCreativeMemory[]
  ): CreativeMemoryRetrieval {
    // 1. Tenant & Business Isolation Filter
    const tenantMemories = allMemories.filter((m) => {
      const matchTenant = m.tenantId === query.tenantId;
      const matchBusiness = !query.businessId || m.businessId === query.businessId;
      return matchTenant && matchBusiness;
    });

    // 2. Cold-Start Check
    if (tenantMemories.length === 0) {
      return {
        memories: [],
        patterns: [],
        preferences: [],
        repetitions: [],
        territoryMap: [],
        recommendations: [],
        confidence: 0.0,
      };
    }

    // 3. Extract Signals
    const repetitions = this.repetitionDetector.detectRepetitions(tenantMemories);
    const territoryMap = this.territoryTracker.buildTerritoryMap(tenantMemories);
    const preferences = this.preferenceEngine.extractSignals(tenantMemories);

    // 4. Generate Explainable Recommendations
    const recommendations = this.generateRecommendations(repetitions, territoryMap, preferences);

    // 5. Contextual Relevance Ranking
    const rankedMemories = [...tenantMemories].sort((a, b) => {
      const scoreA = this.calculateContextScore(a, query);
      const scoreB = this.calculateContextScore(b, query);
      return scoreB - scoreA;
    });

    const limit = query.limit || 10;
    const selectedMemories = rankedMemories.slice(0, limit);

    return {
      memories: selectedMemories,
      patterns: preferences.filter((p) => p.signalType === 'PATTERN'),
      preferences: preferences.filter((p) => p.signalType === 'PREFERENCE' || p.signalType === 'SUCCESS'),
      repetitions,
      territoryMap,
      recommendations,
      confidence: Math.min(1.0, 0.3 + tenantMemories.length * 0.15),
    };
  }

  /**
   * Summarizes retrieved memories into a clean CreativeMemoryContext for Creative Brain sessions.
   */
  public buildContext(retrieval: CreativeMemoryRetrieval): CreativeMemoryContext {
    if (retrieval.memories.length === 0) {
      return {
        recentCampaigns: [],
        repeatedPatterns: [],
        successfulPatterns: [],
        weakPatterns: [],
        userPreferences: [],
        underusedTerritories: [],
        fatigueSignals: [],
        revisionInsights: [],
        performanceInsights: [],
        recommendations: [],
        isColdStart: true,
      };
    }

    const underused = retrieval.territoryMap.filter((t) => t.saturationScore < 30 || t.usageCount === 0);
    const fatigue = retrieval.repetitions.filter((r) => r.fatigueRisk === 'HIGH' || r.fatigueRisk === 'MEDIUM');

    return {
      recentCampaigns: retrieval.memories.slice(0, 5),
      repeatedPatterns: retrieval.repetitions,
      successfulPatterns: retrieval.preferences.filter((p) => p.signalType === 'SUCCESS'),
      weakPatterns: retrieval.preferences.filter((p) => p.signalType === 'AVERSION' || p.signalType === 'FAILURE'),
      userPreferences: retrieval.preferences.filter((p) => p.signalType === 'PREFERENCE'),
      underusedTerritories: underused,
      fatigueSignals: fatigue,
      revisionInsights: [],
      performanceInsights: retrieval.memories
        .filter((m) => m.performance)
        .map((m) => `Campaign ${m.campaignId} CTR: ${m.performance?.ctr || 'N/A'}`),
      recommendations: retrieval.recommendations,
      isColdStart: false,
    };
  }

  private generateRecommendations(
    repetitions: ReturnType<RepetitionDetector['detectRepetitions']>,
    territories: ReturnType<TerritoryTracker['buildTerritoryMap']>,
    preferences: ReturnType<PreferenceSignalEngine['extractSignals']>
  ): MemoryRecommendation[] {
    const recs: MemoryRecommendation[] = [];

    // A. Repetition Fatigue Recommendation (DIVERSIFY)
    const highFatigue = repetitions.find((r) => r.fatigueRisk === 'HIGH');
    if (highFatigue) {
      recs.push({
        type: 'DIVERSIFY',
        reason: `Three or more recent campaigns used ${highFatigue.patternType.toLowerCase()}-led pattern '${highFatigue.pattern}'. Exploring an alternative territory reduces fatigue risk.`,
        evidenceCampaignIds: [],
        confidence: 0.87,
        suggestedDirection: 'Explore customer-story or recognition-based concept',
      });
    }

    // B. Repeat Success Recommendation (REPEAT_SUCCESS)
    const strongSuccess = preferences.find((p) => p.signalType === 'SUCCESS' && p.confidence >= 0.25);
    if (strongSuccess && !highFatigue) {
      recs.push({
        type: 'REPEAT_SUCCESS',
        reason: `Proven success signal '${strongSuccess.subject}' with high user/performance support.`,
        evidenceCampaignIds: strongSuccess.sourceCampaignIds,
        confidence: strongSuccess.confidence,
        suggestedDirection: `Create a fresh variation of ${strongSuccess.subject}`,
      });
    }

    // C. Explore Untested Territory (EXPLORE_UNTESTED)
    const underusedTerritory = territories.find((t) => t.usageCount === 0 || t.saturationScore < 20);
    if (underusedTerritory) {
      recs.push({
        type: 'EXPLORE_UNTESTED',
        reason: `Territory '${underusedTerritory.territory}' is currently underused (saturation ${underusedTerritory.saturationScore}%).`,
        evidenceCampaignIds: [],
        confidence: 0.75,
        suggestedDirection: underusedTerritory.territory,
      });
    }

    return recs;
  }

  private calculateContextScore(memory: CanonicalCreativeMemory, query: CreativeMemoryQuery): number {
    let score = 50;

    if (query.objective && memory.strategic.marketingObjective === query.objective) score += 25;
    if (query.platform && memory.creative.platform === query.platform) score += 15;
    if (query.format && memory.creative.format === query.format) score += 10;

    // Recency weighting
    const ageDays = (Date.now() - new Date(memory.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 14) score += 15;
    else if (ageDays < 60) score += 5;

    return score;
  }
}
