'use client';

import Link from 'next/link';
import { InteractiveCard } from '@/components/motion/InteractiveCard';
import type { Campaign } from '@/types';

interface RecentCampaignsSectionProps {
  campaigns: Campaign[];
}

export function RecentCampaignsSection({ campaigns }: RecentCampaignsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#1A1A1E]">
          <span>📅 Your Recent Campaigns</span>
        </h2>
        {campaigns.length > 0 && (
          <Link
            href="/campaigns"
            className="text-xs font-semibold text-[#E84D1A] hover:underline sm:text-sm"
          >
            View all campaigns &rarr;
          </Link>
        )}
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-orange-200/80 p-8 text-center shadow-2xs">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-[#E84D1A]">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-base font-bold text-[#1A1A1E]">No campaigns yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-[#5C5C66]">
            Turn one product photo and an offer into a complete marketing campaign in under a
            minute.
          </p>
          <div className="mt-4 flex justify-center">
            <Link href="/campaigns/new">
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#E84D1A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#d04113]">
                Create Your First Campaign
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {campaigns.map((campaign) => {
            const inProgress = !['draft', 'completed', 'verified', 'generated', 'failed'].includes(
              campaign.status
            );
            const statusConfig =
              campaign.status === 'completed' || campaign.status === 'verified'
                ? { label: '✓ Ready', badgeClass: 'bg-emerald-600 text-white' }
                : campaign.status === 'generated'
                  ? { label: 'Review needed', badgeClass: 'bg-amber-600 text-white' }
                  : campaign.status === 'draft'
                    ? { label: 'Draft', badgeClass: 'bg-neutral-500 text-white' }
                    : campaign.status === 'failed'
                      ? { label: 'Failed', badgeClass: 'bg-red-600 text-white' }
                      : inProgress
                        ? { label: 'Generating…', badgeClass: 'bg-sky-600 text-white' }
                        : { label: campaign.status, badgeClass: 'bg-neutral-500 text-white' };

            return (
              <Link key={campaign.campaignId} href={`/campaigns/${campaign.campaignId}`}>
                <InteractiveCard
                  bare
                  maxTilt={4}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#F0EBE1] bg-white shadow-2xs transition-shadow hover:shadow-md"
                >
                  <div className="p-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold shadow-xs ${statusConfig.badgeClass}`}
                    >
                      {statusConfig.label}
                    </span>
                    <h3 className="mt-3 line-clamp-2 text-sm font-bold text-[#1A1A1E] transition-colors group-hover:text-[#E84D1A]">
                      {campaign.offer.headline}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#757580] capitalize">
                      {campaign.objective.replace('_', ' ')}
                    </p>
                  </div>
                </InteractiveCard>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
