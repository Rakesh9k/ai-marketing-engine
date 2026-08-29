'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { campaignService, campaignAssetService } from '@/services/database';
import type { Campaign, CampaignAsset, AssetType } from '@/types';
import { CampaignDetailContent } from '@/components/campaign/CampaignDetailContent';

interface CampaignDetailPageProps {
  params: Promise<{ campaignId: string }>;
}

export default function CampaignDetailPage({ params: _params }: CampaignDetailPageProps) {
  const { user } = useAuth();
  const paramsPromise = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assets, setAssets] = useState<CampaignAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AssetType>('poster');

  useEffect(() => {
    async function loadCampaign() {
      const resolvedParams = await paramsPromise;
      const campaignId = Array.isArray(resolvedParams['campaignId'])
        ? resolvedParams['campaignId'][0]
        : resolvedParams['campaignId'];
      if (!user || !campaignId) return;
      try {
        setLoading(true);
        const [campaignData, assetsData] = await Promise.all([
          campaignService.get(campaignId),
          campaignAssetService.listByCampaign(campaignId),
        ]);
        setCampaign(campaignData);
        setAssets(assetsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    void loadCampaign();
  }, [user, paramsPromise]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="border-brand-600 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Campaign not found</h1>
          <Link href="/campaigns" className="text-brand-600 hover:text-brand-700 mt-4">
            Back to campaigns
          </Link>
        </div>
      </div>
    );
  }

  const truthCheckStatus = campaign.metadata?.truthCheckStatus as
    'PASS' | 'FAIL' | 'REVIEW_REQUIRED' | undefined;

  return (
    <CampaignDetailContent
      campaign={campaign}
      assets={assets}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      truthCheckStatus={truthCheckStatus}
    />
  );
}
