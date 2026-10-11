/**
 * PHASE 24 — Confidence Contradiction Resolver
 * Detects conflicts between current campaign user statements and historical Business Brain context,
 * applies the Current Campaign Wins rule, and ensures Truth Engine separation.
 */

import type {
  CreativeConfidenceDimension,
  ConfidenceEvidence,
} from './confidence.types';

export interface ContradictionDetectionResult {
  hasContradiction: boolean;
  dimension: CreativeConfidenceDimension;
  historicalValue?: string;
  currentValue: string;
  resolutionStrategy: 'CURRENT_CAMPAIGN_OVERRIDE' | 'REQUIRES_USER_CLARIFICATION';
  explanation: string;
}

export class ConfidenceContradictions {
  /**
   * Evaluates whether a new piece of evidence contradicts existing evidence.
   */
  public static detectContradiction(
    dimension: CreativeConfidenceDimension,
    existingEvidence: ConfidenceEvidence[],
    newContent?: string
  ): ContradictionDetectionResult | null {
    if (!newContent || existingEvidence.length === 0) {
      return null;
    }

    const lowerNew = newContent.toLowerCase().trim();

    for (const ev of existingEvidence) {
      const lowerExplanation = ev.explanation.toLowerCase();
      // Check for explicit conflicting audience/product/offer keywords
      if (
        ev.source === 'BUSINESS_BRAIN' &&
        this.isConflictingText(dimension, lowerExplanation, lowerNew)
      ) {
        return {
          hasContradiction: true,
          dimension,
          historicalValue: ev.explanation,
          currentValue: newContent,
          resolutionStrategy: 'CURRENT_CAMPAIGN_OVERRIDE',
          explanation: `Current campaign statement ("${newContent}") overrides historical Business Brain default for this campaign context.`,
        };
      }
    }

    return null;
  }

  private static isConflictingText(
    dimension: CreativeConfidenceDimension,
    historicalText: string,
    currentText: string
  ): boolean {
    if (dimension === 'AUDIENCE') {
      if (historicalText.includes('famili') && (currentText.includes('student') || currentText.includes('singles'))) {
        return true;
      }
      if (historicalText.includes('corporate') && currentText.includes('teen')) {
        return true;
      }
    }
    if (dimension === 'OFFER') {
      const priceRegex = /₹?\d+/g;
      const histPrices = historicalText.match(priceRegex);
      const currPrices = currentText.match(priceRegex);
      if (histPrices && currPrices && histPrices[0] !== currPrices[0]) {
        return true;
      }
    }
    return false;
  }
}
