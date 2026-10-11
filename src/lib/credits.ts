import type { Subscription, Usage } from '@/types';

/** Free-plan monthly allowance, used only when no usage document exists yet. */
const FALLBACK_FREE_CREDITS = 140;

/**
 * Credits the customer can still spend this period, mirroring the server's own check
 * (usageControl: usage.creditsIncluded - usage.creditsUsed). `usage.creditsIncluded` already holds the
 * plan allowance PLUS any purchased top-up credits, which `subscription.creditsIncluded` does not, so
 * reading the subscription made a customer who had just bought a credit pack still see (and be
 * blocked at) their old balance. The server stays authoritative; this is display and pre-flight only.
 */
export function computeCreditsRemaining(
  subscription: Pick<Subscription, 'creditsIncluded'> | null | undefined,
  usage: Pick<Usage, 'creditsIncluded' | 'creditsUsed'> | null | undefined
): number {
  const included = usage?.creditsIncluded ?? subscription?.creditsIncluded ?? FALLBACK_FREE_CREDITS;
  const used = usage?.creditsUsed ?? 0;
  return Math.max(0, included - used);
}
