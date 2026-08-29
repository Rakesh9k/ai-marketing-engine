'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { businessService, campaignService } from '@/services/database';
import type { Business, Campaign, CampaignStatus } from '@/types';
import Link from 'next/link';
import { BusinessSelector } from '@/components/shared/BusinessSelector';

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const statusColors: Record<CampaignStatus, string> = {
    draft: 'bg-neutral-100 text-neutral-700',
    validating: 'bg-brand-100 text-brand-700',
    queued: 'bg-brand-100 text-brand-700',
    analyzing: 'bg-brand-100 text-brand-700',
    strategizing: 'bg-brand-100 text-brand-700',
    generating_copy: 'bg-brand-100 text-brand-700',
    generating_creatives: 'bg-brand-100 text-brand-700',
    validating_output: 'bg-brand-100 text-brand-700',
    generated: 'bg-brand-100 text-brand-700',
    verified: 'bg-success-100 text-success-700',
    completed: 'bg-success-100 text-success-700',
    failed: 'bg-error-100 text-error-700',
  };

  return (
    <Link href={`/campaigns/${campaign.campaignId}`} className="block">
      <div className="rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:bg-neutral-50">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="font-medium text-neutral-900">{campaign.offer.headline}</h3>
            <p className="mt-0.5 text-sm text-neutral-500 capitalize">
              {campaign.objective.replace('_', ' ')}
            </p>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs ${statusColors[campaign.status]}`}>
            {campaign.status}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-500">
          <span>
            Created:{' '}
            {new Date(campaign.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <span>Credits: {campaign.creditsReserved}</span>
        </div>
      </div>
    </Link>
  );
}

function CampaignsList({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 9h6M9 15h4" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-neutral-900">No campaigns yet</h3>
        <p className="mt-1 text-sm text-neutral-500">Create your first campaign to get started</p>
        <Link href="/campaigns/new" className="mt-6 inline-block">
          <button className="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Campaign
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.campaignId} campaign={campaign} />
      ))}
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
      <svg
        className="mx-auto h-12 w-12 text-neutral-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h6M9 15h4" />
      </svg>
      <h3 className="mt-4 text-lg font-medium text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm text-neutral-500">{description}</p>
      <div className="mt-6">{action}</div>
    </div>
  );
}

export default function CampaignsPage() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [__error, setError] = useState<string | null>(null);
  void __error;
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');

  useEffect(() => {
    async function loadBusinesses() {
      if (!user) return;
      try {
        const businessesData = await businessService.getByUserId(user.uid);
        setBusinesses(businessesData);
        if (businessesData.length > 0) {
          const firstBusiness = businessesData[0]!;
          setSelectedBusinessId(firstBusiness.businessId);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load businesses');
      }
    }
    void loadBusinesses();
  }, [user]);

  useEffect(() => {
    if (selectedBusinessId && user) {
      const businessId = selectedBusinessId;
      async function loadCampaigns() {
        try {
          setLoading(true);
          const { campaigns: campaignsData } = await campaignService.listByBusiness(
            businessId,
            statusFilter !== 'all' ? statusFilter : undefined,
            undefined,
            50
          );
          setCampaigns(campaignsData);
        } catch (err) {
          console.error(err);
          setError('Failed to load campaigns');
        } finally {
          setLoading(false);
        }
      }
      void loadCampaigns();
    }
  }, [selectedBusinessId, statusFilter, user]);

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

  const handleSelectBusiness = (businessId: string) => {
    setSelectedBusinessId(businessId);
  };

  return (
    <div className="bg-bg-primary min-h-screen">
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Campaigns</h1>
            <p className="mt-1 text-neutral-500">Manage your marketing campaigns</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
              className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none sm:w-48"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="validating">Validating</option>
              <option value="queued">Queued</option>
              <option value="analyzing">Analyzing</option>
              <option value="strategizing">Strategizing</option>
              <option value="generating_copy">Generating Copy</option>
              <option value="generating_creatives">Generating Creatives</option>
              <option value="validating_output">Validating Output</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <BusinessSelector
              businesses={businesses}
              selectedBusinessId={selectedBusinessId}
              onSelect={handleSelectBusiness}
            />
          </div>
        </div>
      </div>

      {businesses.length === 0 ? (
        <EmptyState
          title="No business set up yet"
          description="Create your first business to start generating campaigns"
          action={
            <Link href="/onboarding/business">
              <button className="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Business
              </button>
            </Link>
          }
        />
      ) : (
        <>
          <CampaignsList campaigns={campaigns} />
        </>
      )}
    </div>
  );
}
