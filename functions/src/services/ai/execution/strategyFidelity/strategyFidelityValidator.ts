/**
 * PHASE 17 — Strategy Fidelity Validator
 * Evaluates execution engine outputs against approved Creative Blueprints,
 * calculates the Strategy Fidelity Score (0–100), and detects Strategy Drift / Offer Dominance.
 */

import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import type {
  ExecutionCandidateOutput,
  OfferDominancePolicy,
  StrategyDriftResult,
  StrategyFidelityResult,
  StrategyFidelityScore,
  StrategyFidelityScoreBreakdown,
  StrategyLock,
  StrategyManifest,
} from './strategyFidelity.types';

export class StrategyFidelityValidator {
  /**
   * Default Offer Dominance Policy for non-primary-hook offers.
   */
  public readonly defaultOfferPolicy: OfferDominancePolicy = {
    maxOfferProminenceScore: 60,
    priceShockAllowed: false,
    rules: [
      'Offer must not occupy more than 30% of visual space.',
      'Headline must reflect core concept, not price discount.',
      'Supporting offer should act as secondary conversion trigger.',
    ],
  };

  /**
   * Validates execution output against CreativeBlueprint, StrategyLock, and StrategyManifest.
   */
  public evaluateFidelity(
    blueprint: CreativeBlueprint,
    lock: StrategyLock,
    manifest: StrategyManifest,
    candidate: ExecutionCandidateOutput
  ): StrategyFidelityResult {
    // 1. Check Strategy Drift & Offer Dominance
    const drift = this.detectDrift(blueprint, lock, candidate);

    // 2. Compute Score Breakdown
    const breakdown = this.computeScoreBreakdown(blueprint, candidate, drift);
    const overallScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    const passesThreshold = overallScore >= 80 && !drift.offerDominanceDetected;

    const score: StrategyFidelityScore = {
      overallScore,
      breakdown,
      passesThreshold,
    };

    const isFitted = passesThreshold && !drift.hasDrift;
    const approved = isFitted;

    let reason: string | undefined;
    if (!approved) {
      if (drift.offerDominanceDetected) {
        reason = 'Rejected due to Offer Dominance Drift: Execution converted supporting offer into primary price shock.';
      } else if (drift.hasDrift) {
        reason = `Rejected due to Strategy Drift (${drift.violations.join('; ')})`;
      } else if (overallScore < 80) {
        reason = `Rejected due to low Strategy Fidelity Score (${overallScore}/100, minimum threshold is 80).`;
      }
    }

    return {
      isFitted,
      score,
      drift,
      manifest,
      approved,
      reason,
    };
  }

  /**
   * Detects Strategy Drift and Offer Dominance.
   */
  private detectDrift(
    blueprint: CreativeBlueprint,
    lock: StrategyLock,
    candidate: ExecutionCandidateOutput
  ): StrategyDriftResult {
    const driftFactors: string[] = [];
    const violations: string[] = [];
    let offerDominanceDetected = false;

    // 1. Offer Dominance Check
    const offerRole = blueprint.offer?.strategicRole || 'none';
    const candidateProminence = candidate.offerProminence ?? 50;

    if (offerRole !== 'primary_hook') {
      if (candidateProminence > this.defaultOfferPolicy.maxOfferProminenceScore) {
        offerDominanceDetected = true;
        driftFactors.push('OFFER_DOMINANCE');
        violations.push(
          `Offer Dominance Drift: Candidate offer prominence score (${candidateProminence}) exceeds limit (${this.defaultOfferPolicy.maxOfferProminenceScore}) for role '${offerRole}'.`
        );
      }

      // Check if headline is purely a price shock when offer is supporting
      const headline = (candidate.headline || '').toLowerCase();
      const priceShockKeywords = ['₹', 'off', 'discount', 'free', 'save', 'price', 'deal', 'offer'];
      const isPriceShockHeadline = priceShockKeywords.some((kw) => headline.includes(kw));

      if (isPriceShockHeadline && candidateProminence > 50) {
        offerDominanceDetected = true;
        driftFactors.push('PRICE_SHOCK_HEADLINE');
        violations.push(
          `Offer Dominance Drift: Candidate headline relies on price shock ("${candidate.headline}") when offer strategic role is '${offerRole}'.`
        );
      }
    }

    // 2. Tone Shift Check
    if (blueprint.tone?.primary && candidate.tone) {
      const approvedTone = blueprint.tone.primary.toLowerCase();
      const candidateTone = candidate.tone.toLowerCase();

      if (
        (approvedTone.includes('warm') || approvedTone.includes('playful')) &&
        (candidateTone.includes('aggressive') || candidateTone.includes('hard_sell'))
      ) {
        driftFactors.push('TONE_DRIFT');
        violations.push(
          `Tone Drift: Approved tone '${blueprint.tone.primary}' violated by candidate tone '${candidate.tone}'.`
        );
      }
    }

    // 3. Message Hierarchy Check
    if (blueprint.messageHierarchy?.primaryMessage && candidate.headline) {
      const primaryMsg = blueprint.messageHierarchy.primaryMessage.toLowerCase();
      const headline = candidate.headline.toLowerCase();

      // Simple keyword overlap check to ensure headline isn't completely unrelated
      const primaryWords = primaryMsg.split(/\s+/).filter((w) => w.length > 3);
      const headlineWords = new Set(headline.split(/\s+/));
      const hasOverlap = primaryWords.some((w) => headlineWords.has(w));

      if (!hasOverlap && primaryWords.length > 0 && candidateProminence > 70) {
        driftFactors.push('HIERARCHY_REVERSAL');
        violations.push('Message Hierarchy Drift: Candidate headline deviates significantly from primary strategic message.');
      }
    }

    const hasDrift = driftFactors.length > 0 || violations.length > 0;

    return {
      hasDrift,
      driftScore: hasDrift ? Math.min(100, violations.length * 30) : 0,
      driftFactors,
      violations,
      offerDominanceDetected,
    };
  }

