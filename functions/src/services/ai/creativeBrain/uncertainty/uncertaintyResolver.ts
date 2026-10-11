/**
 * PHASE 25 — Uncertainty Resolver
 * Selects discovery strategies, formulates concrete human prompts, grounded choice cards,
 * manages attempt budgets, and handles user delegation ("Let Mitra decide").
 */

import type { CreativeConfidenceDimension } from '../confidence/confidence.types';
import type {
  UncertaintyResolutionStrategy,
  UncertaintyResolutionResult,
  UncertaintyResolutionOption,
  CreativeCandidate,
} from './uncertainty.types';
import type { BusinessBrainContextPayload } from './candidateGenerator';
import { CandidateGenerator } from './candidateGenerator';

export class UncertaintyResolver {
  public static readonly MAX_UNCERTAINTY_RESOLUTION_ATTEMPTS = 3;
  private candidateGen: CandidateGenerator = new CandidateGenerator();

  /**
   * Resolves a user's "I'm not sure" response by generating grounded candidates and a simplified prompt.
   */
  public resolveUncertainty(
    sessionId: string,
    campaignId: string,
    dimension: CreativeConfidenceDimension,
    attemptNumber: number,
    context: BusinessBrainContextPayload
  ): UncertaintyResolutionResult {
    const attemptsRemaining = Math.max(0, UncertaintyResolver.MAX_UNCERTAINTY_RESOLUTION_ATTEMPTS - attemptNumber);

    // If max attempts reached, fallback to Mitra Recommendation / Provisional Decision
    if (attemptNumber >= UncertaintyResolver.MAX_UNCERTAINTY_RESOLUTION_ATTEMPTS) {
      return this.resolveWithMitraRecommendation(sessionId, campaignId, dimension, context);
    }

    const strategy = this.selectStrategyForDimension(dimension, attemptNumber);
    const candidates = this.candidateGen.generateCandidates(dimension, context);
    const options: UncertaintyResolutionOption[] = candidates.map((cand) => ({
      id: cand.id,
      label: cand.label,
      description: cand.description,
      candidatePayload: cand,
    }));

    // Add "None of these" option
    options.push({
      id: 'opt_none_of_these',
      label: 'None of these',
      description: "Let's approach it from another angle.",
      isNoneOfThese: true,
    });

    // Add "Let Mitra decide" delegation option
    options.push({
      id: 'opt_delegate_to_mitra',
      label: 'Let Mitra decide',
      description: 'Mitra will make a grounded starting recommendation.',
      isDelegated: true,
    });

    const promptDetails = this.formatStrategyPrompt(strategy, dimension, context, candidates);

    return {
      sessionId,
      campaignId,
      dimension,
      strategy,
      acknowledgementMessage: "That's okay. Let's work it out together.",
      promptText: promptDetails.text,
      options,
      candidates,
      attemptsRemaining,
      status: 'UNRESOLVED',
      provisionalRecommendation: candidates[0],
    };
  }

  /**
   * Handles user delegation when "Let Mitra decide" is selected.
   */
  public handleUserDelegation(
    sessionId: string,
    campaignId: string,
    dimension: CreativeConfidenceDimension,
    context: BusinessBrainContextPayload
  ): UncertaintyResolutionResult {
    const candidates = this.candidateGen.generateCandidates(dimension, context);
    const topCandidate = candidates[0] || {
      id: 'cand_provisional_default',
      dimension,
      value: 'Grounded Default Direction',
      label: 'Grounded Default Direction',
      source: 'BUSINESS_BRAIN' as const,
      confidence: 0.75,
      evidenceIds: [],
      requiresConfirmation: false,
    };

    const bizName = context.businessName || 'your business';

    return {
      sessionId,
      campaignId,
      dimension,
      strategy: 'MITRA_RECOMMENDS',
      acknowledgementMessage: `Got it. I'll make a grounded recommendation for ${bizName}.`,
      promptText: `I'll start with "${topCandidate.label}" as a working direction for this campaign. You can adjust this anytime later.`,
      options: [
        {
          id: 'opt_accept_delegation',
          label: `Continue with ${topCandidate.label}`,
          description: 'Proceed with Mitra\'s recommendation.',
        },
        {
          id: 'opt_change_delegation',
          label: 'Choose a different direction',
          description: 'Pick another option.',
        },
      ],
      candidates: [topCandidate],
      attemptsRemaining: 0,
      status: 'USER_DELEGATED',
      provisionalRecommendation: topCandidate,
    };
  }

