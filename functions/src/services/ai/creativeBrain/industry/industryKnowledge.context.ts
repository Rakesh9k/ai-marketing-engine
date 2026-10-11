import type {
  IndustryCreativeContext,
  CustomerDimensionKnowledge,
  CreativeTerritoryKnowledge,
  IndustryQuestionCandidate,
} from './industryKnowledge.types';

export class IndustryContextHelper {
  /**
   * Filter customer dimensions relevant to a specific objective or threshold
   */
  public static getHighImpactCustomerDimensions(
    context: IndustryCreativeContext,
    threshold: number = 75
  ): readonly CustomerDimensionKnowledge[] {
    return context.activeCustomerDimensions.filter((d) => d.decisionImpact >= threshold);
  }

  /**
   * Filter creative territories matching given family or active objective
   */
  public static getMatchingTerritories(
    context: IndustryCreativeContext,
    family?: string
  ): readonly CreativeTerritoryKnowledge[] {
    if (!family) return context.relevantTerritories;
    return context.relevantTerritories.filter((t) => t.family === family);
  }

  /**
   * Retrieve question candidates matching a specific requirement key or category
   */
  public static getQuestionCandidates(
    context: IndustryCreativeContext,
    keyOrCategory: string
  ): readonly IndustryQuestionCandidate[] {
    const key = keyOrCategory.toLowerCase();
    return context.questionCandidates.filter(
      (q) => q.dimensionKey.toLowerCase() === key || q.category.toLowerCase() === key
    );
  }
}
