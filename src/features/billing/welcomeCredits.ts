import { CAMPAIGN_GENERATION_COST } from '@/lib/config/pricing';
import type { Usage } from '@/types';

/**
 * What the dashboard says about the one-time welcome credits. Pure, so it is easy to test; the SERVER decides
 * whether credits are granted (claimWelcomeCredits), this only describes the state to the owner honestly.
 *
 *  - hidden       nothing to say (paid plan, or an older account that keeps its monthly free allowance)
 *  - setting_up   a new account that has not received its credits yet (the app asks the server to grant them)
 *  - unavailable  the server said the credits cannot be granted (email not verified, or already claimed)
 *  - ready        the owner has enough for a full campaign
 *  - low          the owner has some credits, not enough for a full campaign
 *  - used_up      the free credits have all been used
 */
export type WelcomeCardState =
  | { kind: 'hidden' }
  | { kind: 'setting_up' }
  | { kind: 'unavailable'; reason: 'email_not_verified' | 'identity_already_claimed' | 'other' }
  | { kind: 'ready'; remaining: number; campaignCost: number; campaigns: number }
  | { kind: 'low'; remaining: number; campaignCost: number }
  | { kind: 'used_up' };

export type ClaimOutcome =
  | { status: 'granted' | 'already_granted' }
  | { status: 'denied' | 'not_eligible_yet' | 'not_applicable'; reasons: string[] }
  | null;

type UsageLike = Pick<Usage, 'planId' | 'creditsIncluded' | 'creditsUsed'> & {
  welcomeCredits?: number;
};

/** True when a free account has no credits yet and nothing has asked the server to grant them. */
export function shouldClaimWelcomeCredits(usage: UsageLike | null | undefined): boolean {
  if (!usage || usage.planId !== 'free') return false;
  return (usage.welcomeCredits ?? 0) === 0 && (usage.creditsIncluded ?? 0) === 0;
}

export function welcomeCardState(
  usage: UsageLike | null | undefined,
  claim: ClaimOutcome = null,
  campaignCost: number = CAMPAIGN_GENERATION_COST
): WelcomeCardState {
  if (!usage || usage.planId !== 'free') return { kind: 'hidden' };
  const welcome = usage.welcomeCredits ?? 0;
  const remaining = Math.max(0, (usage.creditsIncluded ?? 0) - (usage.creditsUsed ?? 0));

  if (welcome === 0) {
    // An older account on the monthly allowance has credits but never had a welcome grant: say nothing.
    if ((usage.creditsIncluded ?? 0) > 0) return { kind: 'hidden' };
    if (claim && 'reasons' in claim) {
      if (claim.status === 'not_applicable') return { kind: 'hidden' };
      if (claim.reasons.includes('email_not_verified')) {
        return { kind: 'unavailable', reason: 'email_not_verified' };
      }
      if (claim.reasons.some((r) => r.startsWith('identity_already_claimed'))) {
        return { kind: 'unavailable', reason: 'identity_already_claimed' };
      }
      return { kind: 'unavailable', reason: 'other' };
    }
    return { kind: 'setting_up' };
  }

  if (remaining >= campaignCost) {
    return {
      kind: 'ready',
      remaining,
      campaignCost,
      campaigns: Math.floor(remaining / campaignCost),
    };
  }
  if (remaining > 0) return { kind: 'low', remaining, campaignCost };
  return { kind: 'used_up' };
}

export const WELCOME_CLAIM_SESSION_KEY = 'mitra_welcome_claim_attempted';
