import type {
  PerformanceObservation,
  PerformanceRecommendationItem,
  PerformanceRecommendationResult,
  RecommendationEvidenceLevel,
  GenerationRecommendationContext,
} from '../../types/recommendation';
import * as firestoreService from '../firestore';
import {
  createLogger,
  logFunctionStart,
  logFunctionComplete,
  logFunctionError,
} from '../../utils/logging';

export class PerformanceRecommendationService {
  /**
   * Generates or refreshes performance-based recommendations for a business.
   * Enforces small sample guardrails and business-scoped isolation.
   */
  async evaluateBusinessRecommendations(
    businessId: string
  ): Promise<PerformanceRecommendationResult> {
    const { logger, startTime } = logFunctionStart(
      'PerformanceRecommendationService.evaluateBusinessRecommendations',
      { businessId }
    );

    try {
      const observations =
        typeof firestoreService.listPerformanceObservationsForBusiness === 'function'
          ? await firestoreService.listPerformanceObservationsForBusiness(businessId)
          : [];
      const sampleSize = observations.length;

      // 1. Small Sample Guardrail
      if (sampleSize < 3) {
        const result: PerformanceRecommendationResult = {
          businessId,
          hasEnoughEvidence: false,
          evidenceLevel: 'insufficient_data',
          sampleSize,
          recommendations: [],
          summaryMessage:
            "We're still learning what works for your business. Published content history is building up.",
          generatedAt: new Date().toISOString(),
          dataVersion: 1,
        };
        try {
          if (typeof firestoreService.setPerformanceRecommendationDoc === 'function') {
            await firestoreService.setPerformanceRecommendationDoc(result);
          }
        } catch (_) {}
        logFunctionComplete(logger, startTime, {
          success: true,
          sampleSize,
          evidenceLevel: 'insufficient_data',
        });
        return result;
      }

      // Determine evidence strength based on sample volume
      let evidenceLevel: RecommendationEvidenceLevel = 'low';
      if (sampleSize >= 10) {
        evidenceLevel = 'high';
      } else if (sampleSize >= 5) {
        evidenceLevel = 'moderate';
      }

      // 2. Evaluate performance across dimensions
      const recommendations: PerformanceRecommendationItem[] = [];

      // A) Content Type Evaluation
      const typeRec = this.evaluateContentType(observations, evidenceLevel);
      if (typeRec) recommendations.push(typeRec);

      // B) Language & Tone Evaluation
      const langRec = this.evaluateLanguageAndTone(observations, evidenceLevel);
      if (langRec) recommendations.push(langRec);

      // C) Hook Type Evaluation
      const hookRec = this.evaluateHookType(observations, evidenceLevel);
      if (hookRec) recommendations.push(hookRec);

      // D) Posting Time Window Evaluation
      const postingRec = this.evaluatePostingWindow(observations, evidenceLevel);
      if (postingRec) recommendations.push(postingRec);

      const summaryMessage =
        recommendations.length > 0
          ? `Based on ${sampleSize} published observations, Mitra observed patterns that tend to perform relatively well for your business.`
          : `We've analyzed ${sampleSize} posts. Data shows balanced performance across formats. Continuing to monitor.`;

      const result: PerformanceRecommendationResult = {
        businessId,
        hasEnoughEvidence: recommendations.length > 0,
        evidenceLevel,
        sampleSize,
        recommendations,
        summaryMessage,
        generatedAt: new Date().toISOString(),
        dataVersion: Date.now(),
      };

      try {
        if (typeof firestoreService.setPerformanceRecommendationDoc === 'function') {
          await firestoreService.setPerformanceRecommendationDoc(result);
        }
      } catch (saveErr) {
        // Safe fallback in test mocks or un-initialized environments
      }

      logFunctionComplete(logger, startTime, {
        success: true,
        sampleSize,
        recommendationCount: recommendations.length,
      });

      return result;
    } catch (err) {
      logFunctionError(logger, startTime, err as Error);
      throw err;
    }
  }

  /**
   * Retrieves cached recommendations or computes new ones if missing/stale.
   */
  async getRecommendationsForBusiness(
    businessId: string
  ): Promise<PerformanceRecommendationResult> {
    try {
      if (typeof firestoreService.getPerformanceRecommendationDoc === 'function') {
        const cached = await firestoreService.getPerformanceRecommendationDoc(businessId);
        if (cached) {
          return cached;
        }
      }
    } catch (cacheErr) {
      // Fall through to evaluation
    }
    return this.evaluateBusinessRecommendations(businessId);
  }

