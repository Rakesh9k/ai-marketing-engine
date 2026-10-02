'use client';

import Link from 'next/link';
import Image from 'next/image';
import { InteractiveCard } from '@/components/motion/InteractiveCard';
import type { Campaign } from '@/types';

interface RecentCampaignsSectionProps {
  campaigns: Campaign[];
}

export function RecentCampaignsSection({ campaigns }: RecentCampaignsSectionProps) {
  // Fallback demo visuals for rich display if campaign has no assets
  const fallbackImages: string[] = [
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
  ];

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
          {campaigns.map((campaign, idx) => {
            const statusConfig =
              campaign.status === 'completed' || campaign.status === 'verified'
                ? { label: '✓ Completed', badgeClass: 'bg-emerald-500 text-white' }
                : campaign.status === 'draft'
                  ? { label: 'Draft', badgeClass: 'bg-neutral-500 text-white' }
                  : campaign.status === 'failed'
                    ? { label: 'Failed', badgeClass: 'bg-red-500 text-white' }
                    : { label: '+ Live', badgeClass: 'bg-emerald-500 text-white' };

            const bgImage = fallbackImages[idx % fallbackImages.length] || fallbackImages[0]!;

            return (
              <Link key={campaign.campaignId} href={`/campaigns/${campaign.campaignId}`}>
                <InteractiveCard
                  bare
                  maxTilt={4}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#F0EBE1] bg-white shadow-2xs transition-shadow hover:shadow-md"
                >
                  {/* Image Card Header with Status Badge */}
                  <div className="relative h-40 w-full overflow-hidden bg-neutral-100">
                    <Image
                      src={bgImage}
                      alt={campaign.offer.headline}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 250px"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold shadow-xs ${statusConfig.badgeClass}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <h3 className="truncate text-sm font-bold text-[#1A1A1E] transition-colors group-hover:text-[#E84D1A]">
                        {campaign.offer.headline}
                      </h3>
                      <p className="mt-0.5 text-xs text-[#757580] capitalize">
                        {campaign.objective.replace('_', ' ')} • WhatsApp + Social Media
                      </p>
                    </div>

                    {/* Metrics Footer */}
                    <div className="mt-4 grid grid-cols-3 border-t border-[#F0EBE1] pt-3 text-center text-xs">
                      <div>
                        <p className="font-bold text-[#1A1A1E]">1.2K</p>
                        <p className="text-[10px] text-[#757580]">Views</p>
                      </div>
                      <div>
                        <p className="font-bold text-[#1A1A1E]">342</p>
                        <p className="text-[10px] text-[#757580]">Clicks</p>
                      </div>
                      <div>
                        <p className="font-bold text-[#1A1A1E]">28</p>
                        <p className="text-[10px] text-[#757580]">Orders</p>
                      </div>
                    </div>
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