  /**
   * Handles "None of these" selection by reframing the cognitive question frame.
   */
  public handleNoneOfThese(
    sessionId: string,
    campaignId: string,
    dimension: CreativeConfidenceDimension,
    context: BusinessBrainContextPayload
  ): UncertaintyResolutionResult {
    const bizName = context.businessName || 'your business';

    let text = `Got it. Let's look at ${dimension.toLowerCase()} from a different angle.`;
    if (dimension === 'CUSTOMER_INSIGHT') {
      text = `Think about the last customer who left ${bizName} especially happy. What do you think mattered most to them?`;
    } else if (dimension === 'DIFFERENTIATOR') {
      text = `What do customers usually compliment ${bizName} on when they visit?`;
    }

    const fallbackCandidates: CreativeCandidate[] = [
      {
        id: 'cand_fallback_1',
        dimension,
        value: 'Personal Warmth & Hospitality',
        label: 'Personal Warmth & Hospitality',
        source: 'CREATIVE_MEMORY',
        confidence: 0.70,
        evidenceIds: [],
        requiresConfirmation: true,
      },
      {
        id: 'cand_fallback_2',
        dimension,
        value: 'Consistent Dependability',
        label: 'Consistent Dependability',
        source: 'CREATIVE_MEMORY',
        confidence: 0.70,
        evidenceIds: [],
        requiresConfirmation: true,
      },
    ];

    const options: UncertaintyResolutionOption[] = fallbackCandidates.map((c) => ({
      id: c.id,
      label: c.label,
      candidatePayload: c,
    }));

    options.push({
      id: 'opt_delegate_to_mitra',
      label: 'Let Mitra decide',
      isDelegated: true,
    });

    return {
      sessionId,
      campaignId,
      dimension,
      strategy: 'ASK_CUSTOMER_STORY',
      acknowledgementMessage: "Got it. Let's approach it differently.",
      promptText: text,
      options,
      candidates: fallbackCandidates,
      attemptsRemaining: 1,
      status: 'PARTIALLY_RESOLVED',
      provisionalRecommendation: fallbackCandidates[0],
    };
  }

  // --- Private Helper Methods ---

  private selectStrategyForDimension(
    dimension: CreativeConfidenceDimension,
    attemptNumber: number
  ): UncertaintyResolutionStrategy {
    if (attemptNumber >= 2) {
      return 'MITRA_RECOMMENDS';
    }

    switch (dimension) {
      case 'AUDIENCE':
        return 'RETRIEVE_AND_CONFIRM';
      case 'CUSTOMER_INSIGHT':
        return 'OFFER_GROUNDED_CHOICES';
      case 'DIFFERENTIATOR':
        return 'ASK_PROOF_QUESTION';
      default:
        return 'OFFER_GROUNDED_CHOICES';
    }
  }

  private formatStrategyPrompt(
    strategy: UncertaintyResolutionStrategy,
    dimension: CreativeConfidenceDimension,
    context: BusinessBrainContextPayload,
    candidates: CreativeCandidate[]
  ): { text: string } {
    const bizName = context.businessName || 'your business';

    if (strategy === 'RETRIEVE_AND_CONFIRM' && candidates.length > 0) {
      return {
        text: `From what I know about ${bizName}, "${candidates[0].label}" seems like the strongest audience fit. Which group sounds closest for this campaign?`,
      };
    }

    if (strategy === 'ASK_PROOF_QUESTION') {
      return {
        text: `Let's make it easier: What do customers usually compliment ${bizName} on most?`,
      };
    }

    return {
      text: `From what I know about ${bizName}, here are a few likely reasons. Which one sounds closest?`,
    };
  }

  private resolveWithMitraRecommendation(
    sessionId: string,
    campaignId: string,
    dimension: CreativeConfidenceDimension,
    context: BusinessBrainContextPayload
  ): UncertaintyResolutionResult {
    const candidates = this.candidateGen.generateCandidates(dimension, context);
    const rec = candidates[0] || {
      id: 'cand_rec_default',
      dimension,
      value: 'Grounded Recommendation',
      label: 'Grounded Recommendation',
      source: 'BUSINESS_BRAIN' as const,
      confidence: 0.75,
      evidenceIds: [],
      requiresConfirmation: false,
    };

    return {
      sessionId,
      campaignId,
      dimension,
      strategy: 'MITRA_RECOMMENDS',
      acknowledgementMessage: "That's completely fine.",
      promptText: `I have enough evidence to make a starting recommendation. I'll use "${rec.label}" as the working direction, and you can change it anytime.`,
      options: [
        {
          id: 'opt_confirm_rec',
          label: `Proceed with ${rec.label}`,
        },
      ],
      candidates: [rec],
      attemptsRemaining: 0,
      status: 'PROVISIONAL',
      provisionalRecommendation: rec,
    };
  }
}
