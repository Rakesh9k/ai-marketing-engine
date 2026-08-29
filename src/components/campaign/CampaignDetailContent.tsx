'use client';

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Campaign, CampaignAsset, AssetType, CampaignStatus } from '@/types';
import { AssetIcons, type AssetIconKey } from '@/components/icons/AssetIcons';
import { DetailedChecks } from './DetailedChecks';

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  poster: 'Posters',
  headline: 'Headlines',
  ad_copy: 'Ad Copies',
  caption: 'Captions',
  story: 'Stories',
  reel: 'Reels',
  whatsapp: 'WhatsApp',
  cta: 'CTAs',
};

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-700',
  validating: 'bg-brand-100 text-brand-700',
  queued: 'bg-brand-100 text-brand-700',
  analyzing: 'bg-brand-100 text-brand-700',
  strategizing: 'bg-brand-100 text-brand-700',
  generating_copy: 'bg-brand-100 text-brand-700',
  generating_creatives: 'bg-brand-100 text-brand-700',
  validating_output: 'bg-brand-100 text-brand-700',
  completed: 'bg-success-100 text-success-700',
  verified: 'bg-success-100 text-success-700',
  generated: 'bg-brand-100 text-brand-700',
  failed: 'bg-error-100 text-error-700',
};

const TRUTH_CHECK_COLORS: Record<'PASS' | 'FAIL' | 'REVIEW_REQUIRED', string> = {
  PASS: 'bg-success-100 text-success-700',
  FAIL: 'bg-error-100 text-error-700',
  REVIEW_REQUIRED: 'bg-warning-100 text-warning-700',
};

interface CampaignDetailContentProps {
  campaign: Campaign;
  assets: CampaignAsset[];
  activeTab: AssetType;
  setActiveTab: (type: AssetType) => void;
  truthCheckStatus: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED' | undefined;
}

interface CampaignDetailContentProps {
  campaign: Campaign;
  assets: CampaignAsset[];
  activeTab: AssetType;
  setActiveTab: (type: AssetType) => void;
  truthCheckStatus: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED' | undefined;
}

