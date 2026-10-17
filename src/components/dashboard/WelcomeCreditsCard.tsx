'use client';

import Link from 'next/link';
import type { WelcomeCardState } from '@/features/billing/welcomeCredits';

/**
 * Explains the one-time free credits plainly: how many, that no card is needed and they do not expire, what they
 * buy, and where to go next. No countdown, no pressure; the purchase path is offered only once the credits are low
 * or used (and never before the owner has seen value).
 */
export function WelcomeCreditsCard({
  state,
  hasCampaigns,
}: {
  state: WelcomeCardState;
  hasCampaigns: boolean;
}) {
  if (state.kind === 'hidden') return null;

  const frame = 'rounded-2xl border border-[#F0EBE1] bg-white p-5 shadow-2xs';
  const title = 'text-base font-bold text-[#1A1A1E]';
  const body = 'mt-1 text-sm leading-relaxed text-[#5C5C66]';
  const primary =
    'mt-3 inline-flex rounded-xl bg-[#E84D1A] px-4 py-2 text-sm font-semibold text-white hover:opacity-90';
  const secondary =
    'mt-3 inline-flex rounded-xl border border-[#E84D1A] px-4 py-2 text-sm font-semibold text-[#E84D1A]';

  return (
    <section aria-label="Your free credits" className={frame} data-testid="welcome-credits-card">
      {state.kind === 'setting_up' && (
        <>
          <h3 className={title}>Getting your free credits ready</h3>
          <p className={body}>
            Your free starter credits are being added to your account. No card is needed.
          </p>
        </>
      )}

      {state.kind === 'unavailable' && (
        <>
          <h3 className={title}>
            {state.reason === 'email_not_verified'
              ? 'Verify your email to get your free credits'
              : 'Free starter credits are not available on this account'}
          </h3>
          <p className={body}>
            {state.reason === 'email_not_verified'
              ? 'Once your email address is verified, your free credits are added automatically.'
              : state.reason === 'identity_already_claimed'
                ? 'Free starter credits are given once per business, and these have already been used. You can still choose a plan whenever you are ready.'
                : 'We could not add free credits to this account. You can still choose a plan whenever you are ready.'}
          </p>
          <Link href="/pricing" className={secondary}>
            See plans
          </Link>
        </>
      )}

      {state.kind === 'ready' && (
        <>
          <h3 className={title}>You have {state.remaining} free credits</h3>
          <p className={body}>
            {hasCampaigns
              ? `A full campaign uses ${state.campaignCost} credits. Free credits do not expire and no card is needed.`
              : `That is enough for your first full campaign (${state.campaignCost} credits) with some left to edit it. Free credits do not expire and no card is needed.`}
          </p>
          <Link href="/campaigns/new" className={primary}>
            {hasCampaigns ? 'Create a campaign' : 'Create your first campaign'}
          </Link>
        </>
      )}

      {state.kind === 'low' && (
        <>
          <h3 className={title}>You have {state.remaining} free credits left</h3>
          <p className={body}>
            That is enough for edits and small changes. A full campaign uses {state.campaignCost}{' '}
            credits. When you need more, choose a plan; your remaining free credits stay with you.
          </p>
          <Link href="/pricing" className={secondary}>
            See plans
          </Link>
        </>
      )}

      {state.kind === 'used_up' && (
        <>
          <h3 className={title}>You have used your free credits</h3>
          <p className={body}>
            To keep creating campaigns, choose a plan. Everything you have already made stays in
            your account.
          </p>
          <Link href="/pricing" className={primary}>
            Choose a plan
          </Link>
        </>
      )}
    </section>
  );
}
