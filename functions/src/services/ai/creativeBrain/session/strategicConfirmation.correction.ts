import type { CorrectionDimension, CorrectionMateriality } from './strategicConfirmation.types';

/**
 * Deterministic triage of a "Change something" correction. No LLM: the user already names the dimension, so
 * this only decides (a) is it material, (b) which strategic fields it touches, and (c) does it contradict an
 * authoritative Business Brain fact (in which case it is NOT campaign context and must not be absorbed).
 */

const AFFECTED_BY_DIMENSION: Readonly<Record<CorrectionDimension, readonly string[]>> = {
  audience: ['audience', 'customerTension', 'emotionalTerritory', 'creativeOpportunity', 'strategicRecommendation'],
  objective: ['marketingObjective', 'creativeOpportunity', 'strategicRecommendation'],
  offer: ['offer', 'creativeOpportunity', 'strategicRecommendation'],
  direction: ['creativeOpportunity', 'emotionalTerritory', 'strategicRecommendation'],
  wording: [],
  other: ['creativeOpportunity', 'strategicRecommendation'],
};

export interface CorrectionTriage {
  readonly materiality: CorrectionMateriality;
  readonly affectedDimensions: readonly string[];
  readonly businessFactConflict?: {
    readonly kind: 'PRICE';
    readonly claimedValues: readonly number[];
    readonly authoritativeValues: readonly number[];
  };
}

export interface CorrectionContext {
  /** Authoritative prices from Business Brain / campaign intent. Never modified here. */
  readonly knownPrices?: readonly number[];
}

const PRICE_CONTEXT = /(₹|rs\.?|inr|rupees?|price|prices|priced|cost|costs|charge|charges)/i;

function extractAmounts(text: string): number[] {
  const out: number[] = [];
  for (const match of text.matchAll(/(\d[\d,]*(?:\.\d+)?)/g)) {
    const value = Number((match[1] ?? '').replace(/,/g, ''));
    if (Number.isFinite(value) && value > 0) out.push(value);
  }
  return out;
}

export function triageCorrection(
  dimension: CorrectionDimension,
  text: string,
  context: CorrectionContext = {}
): CorrectionTriage {
  const affectedDimensions = AFFECTED_BY_DIMENSION[dimension];
  const materiality: CorrectionMateriality = dimension === 'wording' ? 'COSMETIC' : 'MATERIAL';

  // A price statement that the authority does not back is a factual claim, not campaign intent.
  if (PRICE_CONTEXT.test(text)) {
    const claimed = extractAmounts(text);
    const known = context.knownPrices ?? [];
    const unbacked = claimed.filter((value) => !known.includes(value));
    if (claimed.length > 0 && unbacked.length > 0) {
      return {
        materiality,
        affectedDimensions,
        businessFactConflict: { kind: 'PRICE', claimedValues: unbacked, authoritativeValues: known },
      };
    }
  }

  return { materiality, affectedDimensions };
}