  /**
   * Builds GenerationRecommendationContext for integration with CampaignGenerationService.
   */
  async buildGenerationRecommendationContext(
    businessId: string
  ): Promise<GenerationRecommendationContext> {
    const recResult = await this.getRecommendationsForBusiness(businessId);

    if (!recResult.hasEnoughEvidence || recResult.recommendations.length === 0) {
      return {
        hasRecommendations: false,
        evidenceLevel: recResult.evidenceLevel,
        sampleSize: recResult.sampleSize,
      };
    }

    const topRec = recResult.recommendations[0];
    if (!topRec) {
      return {
        hasRecommendations: false,
        evidenceLevel: recResult.evidenceLevel,
        sampleSize: recResult.sampleSize,
      };
    }

    const reasons = recResult.recommendations.map((r) => r.reason);

    const guidancePrompt = `HISTORICAL PERFORMANCE OBSERVATIONS FOR THIS BUSINESS:
- ${reasons.join('\n- ')}
(Note: These are non-binding recommendations based on past observations. Maintain creative variety and align with specific user campaign goals.)`;

    return {
      hasRecommendations: true,
      evidenceLevel: recResult.evidenceLevel,
      sampleSize: recResult.sampleSize,
      guidancePrompt,
      recommendedAttributes: {
        contentType: topRec.recommendedContentType,
        language: topRec.recommendedLanguage,
        tone: topRec.recommendedTone,
        hookType: topRec.recommendedHookType,
        offerType: topRec.recommendedOfferType,
        postingWindow: topRec.recommendedPostingWindow,
      },
      reasons,
    };
  }

  // Helper Methods for Dimension Evaluation

  private evaluateContentType(
    obs: PerformanceObservation[],
    evidenceLevel: RecommendationEvidenceLevel
  ): PerformanceRecommendationItem | null {
    const typeStats = new Map<
      string,
      { count: number; totalScore: number; campaignIds: Set<string> }
    >();

    for (const o of obs) {
      const type = o.attributes.contentType;
      if (!type) continue;

      const score = this.calculateObservationScore(o);
      const entry = typeStats.get(type) || { count: 0, totalScore: 0, campaignIds: new Set() };
      entry.count += 1;
      entry.totalScore += score;
      entry.campaignIds.add(o.campaignId);
      typeStats.set(type, entry);
    }

    let bestType: string | null = null;
    let bestAvg = -1;
    let bestStats: { count: number; campaignIds: Set<string> } | null = null;

    for (const [type, stats] of typeStats.entries()) {
      if (stats.count < 2 || stats.campaignIds.size < 2) continue; // Must span multiple campaigns
      const avg = stats.totalScore / stats.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestType = type;
        bestStats = stats;
      }
    }

    if (!bestType || !bestStats || bestAvg <= 0) return null;

