'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import type { Business, Campaign, CampaignAsset, CampaignStatus } from '@/types';
import { DetailedChecks } from './DetailedChecks';
import { useRegenerateAsset } from '@/hooks/useRegenerateAsset';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useToast } from '@/hooks/useToast';
import { buildWhatsAppShareUrl } from '@/lib/utils/whatsapp';
import { trackEvent, recordWhatsAppClick } from '@/lib/analytics/trackEvent';
import { callFunction } from '@/services/api';

/**
 * Phase 8: this used to render every non-poster asset as
 * <pre>{JSON.stringify(asset.content, null, 2)}</pre> — raw developer JSON
 * shown directly to restaurant/salon owners. This file now renders each
 * asset type as actual marketing content (headline text, caption text with
 * hashtags, a WhatsApp message with a Share button, story/reel scripts,
 * an image gallery) using only the real fields the backend already
 * produces (functions/src/services/ai/pipeline.ts's CopyPackSchema) —
 * nothing here is invented, and no new backend capability was added.
 * Truth Check status, downloads, WhatsApp sharing, and regeneration all
 * continue to come from/through the existing backend implementation.
 */

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  validating: 'Validating',
  queued: 'Queued',
  analyzing: 'Analyzing',
  strategizing: 'Building strategy',
  generating_copy: 'Writing content',
  generating_creatives: 'Creating visuals',
  validating_output: 'Checking facts',
  completed: 'Complete',
  verified: 'Verified',
  generated: 'Generated',
  failed: 'Failed',
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

const CTA_LABELS: Record<string, string> = {
  order_whatsapp: 'Order on WhatsApp',
  book_table: 'Book Table',
  view_menu: 'View Menu',
  call_now: 'Call Now',
  get_directions: 'Get Directions',
};

// Truth Check status must always come from the backend-persisted result
// (passed in as the truthCheckStatus prop, itself sourced from
// campaign.metadata.truthCheckStatus — see [campaignId]/page.tsx). This
// component never computes or assumes a verification result itself.
const TRUTH_CHECK_DISPLAY: Record<
  'PASS' | 'FAIL' | 'REVIEW_REQUIRED',
  { emoji: string; label: string; className: string; description: string }
> = {
  PASS: {
    emoji: '🟢',
    label: 'Verified',
    className: 'bg-success-100 text-success-700',
    description:
      'All facts were checked against your business information. This campaign is ready to use.',
  },
  FAIL: {
    emoji: '🔴',
    label: 'Failed',
    className: 'bg-error-100 text-error-700',
    description:
      'Some details didn’t match your business information. Please regenerate before using this campaign.',
  },
  REVIEW_REQUIRED: {
    emoji: '🟡',
    label: 'Needs Review',
    className: 'bg-warning-100 text-warning-700',
    description:
      'Some details couldn’t be automatically confirmed. Please review them before publishing.',
  },
};

interface CampaignDetailContentProps {
  campaign: Campaign;
  assets: CampaignAsset[];
  truthCheckStatus: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED' | undefined;
  // The business's own record — the only authoritative source for its
  // WhatsApp number (business.contact.whatsapp). Optional/nullable because
  // the business fetch can fail independently of the campaign fetch; the
  // WhatsApp action degrades to "unavailable" rather than crashing.
  business?: Business | null;
  // Phase 13: true when the business/product facts this campaign's Truth
  // Check originally verified have since changed (phone, WhatsApp number,
  // location, or product price) — computed server-side by the getCampaign
  // Cloud Function (Phase 6's isVerificationStale, now actually wired up).
  // The stored PASS/FAIL/REVIEW_REQUIRED result itself is never mutated —
  // this only controls whether the badge additionally warns that it may
  // no longer reflect current business data.
  isVerificationStale?: boolean;
}

interface HeadlineContent {
  text?: string;
  characterCount?: number;
  variant?: string;
}
interface CaptionContent {
  text?: string;
  hashtags?: string[];
  characterCount?: number;
}
interface AdCopyContent {
  primaryText?: string;
  headline?: string;
  description?: string;
  cta?: string;
}
interface WhatsAppContent {
  message?: string;
}
interface StoryConceptContent {
  frames?: Array<{ copy?: string; visualCue?: string; cta?: string; interactive?: string }>;
  overallTheme?: string;
}
interface ReelConceptContent {
  hook?: string;
  scenes?: Array<{ description?: string; visualDirection?: string; duration?: string }>;
  productReveal?: string;
  cta?: string;
  caption?: string;
  shootingTips?: string;
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-sm text-neutral-400 italic">{text}</p>;
}

