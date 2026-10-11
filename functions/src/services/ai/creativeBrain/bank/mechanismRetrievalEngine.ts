/**
 * Phase 28 — Mechanism Retrieval & Ranking Engine
 * Mitra by BrainWise
 */

import type {
  CreativeBankQuery,
  CreativeBankRetrievalResult,
  CreativeMechanism,
  MechanismComposition,
  MechanismScoreDetail
} from './bank.types';
import { getAllMechanisms, getMechanismsByIndustry } from './mechanisms';

// Memory/Fatigue cache for business mechanism usage history
const businessUsageHistory: Map<string, { mechanismId: string; usedAt: number }[]> = new Map();

/**
 * Record that a business used a specific mechanism
 */
export function recordMechanismUsage(businessId: string, mechanismId: string): void {
  if (!businessId) return;
  const history = businessUsageHistory.get(businessId) || [];
  history.push({ mechanismId, usedAt: Date.now() });
  businessUsageHistory.set(businessId, history);
}

/**
 * Retrieve business mechanism usage history
 */
export function getBusinessMechanismUsage(businessId: string): { mechanismId: string; usedAt: number }[] {
  return businessUsageHistory.get(businessId) || [];
}

/**
 * Main Mechanism Retrieval Engine
 */
export class MechanismRetrievalEngine {
  /**
   * Retrieve and rank mechanisms based on campaign context, industry packs, and Phase 22 explore/exploit ratio
   */
  public static retrieve(query: CreativeBankQuery): CreativeBankRetrievalResult {
    const candidates = getMechanismsByIndustry(query.industry || 'all');
    const excludedSet = new Set((query.excludeMechanismIds || []).map((id) => id.toLowerCase()));

    const filtered = candidates.filter((m) => !excludedSet.has(m.id.toLowerCase()));

    if (filtered.length === 0) {
      const fallback = getAllMechanisms().filter((m) => !excludedSet.has(m.id.toLowerCase()));
      const fallbackSelected = fallback.slice(0, query.limit || 5);
      const fallbackComposition = this.composeMechanisms(fallbackSelected);
      return {
        mechanisms: fallbackSelected,
        composition: fallbackComposition,
        scores: fallbackSelected.map((m) => ({
          mechanismId: m.id,
          totalScore: 10,
          industryFit: 10,
          situationFit: 0,
          objectiveFit: 0,
          fatiguePenalty: 0,
          noveltyBonus: 0,
          isExploreChoice: true
        })),
        explored: true
      };
    }

    const usage = query.businessId ? getBusinessMechanismUsage(query.businessId) : [];
    const scores: MechanismScoreDetail[] = filtered.map((m) =>
      this.scoreMechanism(m, query, usage)
    );

    // Sort by totalScore descending
    scores.sort((a, b) => b.totalScore - a.totalScore);

    const limit = query.limit || 5;
    const exploreRatio = query.exploreRatio !== undefined ? query.exploreRatio : 0.3;

    const exploitCount = Math.max(1, Math.floor(limit * (1 - exploreRatio)));
    const exploreCount = limit - exploitCount;

    const exploitCandidates = scores.slice(0, exploitCount);
    const remainingScores = scores.slice(exploitCount);

    // Pick top explore candidates (higher novelty bonus or distinct categories)
    const exploreCandidates = remainingScores
      .map((s) => ({ ...s, isExploreChoice: true }))
      .slice(0, exploreCount);

    const finalScores = [...exploitCandidates, ...exploreCandidates];
    const mechanismMap = new Map(filtered.map((m) => [m.id, m]));

    const selectedMechanisms = finalScores
      .map((s) => mechanismMap.get(s.mechanismId))
      .filter((m): m is CreativeMechanism => m !== undefined);

    const composition = this.composeMechanisms(selectedMechanisms);

    return {
      mechanisms: selectedMechanisms,
      composition,
      scores: finalScores,
      explored: exploreCandidates.length > 0
    };
  }