export function CampaignDetailContent({
  campaign,
  assets,
  activeTab,
  setActiveTab,
  truthCheckStatus,
}: CampaignDetailContentProps) {
  const groupedAssets = assets.reduce(
    (acc, asset) => {
      if (!acc[asset.type]) acc[asset.type] = [];
      acc[asset.type].push(asset);
      return acc;
    },
    {} as Record<AssetType, CampaignAsset[]>
  );

  const assetTypes = Object.keys(groupedAssets) as AssetType[];

  const hasDetailedChecks = campaign.metadata?.truthCheckResult?.checks && campaign.metadata.truthCheckResult.checks.length > 0;
  const checks = campaign.metadata?.truthCheckResult?.checks || [];

  return (
    <div className="bg-bg-primary min-h-screen">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/campaigns"
                className="text-brand-600 hover:text-brand-700 mb-2 inline-block text-sm"
              >
                ← Back to campaigns
              </Link>
              <h1 className="text-2xl font-bold text-neutral-900">{campaign.offer.headline}</h1>
              <p className="mt-1 text-sm text-neutral-500 capitalize">
                {campaign.objective.replace('_', ' ')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[campaign.status]}`}
              >
                {campaign.status}
              </span>
              {truthCheckStatus && (
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${TRUTH_CHECK_COLORS[truthCheckStatus]}`}
                >
                  Truth Check: {truthCheckStatus}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {assetTypes.map((type) => {
            const Icon = AssetIcons[type as AssetIconKey];
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === type
                    ? 'bg-brand-600 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Icon />
                  {ASSET_TYPE_LABELS[type]}
                  <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs">
                    {groupedAssets[type]?.length || 0}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white">
          {activeTab === 'poster' && groupedAssets.poster && (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {groupedAssets.poster.map((asset) => (
                <div key={asset.assetId} className="group relative">
                  {asset.imageUrl ? (
                    <img
                      src={asset.imageUrl}
                      alt={`Poster ${asset.index + 1}`}
                      className="aspect-[4/5] w-full rounded-lg object-cover"
                    />
                  ) : asset.content && !asset.imageUrl ? (
                    <div className="flex aspect-[4/5] w-full items-center justify-center rounded-lg bg-neutral-100">
                      <span className="text-neutral-400">No image generated</span>
                    </div>
                  ) : null}
                  <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
                    <p className="text-sm font-medium">Poster {asset.index + 1}</p>
                    <p className="text-xs text-white/70">Click to view full size</p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button className="bg-brand-600 hover:bg-brand-700 flex-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                      Download
                    </button>
                    <button className="flex-1 rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200">
                      Regenerate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab !== 'poster' && groupedAssets[activeTab] && (
            <div className="p-4 space-y-4">
              {groupedAssets[activeTab]!.map((asset) => (
                <div key={asset.assetId} className="rounded-lg border border-neutral-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-neutral-900">
                      {ASSET_TYPE_LABELS[activeTab].slice(0, -1)} {asset.index + 1}
                    </h3>
                    <div className="flex gap-2">
                      <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                        Copy
                      </button>
                      <button className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200">
                        Regenerate
                      </button>
                    </div>
                  </div>
                  <pre className="max-h-64 overflow-auto rounded-lg bg-neutral-50 p-3 text-sm whitespace-pre-wrap text-neutral-700">
                    {JSON.stringify(asset.content, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {!groupedAssets[activeTab] && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              {(() => {
                const Icon = AssetIcons[activeTab as AssetIconKey];
                return <Icon className="text-neutral-400" />;
              })()}
              <h3 className="mt-4 text-lg font-medium text-neutral-900">No {ASSET_TYPE_LABELS[activeTab].toLowerCase()} yet</h3>
              <p className="mt-1 text-sm text-neutral-500">
                {activeTab === 'poster'
                  ? 'Images will appear here after generation'
                  : 'Assets will appear here after generation'}
              </p>
            </div>
          )}
        </div>

        {truthCheckStatus && (
          <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Truth Check Results</h3>
            <div className="mb-4">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${TRUTH_CHECK_COLORS[truthCheckStatus]}`}
              >
                Status: {truthCheckStatus}
              </span>
            </div>
            {campaign.metadata?.truthCheckSummary && (
              <p className="text-sm text-neutral-600">{campaign.metadata.truthCheckSummary}</p>
            )}
            {hasDetailedChecks && (
              <DetailedChecks checks={checks} />
            )}
            <p className="mt-4 text-sm text-neutral-500">
              {truthCheckStatus === 'PASS'
                ? 'All facts verified against Business Brain. Campaign is ready to publish.'
                : truthCheckStatus === 'FAIL'
                  ? 'Critical fact mismatches detected. Please review and regenerate.'
                  : 'Some facts require manual review. Please verify before publishing.'}
            </p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h4 className="mb-2 font-medium text-neutral-900">Campaign Details</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Objective</dt>
                <dd className="font-medium capitalize">{campaign.objective.replace('_', ' ')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Offer</dt>
                <dd className="font-medium">{campaign.offer.headline}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Price</dt>
                <dd className="font-medium">₹{campaign.offer.price}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">CTA</dt>
                <dd className="font-medium capitalize">{campaign.cta.replace('_', ' ')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Language</dt>
                <dd className="font-medium">{campaign.localization.primaryLanguage}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Regional Style</dt>
                <dd className="font-medium capitalize">{campaign.localization.regionalStyle}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Campaign Style</dt>
                <dd className="font-medium capitalize">{campaign.localization.campaignStyle}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Credits Used</dt>
                <dd className="font-medium">{campaign.creditsUsed || campaign.creditsReserved}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h4 className="mb-2 font-medium text-neutral-900">Product</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Name</dt>
                <dd className="font-medium">{campaign.offer.headline}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Price</dt>
                <dd className="font-medium">₹{campaign.offer.price}</dd>
              </div>
              {campaign.offer.originalPrice && (
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Original Price</dt>
                  <dd className="font-medium line-through">₹{campaign.offer.originalPrice}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-neutral-500">Offer Type</dt>
                <dd className="font-medium capitalize">{campaign.offer.type}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h4 className="mb-2 font-medium text-neutral-900">Validity</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Start</dt>
                <dd className="font-medium">{format(new Date(campaign.offer.validityStart), 'PPP')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">End</dt>
                <dd className="font-medium">{format(new Date(campaign.offer.validityEnd), 'PPP')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Campaign Start</dt>
                <dd className="font-medium">{format(new Date(campaign.duration.start), 'PPP')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Campaign End</dt>
                <dd className="font-medium">{format(new Date(campaign.duration.end), 'PPP')}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}