export function CampaignDetailContent({
  campaign,
  assets,
  truthCheckStatus,
  business,
  isVerificationStale,
}: CampaignDetailContentProps) {
  const { regenerateAsset, isAssetRegenerating } = useRegenerateAsset();
  const { copyToClipboard, formatAssetForCopy, isItemCopied, isItemCopying } = useCopyToClipboard();
  const { showToast } = useToast();
  const [downloadingAsset, setDownloadingAsset] = useState<string | null>(null);
  const [isDownloadingCopy, setIsDownloadingCopy] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const whatsappShareLockRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (whatsappShareLockRef.current) clearTimeout(whatsappShareLockRef.current);
    };
  }, []);

  // Phase 34 — the real, server-authoritative performance record.
  // `null` means "hasn't loaded yet / failed to load," which renders
  // nothing rather than a misleading 0. `inquiriesAvailable: false` is
  // always true right now (no integrated inquiry source exists anywhere
  // in this system) — the panel below must show "Not available," never 0.
  const [performance, setPerformance] = useState<{
    whatsappClicks: number;
    inquiries: number | null;
    inquiriesAvailable: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    callFunction<
      { businessId: string; campaignId: string },
      { whatsappClicks: number; inquiries: number | null; inquiriesAvailable: boolean }
    >({
      functionName: 'getCampaignPerformance',
      data: { businessId: campaign.businessId, campaignId: campaign.campaignId },
    })
      .then((result) => {
        if (!cancelled) setPerformance(result);
      })
      .catch((err) => {
        console.error('Failed to load campaign performance:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [campaign.businessId, campaign.campaignId]);

  const copyButtonLabel = (key: string) =>
    isItemCopied(key) ? 'Copied!' : isItemCopying(key) ? 'Copying...' : 'Copy';

  // Excludes both 'superseded' (replaced by a later, successful
  // regeneration) and 'failed' (a regeneration attempt that did NOT pass
  // Truth Check — see functions/src/functions/campaigns/regenerateAsset.ts,
  // which always persists the failed attempt for audit history but never
  // marks the original asset as superseded by it). Without this, a failed
  // regeneration's content would sit alongside the still-active, valid
  // asset in every section below and could be downloaded/shared instead of
  // the real one.
  const activeAssets = assets.filter((a) => a.status !== 'superseded' && a.status !== 'failed');

  const headlineAssets = activeAssets.filter((a) => a.type === 'headline');
  const captionAssets = activeAssets.filter((a) => a.type === 'caption');
  const adCopyAssets = activeAssets.filter((a) => a.type === 'ad_copy');
  const whatsappAsset = activeAssets.find((a) => a.type === 'whatsapp');
  const posterAssets = activeAssets.filter((a) => a.type === 'poster');

  // 'story' assets come from two different sources (see pipeline.ts):
  // AI-written story concepts (content.frames) and the deterministic,
  // Truth-Check-safe composited frame images (imageUrl set, no .frames).
  const allStoryAssets = activeAssets.filter((a) => a.type === 'story');
  const storyConceptAssets = allStoryAssets.filter(
    (a) => (a.content as StoryConceptContent)?.frames
  );
  const storyFrameImageAssets = allStoryAssets.filter((a) => a.imageUrl);

  // Same split for 'reel': AI-written concept (content.hook) vs. the
  // deterministic cover-image storyboard (assetId 'asset_reel_storyboard').
  const allReelAssets = activeAssets.filter((a) => a.type === 'reel');
  const reelConceptAssets = allReelAssets.filter((a) => (a.content as ReelConceptContent)?.hook);
  const reelStoryboardAsset = allReelAssets.find((a) => a.assetId === 'asset_reel_storyboard');

  const creativeAssets = [
    ...posterAssets,
    ...storyFrameImageAssets,
    ...(reelStoryboardAsset ? [reelStoryboardAsset] : []),
  ];

  const hasDetailedChecks =
    campaign.metadata?.truthCheckResult?.checks &&
    campaign.metadata.truthCheckResult.checks.length > 0;
  const checks = campaign.metadata?.truthCheckResult?.checks || [];

  // trackEvent already catches internally and never throws/rejects to its
  // caller — this local wrapper is a second, defense-in-depth layer so that
  // even a bug in that guarantee can never let an analytics failure surface
  // as (or get mistaken for) a failure of the download/WhatsApp action it
  // accompanies.
  const safeTrack: typeof trackEvent = (params) => {
    try {
      trackEvent(params);
    } catch (err) {
      console.error('Analytics tracking failed (non-blocking):', err);
    }
  };

  const handleRegenerate = async (asset: CampaignAsset, label: string) => {
    const result = await regenerateAsset({
      campaignId: campaign.campaignId,
      assetId: asset.assetId,
      assetType: asset.type,
      idempotencyKey: crypto.randomUUID(),
    });
    if (result) {
      showToast(`${label} regenerated`, 'success');
    }
  };

  const handleCopy = async (asset: CampaignAsset, key: string) => {
    const text = formatAssetForCopy(asset, asset.type);
    await copyToClipboard(text, key);
  };

  const handleDownloadImage = async (asset: CampaignAsset, label: string) => {
    if (!asset.imageUrl) {
      showToast('No image to download', 'error');
      return;
    }
    setDownloadingAsset(asset.assetId);
    try {
      const response = await fetch(asset.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${campaign.offer.headline.replace(/\s+/g, '_')}_${label.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Image downloaded', 'success');
      // Fire-and-forget: the download has already fully succeeded above —
      // analytics is recorded after the fact and can never block or
      // invalidate it.
      safeTrack({
        eventName: 'asset_downloaded',
        businessId: campaign.businessId,
        campaignId: campaign.campaignId,
        assetId: asset.assetId,
        metadata: { assetType: asset.type },
      });
    } catch (err) {
      console.error('Download failed:', err);
      showToast("Couldn't download this image. Please try again.", 'error');
    } finally {
      setDownloadingAsset(null);
    }
  };

  const handleDownloadCopy = () => {
    if (isDownloadingCopy) return;
    setIsDownloadingCopy(true);
    try {
      let content = `Campaign: ${campaign.offer.headline}\n`;
      content += `Objective: ${campaign.objective.replace('_', ' ')}\n`;
      content += `Price: ₹${campaign.offer.price}\n`;
      content += `CTA: ${CTA_LABELS[campaign.cta] || campaign.cta}\n`;
      content += `Truth Check: ${(truthCheckStatus && TRUTH_CHECK_DISPLAY[truthCheckStatus].label) || 'Not run'}\n\n`;

      const includedAssets: CampaignAsset[] = [];
      const appendGroup = (title: string, list: CampaignAsset[]) => {
        if (list.length === 0) return;
        content += `=== ${title.toUpperCase()} ===\n\n`;
        list.forEach((asset, i) => {
          content += `--- ${title} ${i + 1} ---\n`;
          content += formatAssetForCopy(asset, asset.type);
          content += '\n\n';
        });
        includedAssets.push(...list);
      };

      appendGroup('Headline', headlineAssets);
      appendGroup('Caption', captionAssets);
      appendGroup('Ad Copy', adCopyAssets);
      if (whatsappAsset) appendGroup('WhatsApp Message', [whatsappAsset]);
      appendGroup('Story Concept', storyConceptAssets);
      appendGroup('Reel Concept', reelConceptAssets);

      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${campaign.offer.headline.replace(/\s+/g, '_')}_campaign_${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Copy downloaded', 'success');
      // One asset_downloaded event per copy asset actually included in the
      // file — reuses the same canonical event as image downloads rather
      // than inventing a "campaign bundle downloaded" event that doesn't
      // exist in the analytics schema.
      includedAssets.forEach((asset) => {
        safeTrack({
          eventName: 'asset_downloaded',
          businessId: campaign.businessId,
          campaignId: campaign.campaignId,
          assetId: asset.assetId,
          metadata: { assetType: asset.type, bundle: 'copy_txt' },
        });
      });
    } catch (err) {
      console.error('Copy download failed:', err);
      showToast("Couldn't download the campaign copy. Please try again.", 'error');
    } finally {
      setIsDownloadingCopy(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (isSharingWhatsApp) return;

    // The message text is the actual AI-authored campaign content
    // (copyPack.whatsappMessage.message via the persisted asset) — that
    // part is legitimately AI-generated marketing copy. The destination
    // number and URL, however, must never come from the AI: the pipeline's
    // CopyPackSchema also asks the model for a `waLink`/`attributionParams`
    // field, but those are free-form LLM output with no guarantee the
    // phone number or IDs are correct, so this deliberately ignores them
    // and reconstructs the URL from authoritative data instead — the
    // business's own contact.whatsapp number and the real campaign/asset
    // IDs already available here.
    const content = whatsappAsset?.content as WhatsAppContent | undefined;
    const message = content?.message;
    if (!message) {
      showToast('No WhatsApp message available yet', 'error');
      return;
    }

    const phone = business?.contact?.whatsapp || business?.contact?.phone;
    const shareUrl = buildWhatsAppShareUrl(phone, message);
    if (!shareUrl) {
      showToast('WhatsApp isn’t available for this business right now.', 'error');
      return;
    }

    // Opened synchronously, directly inside the click handler (before any
    // async work) so browsers don't treat it as a popup and block it.
    window.open(shareUrl, '_blank', 'noopener,noreferrer');

    setIsSharingWhatsApp(true);
    if (whatsappShareLockRef.current) clearTimeout(whatsappShareLockRef.current);
    whatsappShareLockRef.current = setTimeout(() => setIsSharingWhatsApp(false), 800);

    // Fire-and-forget — WhatsApp has already opened above regardless of
    // whether this succeeds, fails, or times out. Uses the dedicated,
    // authorized, idempotent recordWhatsAppClick path (Phase 34) rather
    // than the generic trackEvent — a fresh clickId is generated here,
    // once per real click, so a network retry of this exact call reuses
    // it and never double-counts, while the next real click gets a new
    // id and counts separately.
    try {
      recordWhatsAppClick({
        businessId: campaign.businessId,
        campaignId: campaign.campaignId,
        assetId: whatsappAsset?.assetId,
        clickId:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      });
    } catch (err) {
      console.error('WhatsApp click tracking failed (non-blocking):', err);
    }
  };

  const truthDisplay = truthCheckStatus ? TRUTH_CHECK_DISPLAY[truthCheckStatus] : null;

  return (
    <div className="bg-bg-primary min-h-screen">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/campaigns"
            className="text-brand-600 hover:text-brand-700 mb-2 inline-block text-sm"
          >
            &larr; Back to campaigns
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-neutral-900">
                {campaign.offer.headline}
              </h1>
              <p className="mt-1 text-sm text-neutral-500 capitalize">
                {campaign.objective.replace('_', ' ')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[campaign.status]}`}
                aria-label={`Campaign status: ${STATUS_LABELS[campaign.status]}`}
              >
                {STATUS_LABELS[campaign.status]}
              </span>
              {truthDisplay && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${truthDisplay.className}`}
                  aria-label={`Truth Check: ${truthDisplay.label}`}
                >
                  <span aria-hidden="true">{truthDisplay.emoji}</span>
                  {truthDisplay.label}
                </span>
              )}
              {truthDisplay && isVerificationStale && (
                <span
                  className="bg-warning-50 text-warning-600 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                  aria-label="This campaign's business or product details have changed since it was verified"
                >
                  <span aria-hidden="true">⚠️</span>
                  May be outdated
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* PERFORMANCE — Phase 34: only the metric with a real, observable
            source (whatsappClicks) shows a number. Inquiries has no
            integrated source anywhere in this system, so it always shows
            "Not available," never a fabricated 0 — see
            docs/PERFORMANCE_DATA_READINESS.md. */}
        {performance && (
          <SectionCard title="Performance">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-neutral-500">WhatsApp clicks</p>
                <p className="mt-1 text-2xl font-bold text-neutral-900">
                  {performance.whatsappClicks}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Inquiries</p>
                <p className="mt-1 text-2xl font-bold text-neutral-400">Not available</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Mitra doesn't yet have a way to reliably track inquiries.
                </p>
              </div>
            </div>
          </SectionCard>
        )}

        {/* CREATIVE */}
        <SectionCard title="Creative">
          {creativeAssets.length === 0 ? (
            <EmptyHint text="No images have been generated for this campaign yet." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {creativeAssets.map((asset, i) => {
                const label =
                  asset.type === 'poster'
                    ? `Poster ${asset.index + 1}`
                    : asset.assetId === 'asset_reel_storyboard'
                      ? 'Reel Cover'
                      : `Story Frame ${asset.index + 1}`;
                return (
                  <div
                    key={asset.assetId}
                    className="group relative overflow-hidden rounded-lg border border-neutral-200"
                  >
                    <div className="relative aspect-[4/5] w-full bg-neutral-100">
                      {asset.imageUrl ? (
                        <Image
                          src={asset.imageUrl}
                          alt={`${label} for ${campaign.offer.headline}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 50vw"
                          priority={i === 0}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="text-sm text-neutral-400">Image not available</span>
                        </div>
                      )}
                      <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
                        <p className="text-sm font-medium">{label}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 p-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadImage(asset, label)}
                        disabled={downloadingAsset === asset.assetId || !asset.imageUrl}
                        className="bg-brand-600 hover:bg-brand-700 flex-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Download ${label}`}
                      >
                        {downloadingAsset === asset.assetId ? 'Downloading...' : 'Download'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerate(asset, label)}
                        disabled={isAssetRegenerating(asset.assetId, asset.type)}
                        className="flex-1 rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Regenerate ${label}`}
                      >
                        {isAssetRegenerating(asset.assetId, asset.type)
                          ? 'Regenerating...'
                          : 'Regenerate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* TRUTH CHECK */}
        <SectionCard title="Truth Check">
          {truthDisplay ? (
            <>
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${truthDisplay.className}`}
              >
                <span aria-hidden="true">{truthDisplay.emoji}</span>
                {truthDisplay.label}
              </div>
              <p className="mt-3 text-sm text-neutral-600">
                {campaign.metadata?.truthCheckSummary || truthDisplay.description}
              </p>
              {isVerificationStale && (
                <p className="bg-warning-50 border-warning-500/30 text-warning-600 mt-3 rounded-lg border p-3 text-sm">
                  ⚠️ Your business or product details have changed since this campaign was verified.
                  This result reflects how things were at generation time — regenerate to re-verify
                  against your current information.
                </p>
              )}
              {hasDetailedChecks && <DetailedChecks checks={checks} />}
            </>
          ) : (
            <EmptyHint text="Truth Check hasn't run for this campaign yet." />
          )}
        </SectionCard>

        {/* HEADLINES */}
        <SectionCard title="Headlines">
          {headlineAssets.length === 0 ? (
            <EmptyHint text="No headlines generated." />
          ) : (
            <div className="space-y-3">
              {headlineAssets.map((asset, i) => {
                const content = asset.content as HeadlineContent;
                return (
                  <div
                    key={asset.assetId}
                    className={`flex items-start justify-between gap-4 rounded-lg border p-4 ${
                      i === 0 ? 'border-brand-200 bg-brand-50' : 'border-neutral-200'
                    }`}
                  >
                    <p
                      className={
                        i === 0 ? 'text-lg font-semibold text-neutral-900' : 'text-neutral-800'
                      }
                    >
                      {content?.text || <EmptyHint text="No text" />}
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(asset, `headline-${asset.assetId}`)}
                        className="bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                      >
                        {copyButtonLabel(`headline-${asset.assetId}`)}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerate(asset, 'Headline')}
                        disabled={isAssetRegenerating(asset.assetId, 'headline')}
                        className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
                      >
                        {isAssetRegenerating(asset.assetId, 'headline')
                          ? 'Regenerating...'
                          : 'Regenerate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* OFFER — from campaign.offer directly, never AI copy text */}
        <SectionCard title="Offer">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-neutral-900">{campaign.offer.headline}</p>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-brand-600 text-2xl font-bold">₹{campaign.offer.price}</span>
              {campaign.offer.originalPrice && (
                <span className="text-neutral-400 line-through">
                  ₹{campaign.offer.originalPrice}
                </span>
              )}
            </div>
            {campaign.offer.description && (
              <p className="text-neutral-600">{campaign.offer.description}</p>
            )}
            {campaign.offer.terms && (
              <p className="text-sm text-neutral-500">Terms: {campaign.offer.terms}</p>
            )}
            <p className="text-sm text-neutral-500">
              Valid {format(new Date(campaign.offer.validityStart), 'PPP')} &ndash;{' '}
              {format(new Date(campaign.offer.validityEnd), 'PPP')}
            </p>
            <p className="text-sm text-neutral-500">
              Call to action: {CTA_LABELS[campaign.cta] || campaign.cta}
            </p>
          </div>
        </SectionCard>

        {/* CAPTION */}
        <SectionCard title="Caption">
          {captionAssets.length === 0 ? (
            <EmptyHint text="No captions generated." />
          ) : (
            <div className="space-y-4">
              {captionAssets.map((asset) => {
                const content = asset.content as CaptionContent;
                return (
                  <div key={asset.assetId} className="rounded-lg border border-neutral-200 p-4">
                    <p className="whitespace-pre-wrap text-neutral-800">{content?.text}</p>
                    {content?.hashtags && content.hashtags.length > 0 && (
                      <p className="text-brand-600 mt-2 text-sm">{content.hashtags.join(' ')}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(asset, `caption-${asset.assetId}`)}
                        className="bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                      >
                        {copyButtonLabel(`caption-${asset.assetId}`)}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerate(asset, 'Caption')}
                        disabled={isAssetRegenerating(asset.assetId, 'caption')}
                        className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
                      >
                        {isAssetRegenerating(asset.assetId, 'caption')
                          ? 'Regenerating...'
                          : 'Regenerate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* AD COPY — real generated content (copyPack.adCopies); not in the
            wireframe's headline list but genuine paid-for output, so shown
            rather than silently dropped. */}
        {adCopyAssets.length > 0 && (
          <SectionCard title="Ad Copy">
            <div className="space-y-4">
              {adCopyAssets.map((asset) => {
                const content = asset.content as AdCopyContent;
                return (
                  <div key={asset.assetId} className="rounded-lg border border-neutral-200 p-4">
                    {content?.headline && (
                      <p className="font-semibold text-neutral-900">{content.headline}</p>
                    )}
                    {content?.primaryText && (
                      <p className="mt-1 text-neutral-700">{content.primaryText}</p>
                    )}
                    {content?.description && (
                      <p className="mt-1 text-sm text-neutral-500">{content.description}</p>
                    )}
                    {content?.cta && (
                      <p className="text-brand-600 mt-2 text-sm font-medium">{content.cta}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(asset, `adcopy-${asset.assetId}`)}
                        className="bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                      >
                        {copyButtonLabel(`adcopy-${asset.assetId}`)}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerate(asset, 'Ad Copy')}
                        disabled={isAssetRegenerating(asset.assetId, 'ad_copy')}
                        className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
                      >
                        {isAssetRegenerating(asset.assetId, 'ad_copy')
                          ? 'Regenerating...'
                          : 'Regenerate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* WHATSAPP MESSAGE */}
        <SectionCard title="WhatsApp Message">
          {!whatsappAsset ? (
            <EmptyHint text="No WhatsApp message generated." />
          ) : (
            (() => {
              const content = whatsappAsset.content as WhatsAppContent;
              return (
                <div>
                  <p className="rounded-lg bg-neutral-50 p-4 whitespace-pre-wrap text-neutral-800">
                    {content?.message}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(whatsappAsset, `whatsapp-${whatsappAsset.assetId}`)}
                      className="bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                    >
                      {copyButtonLabel(`whatsapp-${whatsappAsset.assetId}`)}
                    </button>
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      disabled={isSharingWhatsApp}
                      className="rounded-lg bg-[#25D366] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Share on WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegenerate(whatsappAsset, 'WhatsApp Message')}
                      disabled={isAssetRegenerating(whatsappAsset.assetId, 'whatsapp')}
                      className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
                    >
                      {isAssetRegenerating(whatsappAsset.assetId, 'whatsapp')
                        ? 'Regenerating...'
                        : 'Regenerate'}
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </SectionCard>

        {/* STORY */}
        <SectionCard title="Story">
          {storyConceptAssets.length === 0 ? (
            <EmptyHint text="No story content generated." />
          ) : (
            <div className="space-y-6">
              {storyConceptAssets.map((asset) => {
                const content = asset.content as StoryConceptContent;
                return (
                  <div key={asset.assetId} className="rounded-lg border border-neutral-200 p-4">
                    {content.overallTheme && (
                      <p className="mb-3 text-sm font-medium text-neutral-500">
                        Theme: {content.overallTheme}
                      </p>
                    )}
                    <div className="space-y-3">
                      {(content.frames || []).map((frame, i) => (
                        <div key={i} className="border-brand-200 border-l-2 pl-3">
                          <p className="text-xs font-medium text-neutral-400">Frame {i + 1}</p>
                          <p className="text-neutral-800">{frame.copy}</p>
                          {frame.visualCue && (
                            <p className="text-sm text-neutral-500">Visual: {frame.visualCue}</p>
                          )}
                          {frame.cta && (
                            <p className="text-brand-600 text-sm font-medium">{frame.cta}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(asset, `story-${asset.assetId}`)}
                        className="bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                      >
                        {copyButtonLabel(`story-${asset.assetId}`)}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerate(asset, 'Story')}
                        disabled={isAssetRegenerating(asset.assetId, 'story')}
                        className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
                      >
                        {isAssetRegenerating(asset.assetId, 'story')
                          ? 'Regenerating...'
                          : 'Regenerate'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {storyFrameImageAssets.length > 0 && (
                <p className="text-sm text-neutral-500">
                  {storyFrameImageAssets.length} story frame image
                  {storyFrameImageAssets.length === 1 ? '' : 's'} available in the Creative section
                  above.
                </p>
              )}
            </div>
          )}
        </SectionCard>

        {/* REEL CONCEPT */}
        <SectionCard title="Reel Concept">
          {reelConceptAssets.length === 0 ? (
            <EmptyHint text="No reel concept generated." />
          ) : (
            <div className="space-y-6">
              {reelConceptAssets.map((asset) => {
                const content = asset.content as ReelConceptContent;
                return (
                  <div key={asset.assetId} className="rounded-lg border border-neutral-200 p-4">
                    {content.hook && (
                      <p className="font-semibold text-neutral-900">Hook: {content.hook}</p>
                    )}
                    {content.scenes && content.scenes.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {content.scenes.map((scene, i) => (
                          <div key={i} className="border-brand-200 border-l-2 pl-3">
                            <p className="text-xs font-medium text-neutral-400">
                              Scene {i + 1}
                              {scene.duration ? ` · ${scene.duration}` : ''}
                            </p>
                            <p className="text-neutral-800">{scene.description}</p>
                            {scene.visualDirection && (
                              <p className="text-sm text-neutral-500">
                                Visual: {scene.visualDirection}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {content.productReveal && (
                      <p className="mt-2 text-sm text-neutral-600">
                        Product reveal: {content.productReveal}
                      </p>
                    )}
                    {content.cta && (
                      <p className="text-brand-600 mt-2 text-sm font-medium">{content.cta}</p>
                    )}
                    {content.caption && (
                      <p className="mt-2 text-sm text-neutral-500">Caption: {content.caption}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(asset, `reel-${asset.assetId}`)}
                        className="bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                      >
                        {copyButtonLabel(`reel-${asset.assetId}`)}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerate(asset, 'Reel Concept')}
                        disabled={isAssetRegenerating(asset.assetId, 'reel')}
                        className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
                      >
                        {isAssetRegenerating(asset.assetId, 'reel')
                          ? 'Regenerating...'
                          : 'Regenerate'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {reelStoryboardAsset && (
                <p className="text-sm text-neutral-500">
                  A reel cover image is available in the Creative section above.
                </p>
              )}
            </div>
          )}
        </SectionCard>

        {/* ACTIONS */}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={handleDownloadCopy}
            disabled={isDownloadingCopy}
            className="rounded-lg bg-neutral-900 px-6 py-3 font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDownloadingCopy ? 'Downloading...' : 'Download Copy'}
          </button>
          {whatsappAsset && (
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={isSharingWhatsApp}
              className="rounded-lg bg-[#25D366] px-6 py-3 font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Share on WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
