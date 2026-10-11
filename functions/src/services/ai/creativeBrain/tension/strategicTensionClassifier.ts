/**
 * PHASE 26 — Strategic Tension Classifier
 * Classifies conflicts into TRUTH_CONSTRAINT (hard truth block), BRAND_CONSTRAINT_CONFLICT (hard brand block),
 * STRATEGIC_TENSION (surface trade-off to user), or CREATIVE_PREFERENCE_DIFFERENCE (silent adaptation).
 */

import type { ConflictCategory, StrategicTensionDimension } from './strategicTension.types';

export interface RawConflictPayload {
  dimension: StrategicTensionDimension;
  userStatement: string;
  businessContextStatement: string;
  isTruthClaimUnverified?: boolean;
  isExplicitBrandProhibition?: boolean;
}

export class StrategicTensionClassifier {
  /**
   * Classifies conflict payload into authoritative ConflictCategory.
   */
  public static classifyConflict(payload: RawConflictPayload): ConflictCategory {
    // 1. Truth Constraint Always Wins Hard Block
    if (payload.isTruthClaimUnverified || this.isUnverifiedTruthClaim(payload.userStatement)) {
      return 'TRUTH_CONSTRAINT';
    }

    // 2. Hard Brand Constraint Conflict
    if (payload.isExplicitBrandProhibition || this.isExplicitBrandProhibition(payload.businessContextStatement, payload.userStatement)) {
      return 'BRAND_CONSTRAINT_CONFLICT';
    }

    // 3. Minor preference difference
    if (this.isMinorPreferenceDifference(payload.userStatement, payload.businessContextStatement)) {
      return 'CREATIVE_PREFERENCE_DIFFERENCE';
    }

    // 4. Strategic Tension (Both options are legitimate strategic directions)
    return 'STRATEGIC_TENSION';
  }

  private static isUnverifiedTruthClaim(text: string): boolean {
    const lower = text.toLowerCase();
    return lower.includes('#1') || lower.includes('best in town') || lower.includes('guaranteed 100%') || lower.includes('cheapest in state');
  }

  private static isExplicitBrandProhibition(bizText: string, userText: string): boolean {
    const bizLower = bizText.toLowerCase();
    const userLower = userText.toLowerCase();

    if (bizLower.includes('never advertise discounts') || bizLower.includes('no discounts allowed')) {
      if (userLower.includes('discount') || userLower.includes('off') || userLower.includes('deal')) {
        return true;
      }
    }
    return false;
  }

  private static isMinorPreferenceDifference(userText: string, bizText: string): boolean {
    const u = userText.toLowerCase();
    const b = bizText.toLowerCase();

    // Check if both are just slight tone variations (e.g. warm vs friendly)
    if ((u.includes('warm') || u.includes('friendly')) && (b.includes('warm') || b.includes('friendly'))) {
      return true;
    }
    return false;
  }
}
