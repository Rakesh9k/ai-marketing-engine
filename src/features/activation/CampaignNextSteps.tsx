'use client';

import Link from 'next/link';
import type { BusinessCategory, CampaignAsset } from '@/types';
import { CAMPAIGN_GENERATION_COST } from '@/lib/config/pricing';
import { nextCampaignIdeas, summariseAssets } from './nextSteps';

/**
 * Shown right after a campaign is created. It explains, using the campaign's real contents, what was made, how to
 * use it (Mitra does not publish for the owner), what credits remain, and where to go next. It spends nothing.
 */
export function CampaignNextSteps({
  assets,
  category,
  objective,
  creditsRemaining,
}: {
  assets: Pick<CampaignAsset, 'type'>[];
  category?: BusinessCategory | null;
  objective?: string;
  /** null when the balance could not be read. */
  creditsRemaining: number | null;
}) {
  const made = summariseAssets(assets);
  const ideas = nextCampaignIdeas(category, objective);
  return (
    <section
      aria-labelledby="next-steps-title"
      data-testid="campaign-next-steps"
      className="border-border-light bg-bg-primary mb-6 rounded-2xl border p-5"
    >
      <h2 id="next-steps-title" className="text-text-primary text-lg font-semibold">
        Your campaign is ready. Here is how to use it.
      </h2>
      {made && (
        <p className="text-text-secondary mt-1 text-sm">Mitra created {made} for this campaign.</p>
      )}
      <ol className="text-text-secondary mt-4 list-decimal space-y-2 pl-5 text-sm">
        <li>Read each item below and edit anything that is not right for your business.</li>
        <li>Download the images and copy the captions from the items you like.</li>
        <li>
          Post them yourself on Instagram, Facebook or WhatsApp. Mitra does not post or schedule for
          you yet.
        </li>
      </ol>
      <p className="text-text-secondary mt-4 text-sm" data-testid="credits-left">
        {creditsRemaining === null
          ? `A full campaign uses ${CAMPAIGN_GENERATION_COST} credits. Your balance is on the Billing page.`
          : `You have ${creditsRemaining.toLocaleString('en-IN')} credits left. A full campaign uses ${CAMPAIGN_GENERATION_COST}.`}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/campaigns/new"
          className="bg-brand-600 hover:bg-brand-700 rounded-xl px-4 py-2 text-sm font-semibold text-white"
        >
          Create another campaign
        </Link>
        {ideas.length > 0 && (
          <p className="text-text-tertiary text-xs">
            Ideas for next time: {ideas.map((i) => i.label.replace(/^\S+\s/, '')).join(', ')}.
          </p>
        )}
      </div>
    </section>
  );
}
