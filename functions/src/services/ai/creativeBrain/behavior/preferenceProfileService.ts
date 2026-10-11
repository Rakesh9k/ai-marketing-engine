/**
 * PHASE 22 — Creative Preference Profile Service
 * Aggregates evaluated preference signals into a clean, business-level CreativePreferenceProfile
 * with 1-5 star ratings, scores (0-100), and evidence confidence metrics.
 */

import type { CreativePreferenceProfile, PreferenceDimensionRating } from './behavior.types';
import type { EvaluatedPreferenceSignal } from './preferenceEngine';

export class PreferenceProfileService {
  /**
   * Constructs a CreativePreferenceProfile for a business from evaluated signals.
   */
  public buildProfile(businessId: string, signals: EvaluatedPreferenceSignal[]): CreativePreferenceProfile {
    const preferredHooks: PreferenceDimensionRating[] = [];
    const preferredMechanisms: PreferenceDimensionRating[] = [];
    const preferredTones: PreferenceDimensionRating[] = [];
    const preferredVisualStyles: PreferenceDimensionRating[] = [];
    const preferredStoryStructures: PreferenceDimensionRating[] = [];
    const preferredOfferRoles: PreferenceDimensionRating[] = [];
    const preferredCTAs: PreferenceDimensionRating[] = [];
    const disfavoredPatterns: PreferenceDimensionRating[] = [];

    signals.forEach((sig) => {
      const isPositive = sig.positiveEvidence > sig.negativeEvidence || sig.source === 'EXPLICIT';
      const name = isPositive ? sig.preferredValue : sig.disfavoredValue || 'Unknown';
      if (!name) return;

      const score = Math.round(sig.confidence * 100);
      const ratingStars = Math.min(5, Math.max(1, Math.round(sig.confidence * 5)));
      const rating: PreferenceDimensionRating = {
        name,
        score,
        ratingStars,
        confidence: sig.confidence,
        evidenceCount: sig.positiveEvidence + sig.negativeEvidence,
      };

      if (!isPositive) {
        disfavoredPatterns.push(rating);
        return;
      }

      switch (sig.dimension.toUpperCase()) {
        case 'HOOK':
          preferredHooks.push(rating);
          break;
        case 'MECHANISM':
          preferredMechanisms.push(rating);
          break;
        case 'TONE':
        case 'COPY':
          preferredTones.push(rating);
          break;
        case 'VISUAL':
        case 'LAYOUT':
          preferredVisualStyles.push(rating);
          break;
        case 'STORY':
          preferredStoryStructures.push(rating);
          break;
        case 'OFFER':
        case 'OFFER_ROLE':
          preferredOfferRoles.push(rating);
          break;
        case 'CTA':
          preferredCTAs.push(rating);
          break;
        default:
          preferredHooks.push(rating);
          break;
      }
    });

    const overallConfidence =
      signals.length > 0
        ? Math.round(
            (signals.reduce((acc, curr) => acc + curr.confidence, 0) / signals.length) * 100
          ) / 100
        : 0;

    return {
      businessId,
      preferredHooks: this.sortByScore(preferredHooks),
      preferredMechanisms: this.sortByScore(preferredMechanisms),
      preferredTones: this.sortByScore(preferredTones),
      preferredVisualStyles: this.sortByScore(preferredVisualStyles),
      preferredStoryStructures: this.sortByScore(preferredStoryStructures),
      preferredOfferRoles: this.sortByScore(preferredOfferRoles),
      preferredCTAs: this.sortByScore(preferredCTAs),
      disfavoredPatterns: this.sortByScore(disfavoredPatterns),
      overallConfidence,
      updatedAt: new Date().toISOString(),
    };
  }

  private sortByScore(ratings: PreferenceDimensionRating[]): PreferenceDimensionRating[] {
    return [...ratings].sort((a, b) => b.score - a.score);
  }
}