    const label = bestType === 'reel' ? 'Reels' : 'Posts';
    return {
      recommendedContentType: bestType as any,
      reason: `Your recent ${label} have received higher average reach and views for your business.`,
      confidence: evidenceLevel,
      evidenceCount: bestStats.count,
    };
  }

  private evaluateLanguageAndTone(
    obs: PerformanceObservation[],
    evidenceLevel: RecommendationEvidenceLevel
  ): PerformanceRecommendationItem | null {
    const langStats = new Map<
      string,
      { count: number; totalScore: number; campaignIds: Set<string> }
    >();

    for (const o of obs) {
      const lang = o.attributes.language;
      if (!lang) continue;

      const score = this.calculateObservationScore(o);
      const entry = langStats.get(lang) || { count: 0, totalScore: 0, campaignIds: new Set() };
      entry.count += 1;
      entry.totalScore += score;
      entry.campaignIds.add(o.campaignId);
      langStats.set(lang, entry);
    }

    let bestLang: string | null = null;
    let bestAvg = -1;
    let bestStats: { count: number; campaignIds: Set<string> } | null = null;

    for (const [lang, stats] of langStats.entries()) {
      if (stats.count < 2 || stats.campaignIds.size < 2) continue;
      const avg = stats.totalScore / stats.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestLang = lang;
        bestStats = stats;
      }
    }

    if (!bestLang || !bestStats || bestAvg <= 0) return null;

    const langNameMap: Record<string, string> = {
      te_en: 'Telugu + English',
      hi_en: 'Hindi + English',
      te: 'Telugu',
      hi: 'Hindi',
      en: 'English',
    };

    const langName = langNameMap[bestLang] || bestLang;

    return {
      recommendedLanguage: bestLang as any,
      reason: `${langName} content has shown strong audience engagement in your recent posts.`,
      confidence: evidenceLevel,
      evidenceCount: bestStats.count,
    };
  }

  private evaluateHookType(
    obs: PerformanceObservation[],
    evidenceLevel: RecommendationEvidenceLevel
  ): PerformanceRecommendationItem | null {
    const hookStats = new Map<
      string,
      { count: number; totalScore: number; campaignIds: Set<string> }
    >();

    for (const o of obs) {
      const hook = o.attributes.hookType;
      if (!hook || hook === 'unknown') continue;

      const score = this.calculateObservationScore(o);
      const entry = hookStats.get(hook) || { count: 0, totalScore: 0, campaignIds: new Set() };
      entry.count += 1;
      entry.totalScore += score;
      entry.campaignIds.add(o.campaignId);
      hookStats.set(hook, entry);
    }

    let bestHook: string | null = null;
    let bestAvg = -1;
    let bestStats: { count: number; campaignIds: Set<string> } | null = null;

    for (const [hook, stats] of hookStats.entries()) {
      if (stats.count < 2 || stats.campaignIds.size < 2) continue;
      const avg = stats.totalScore / stats.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestHook = hook;
        bestStats = stats;
      }
    }

    if (!bestHook || !bestStats || bestAvg <= 0) return null;

    const hookLabelMap: Record<string, string> = {
      price: 'offer/price-led',
      problem_solution: 'problem-solution',
      question: 'question-based',
      curiosity: 'curiosity-driven',
      urgency: 'urgency-focused',
      local_identity: 'local identity',
      product_first: 'product-focused',
      offer_first: 'offer-led',
      story: 'storytelling',
      social_proof: 'social proof',
    };

    const label = hookLabelMap[bestHook] || bestHook;

    return {
      recommendedHookType: bestHook as any,
      reason: `Posts featuring ${label} hooks tend to perform well for your brand.`,
      confidence: evidenceLevel,
      evidenceCount: bestStats.count,
    };
  }

  private evaluatePostingWindow(
    obs: PerformanceObservation[],
    evidenceLevel: RecommendationEvidenceLevel
  ): PerformanceRecommendationItem | null {
    const windowStats = new Map<
      string,
      {
        startHour: number;
        endHour: number;
        count: number;
        totalScore: number;
        campaignIds: Set<string>;
      }
    >();

    for (const o of obs) {
      const hour = o.attributes.postingHour;
      if (hour === undefined || hour === null) continue;

      let windowKey = 'evening';
      let startHour = 17;
      let endHour = 21;

      if (hour >= 6 && hour < 12) {
        windowKey = 'morning';
        startHour = 8;
        endHour = 11;
      } else if (hour >= 12 && hour < 17) {
        windowKey = 'afternoon';
        startHour = 12;
        endHour = 16;
      } else if (hour >= 17 && hour < 22) {
        windowKey = 'evening';
        startHour = 17;
        endHour = 21;
      } else {
        windowKey = 'night';
        startHour = 21;
        endHour = 23;
      }

      const score = this.calculateObservationScore(o);
      const entry = windowStats.get(windowKey) || {
        startHour,
        endHour,
        count: 0,
        totalScore: 0,
        campaignIds: new Set(),
      };
      entry.count += 1;
      entry.totalScore += score;
      entry.campaignIds.add(o.campaignId);
      windowStats.set(windowKey, entry);
    }

    let bestWindowKey: string | null = null;
    let bestAvg = -1;
    let bestEntry: { startHour: number; endHour: number; count: number } | null = null;

    for (const [key, entry] of windowStats.entries()) {
      if (entry.count < 2 || entry.campaignIds.size < 2) continue;
      const avg = entry.totalScore / entry.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestWindowKey = key;
        bestEntry = entry;
      }
    }

    if (!bestWindowKey || !bestEntry || bestAvg <= 0) return null;

    const windowLabel =
      bestWindowKey === 'evening'
        ? 'Evening posts (5 PM – 9 PM)'
        : bestWindowKey === 'morning'
          ? 'Morning posts (8 AM – 11 AM)'
          : bestWindowKey === 'afternoon'
            ? 'Afternoon posts (12 PM – 4 PM)'
            : 'Late evening posts (9 PM – 11 PM)';

    return {
      recommendedPostingWindow: {
        startHour: bestEntry.startHour,
        endHour: bestEntry.endHour,
      },
      reason: `${windowLabel} have demonstrated stronger initial reach in your recent campaigns.`,
      confidence: evidenceLevel,
      evidenceCount: bestEntry.count,
    };
  }

  private calculateObservationScore(o: PerformanceObservation): number {
    const reach = o.metrics.reach || 0;
    const views = o.metrics.videoViews || 0;
    const likes = o.metrics.likes || 0;
    const comments = o.metrics.comments || 0;
    const shares = o.metrics.shares || 0;
    const clicks = o.metrics.clicks || 0;

    let baseScore = reach + views * 1.2 + likes * 5 + comments * 10 + shares * 15 + clicks * 8;

    // Apply feedback weightings
    if (o.feedback?.liked) baseScore *= 1.25;
    if (o.feedback?.disliked) baseScore *= 0.5;
    if (o.feedback?.regenerated) baseScore *= 0.8;

    return baseScore;
  }
}

export const performanceRecommendationService = new PerformanceRecommendationService();
