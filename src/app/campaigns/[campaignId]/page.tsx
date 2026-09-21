'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { campaignService, campaignAssetService, businessService } from '@/services/database';
import { callFunction } from '@/services/api';
import type { Business, Campaign, CampaignAsset } from '@/types';
import { CampaignDetailContent } from '@/components/campaign/CampaignDetailContent';
import { MascotScene } from '@/components/mascot/MascotScene';
import { WrenchIllustration } from '@/components/illustrations/Illustrations';
import { Button } from '@/components/ui/Button';

interface CampaignDetailPageProps {
  params: Promise<{ campaignId: string }>;
}

export default function CampaignDetailPage({ params: _params }: CampaignDetailPageProps) {
  const { user } = useAuth();
  const paramsPromise = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  // Captured once on mount, not derived on every render — the URL is
  // scrubbed of `created` right after, and re-deriving from searchParams
  // would make the banner vanish the instant that happens.
  const [justCreated] = useState(() => searchParams.get('created') === '1');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assets, setAssets] = useState<CampaignAsset[]>([]);
  // Nullable independently of `campaign`: the business fetch can fail (or
  // the business can simply not exist any more) without invalidating the
  // rest of the page — CampaignDetailContent degrades the WhatsApp action
  // to "unavailable" rather than crashing when this is null.
  const [business, setBusiness] = useState<Business | null>(null);
  // Phase 13: whether the campaign's stored Truth Check result is still
  // current — the ALREADY-BUILT getCampaign Cloud Function (Phase 6)
  // recomputes this by comparing the fingerprint of the facts Truth Check
  // originally checked against the business/product's CURRENT data, but
  // was never actually called from anywhere in the frontend before this
  // fix — the review page read the campaign directly from Firestore,
  // which only ever reflects the fingerprint as it was at generation
  // time. Best-effort: a failure here must not block the page, and a
  // stale campaign is never re-verified automatically — it only changes
  // how its EXISTING (historical) Truth Check result is displayed.
  const [isVerificationStale, setIsVerificationStale] = useState(false);
  const [loading, setLoading] = useState(true);
  // Distinguishes "doesn't exist / not yours" (Firestore rules deny reads
  // for campaigns you don't own — see firestore.rules — so a denied read
  // and a genuinely missing campaign look identical here, which is
  // intentional: it avoids revealing whether a campaign ID exists at all
  // to someone who isn't authorized to see it) from a real network/backend
  // failure, so the customer sees an accurate, friendly message either way.
  const [loadError, setLoadError] = useState<'not-found' | 'network' | null>(null);

  useEffect(() => {
    async function loadCampaign() {
      const resolvedParams = await paramsPromise;
      const campaignId = Array.isArray(resolvedParams['campaignId'])
        ? resolvedParams['campaignId'][0]
        : resolvedParams['campaignId'];
      if (!user || !campaignId) return;
      try {
        setLoading(true);
        setLoadError(null);
        const [campaignData, assetsData] = await Promise.all([
          campaignService.get(campaignId),
          campaignAssetService.listByCampaign(campaignId),
        ]);
        if (!campaignData) {
          setLoadError('not-found');
          return;
        }
        setCampaign(campaignData);
        setAssets(assetsData);

        // Best-effort: a failed business fetch must not block the campaign
        // page itself. CampaignDetailContent already handles business
        // being null by disabling the WhatsApp action gracefully.
        try {
          const businessData = await businessService.get(campaignData.businessId);
          setBusiness(businessData);
        } catch (businessErr) {
          console.error('Failed to load business for WhatsApp attribution:', businessErr);
          setBusiness(null);
        }

        try {
          const staleCheck = await callFunction<
            { campaignId: string; businessId: string },
            { isVerificationStale: boolean }
          >({
            functionName: 'getCampaign',
            data: { campaignId, businessId: campaignData.businessId },
          });
          setIsVerificationStale(staleCheck.isVerificationStale);
        } catch (staleErr) {
          console.error('Failed to check Truth Check staleness:', staleErr);
          setIsVerificationStale(false);
        }
      } catch (err) {
        console.error(err);
        setLoadError('network');
      } finally {
        setLoading(false);
      }
    }
    void loadCampaign();
  }, [user, paramsPromise]);

  // Strip `?created=1` from the URL once it's done its job so the success
  // banner doesn't reappear on a later refresh or if the link is shared.
  useEffect(() => {
    if (justCreated) {
      const url = new URL(window.location.href);
      url.searchParams.delete('created');
      router.replace(`${url.pathname}${url.search}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div
            className="border-brand-600 mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
            aria-hidden="true"
          />
          <p className="mt-4 text-sm text-neutral-500">Loading your campaign...</p>
        </div>
      </div>
    );
  }

  if (loadError === 'network') {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <MascotScene
          pose="concerned"
          align="center"
          message="Something got in the way."
          supporting="Please check your connection and try again."
          decoration={<WrenchIllustration size={20} />}
        >
          <div className="mt-4 flex justify-center gap-3">
            <Button size="sm" onClick={() => window.location.reload()}>
              Try again
            </Button>
            <Link
              href="/campaigns"
              className="text-brand-600 hover:text-brand-700 self-center text-sm"
            >
              Back to campaigns
            </Link>
          </div>
        </MascotScene>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <MascotScene
          pose="concerned"
          align="center"
          message="Campaign not found."
          supporting="This campaign doesn't exist or you don't have access to it."
        >
          <Link
            href="/campaigns"
            className="text-brand-600 hover:text-brand-700 mt-4 inline-block text-sm"
          >
            Back to campaigns
          </Link>
        </MascotScene>
      </div>
    );
  }

  const truthCheckStatus = campaign.metadata?.truthCheckStatus as
    'PASS' | 'FAIL' | 'REVIEW_REQUIRED' | undefined;

  return (
    <>
      {justCreated && (
        <div className="mb-6">
          <MascotScene
            pose="cheer"
            size="sm"
            message="Your campaign is ready."
            className="animate-scene-enter"
          />
        </div>
      )}
      <CampaignDetailContent
        campaign={campaign}
        assets={assets}
        truthCheckStatus={truthCheckStatus}
        business={business}
        isVerificationStale={isVerificationStale}
      />
    </>
  );
}