  /**
   * Computes the 9-dimensional Strategy Fidelity Score breakdown (100 Max).
   */
  private computeScoreBreakdown(
    blueprint: CreativeBlueprint,
    candidate: ExecutionCandidateOutput,
    drift: StrategyDriftResult
  ): StrategyFidelityScoreBreakdown {
    // 1. Core Concept (Max 20)
    let coreConcept = 20;
    if (drift.driftFactors.includes('CONCEPT_REPLACEMENT')) {
      coreConcept = 0;
    } else if (candidate.headline && blueprint.coreConcept) {
      const conceptName = blueprint.coreConcept.name.toLowerCase();
      const idea = blueprint.coreConcept.oneLineIdea.toLowerCase();
      const candHeadline = candidate.headline.toLowerCase();

      if (!candHeadline.includes(conceptName) && !candHeadline.includes(idea.slice(0, 10))) {
        coreConcept = 15; // Small penalty for indirect phrasing, still strong if concept intact
      }
    }

    // 2. Creative Mechanism (Max 15)
    let creativeMechanism = 15;
    if (blueprint.creativeMechanism?.primaryMechanism && candidate.copy) {
      const mech = blueprint.creativeMechanism.primaryMechanism.toLowerCase();
      const candCopy = candidate.copy.toLowerCase();
      if (!candCopy.includes(mech.slice(0, 5))) {
        creativeMechanism = 12;
      }
    }

    // 3. Audience Tension (Max 15)
    let audienceTension = 15;
    if (blueprint.audience?.audienceTension) {
      if (candidate.copy || candidate.headline) {
        audienceTension = 14;
      }
    }

    // 4. Message Hierarchy (Max 15)
    let messageHierarchy = 15;
    if (drift.driftFactors.includes('HIERARCHY_REVERSAL')) {
      messageHierarchy = 5;
    }

    // 5. Emotional Direction (Max 10)
    let emotionalDirection = 10;
    if (drift.driftFactors.includes('EMOTIONAL_DRIFT')) {
      emotionalDirection = 2;
    }

    // 6. Visual Direction (Max 10)
    let visualDirection = 10;
    if (blueprint.visualDirection?.visualConcept && candidate.visualConcept) {
      const targetVisual = blueprint.visualDirection.visualConcept.toLowerCase();
      const candVisual = candidate.visualConcept.toLowerCase();
      if (!candVisual.includes(targetVisual.slice(0, 8))) {
        visualDirection = 8;
      }
    }

    // 7. Offer Role (Max 5)
    let offerRole = 5;
    if (drift.offerDominanceDetected) {
      offerRole = 0;
    }

    // 8. Tone (Max 5)
    let tone = 5;
    if (drift.driftFactors.includes('TONE_DRIFT')) {
      tone = 1;
    }

    // 9. CTA Intent (Max 5)
    let ctaIntent = 5;
    if (blueprint.cta?.action && candidate.cta) {
      if (candidate.cta.toLowerCase() !== blueprint.cta.action.toLowerCase()) {
        ctaIntent = 4;
      }
    }

    return {
      coreConcept,
      creativeMechanism,
      audienceTension,
      messageHierarchy,
      emotionalDirection,
      visualDirection,
      offerRole,
      tone,
      ctaIntent,
    };
  }
}