  /**
   * Score an individual mechanism against query requirements and usage history
   */
  private static scoreMechanism(
    mechanism: CreativeMechanism,
    query: CreativeBankQuery,
    usageHistory: { mechanismId: string; usedAt: number }[]
  ): MechanismScoreDetail {
    const normIndustry = (query.industry || '').toLowerCase();
    const normSub = (query.subIndustry || '').toLowerCase();
    const normSit = (query.audienceSituation || '').toLowerCase();
    const normOffer = (query.offerRole || '').toLowerCase();
    const normObj = (query.objective || '').toLowerCase();

    // 1. Industry Fit (max 30)
    let industryFit = 15;
    if (mechanism.applicableIndustries.includes(normIndustry)) {
      industryFit = 30;
    }
    if (
      normSub &&
      mechanism.compatibleSubIndustries &&
      mechanism.compatibleSubIndustries.includes(normSub)
    ) {
      industryFit += 5;
    }

    // 2. Situation Fit (max 25)
    let situationFit = 10;
    if (
      normSit &&
      mechanism.compatibleAudienceSituations.some(
        (s) => s.toLowerCase() === normSit || normSit.includes(s.toLowerCase())
      )
    ) {
      situationFit = 25;
    }

    // 3. Objective & Category Fit (max 25)
    let objectiveFit = 10;
    if (normObj) {
      if (
        normObj.includes('attention') && mechanism.category.includes('ATTENTION') ||
        normObj.includes('awareness') && mechanism.category.includes('STORY') ||
        normObj.includes('conversion') && (mechanism.category.includes('VALUE') || mechanism.category.includes('PROOF')) ||
        normObj.includes('loyalty') && (mechanism.category.includes('LOCAL') || mechanism.category.includes('EMOTION'))
      ) {
        objectiveFit = 25;
      }
    }

    // 4. Offer Fit (max 10)
    if (
      normOffer &&
      mechanism.compatibleOfferRoles.some((o) => o.toLowerCase() === normOffer)
    ) {
      objectiveFit += 5;
    }

    // 5. Fatigue Penalty & Novelty Bonus
    const usageCount = usageHistory.filter(
      (u) => u.mechanismId.toLowerCase() === mechanism.id.toLowerCase()
    ).length;

    let fatiguePenalty = 0;
    if (usageCount > 0) {
      fatiguePenalty = Math.min(25, usageCount * 10);
    }

    const noveltyBonus = usageCount === 0 ? 10 : 0;

    const totalScore = Math.max(
      0,
      industryFit + situationFit + objectiveFit - fatiguePenalty + noveltyBonus
    );

    return {
      mechanismId: mechanism.id,
      totalScore,
      industryFit,
      situationFit,
      objectiveFit,
      fatiguePenalty,
      noveltyBonus,
      isExploreChoice: false
    };
  }

  /**
   * Compose 1 Primary + 0–2 Secondary mechanisms without semantic duplicate overlap
   */
  public static composeMechanisms(mechanisms: CreativeMechanism[]): MechanismComposition {
    if (mechanisms.length === 0) {
      throw new Error('[MechanismRetrievalEngine] Cannot compose from empty mechanism list');
    }

    const primary = mechanisms[0];
    const secondaryMechanisms: CreativeMechanism[] = [];

    const primaryCategories = new Set(primary.category);

    for (let i = 1; i < mechanisms.length; i++) {
      if (secondaryMechanisms.length >= 2) break;

      const candidate = mechanisms[i];

      // Check incompatibility rules if defined
      if (
        primary.compatibilityRules?.incompatibleMechanismIds?.includes(candidate.id) ||
        candidate.compatibilityRules?.incompatibleMechanismIds?.includes(primary.id)
      ) {
        continue;
      }

      // Semantic deduplication: ensure candidate does not share any category with primary or existing secondaries
      const sharesCategory = candidate.category.some(
        (cat) => primaryCategories.has(cat) || secondaryMechanisms.some((s) => s.category.includes(cat))
      );

      if (!sharesCategory) {
        secondaryMechanisms.push(candidate);
      }
    }

    const secondaryNames = secondaryMechanisms.map((s) => s.name).join(' & ');
    const compositionRationale = secondaryMechanisms.length > 0
      ? `Primary mechanism "${primary.name}" supported by complementary secondary mechanisms (${secondaryNames}) for maximum creative dimension.`
      : `Primary mechanism "${primary.name}" selected as standalone creative anchor.`;

    return {
      primaryMechanism: primary,
      secondaryMechanisms,
      compositionRationale
    };
  }
}
