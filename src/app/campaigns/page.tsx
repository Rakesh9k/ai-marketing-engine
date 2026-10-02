'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { businessService, campaignService } from '@/services/database';
import type { Business, Campaign, CampaignStatus } from '@/types';
import Link from 'next/link';
import { MascotScene } from '@/components/mascot/MascotScene';
import { PosterIllustration, SparkIllustration } from '@/components/illustrations/Illustrations';
import { PageSkeleton } from '@/components/motion/PageSkeleton';
import { InteractiveCard } from '@/components/motion/InteractiveCard';
import { MagneticWrap } from '@/components/motion/MagneticWrap';
import { fadeInUpVariants, staggerContainerVariants } from '@/lib/motion';

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const reduceMotion = useReducedMotion();

  const statusColors: Record<CampaignStatus, string> = {
    draft: 'bg-bg-tertiary text-text-secondary',
    validating: 'bg-brand-50 text-brand-700',
    queued: 'bg-brand-50 text-brand-700',
    analyzing: 'bg-brand-50 text-brand-700',
    strategizing: 'bg-brand-50 text-brand-700',
    generating_copy: 'bg-brand-50 text-brand-700',
    generating_creatives: 'bg-brand-50 text-brand-700',
    validating_output: 'bg-brand-50 text-brand-700',
    generated: 'bg-brand-50 text-brand-700',
    verified: 'bg-success-100 text-success-700',
    completed: 'bg-success-100 text-success-700',
    failed: 'bg-error-100 text-error-700',
  };

  return (
    <motion.div variants={reduceMotion ? undefined : fadeInUpVariants}>
      <Link href={`/campaigns/${campaign.campaignId}`} className="block">
        <InteractiveCard
          bare
          className="border-border-light bg-surface rounded-xl border p-5 transition-shadow duration-200 hover:shadow-sm"
        >
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h3 className="text-text-primary font-semibold">{campaign.offer.headline}</h3>
              <p className="text-text-secondary mt-0.5 text-sm capitalize">
                {campaign.objective.replace('_', ' ')}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[campaign.status]}`}
            >
              {campaign.status}
            </span>
          </div>
          <div className="text-text-tertiary border-border-light mt-3 flex items-center gap-4 border-t pt-3 text-xs">
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
        </InteractiveCard>
      </Link>
    </motion.div>
  );
}

function CampaignsList({ campaigns }: { campaigns: Campaign[] }) {
  const reduceMotion = useReducedMotion();

  if (campaigns.length === 0) {
    return (
      <div className="border-border-light bg-surface rounded-2xl border p-8 text-center shadow-sm">
        <MascotScene
          pose="point"
          align="center"
          message="No campaigns yet."
          supporting="Let's make your first localized campaign pack together."
          decoration={<SparkIllustration size={22} />}
        >
          <div className="mt-4 flex justify-center">
            <PosterIllustration size={64} className="opacity-80" />
          </div>
          <MagneticWrap className="mt-6">
            <Link
              href="/campaigns/new"
              className="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150"
            >
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
            </Link>
          </MagneticWrap>
        </MascotScene>
      </div>
    );
  }

  return (
    <motion.div
      variants={reduceMotion ? undefined : staggerContainerVariants}
      initial={reduceMotion ? undefined : 'hidden'}
      animate={reduceMotion ? undefined : 'visible'}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.campaignId} campaign={campaign} />
      ))}
    </motion.div>
  );
}

export default function CampaignsPage() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');

  useEffect(() => {
    async function loadBusinesses() {
      if (!user) return;
      try {
        const businessesData = await businessService.getByUserId(user.uid);
        setBusinesses(businessesData);
        if (businessesData.length > 0) {
          setSelectedBusinessId(businessesData[0]!.businessId);
        }
      } catch (err) {
        console.error(err);
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
          const filter = statusFilter === 'all' ? undefined : statusFilter;
          const result = await campaignService.listByBusiness(businessId, filter);
          setCampaigns(result.campaigns);
          setError(null);
        } catch (err) {
          console.error(err);
          setError('Failed to load campaigns');
        } finally {
          setLoading(false);
        }
      }
      void loadCampaigns();
    }
  }, [selectedBusinessId, user, statusFilter]);

  if (loading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-text-primary text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-text-secondary mt-1 text-sm">
            View and manage all marketing campaign packs
          </p>
        </div>
        <div className="flex items-center gap-3">
          {businesses.length > 1 && (
            <select
              value={selectedBusinessId || ''}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              className="border-border-medium bg-surface text-text-primary focus:ring-brand-500 rounded-lg border px-3 py-2 text-sm focus:outline-none"
              aria-label="Select business"
            >
              {businesses.map((business) => (
                <option key={business.businessId} value={business.businessId}>
                  {business.name}
                </option>
              ))}
            </select>
          )}
          <MagneticWrap>
            <Link
              href="/campaigns/new"
              className="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors duration-150"
            >
              + Create Campaign
            </Link>
          </MagneticWrap>
        </div>
      </div>

      {error ? (
        <div className="border-border-light bg-surface rounded-xl border p-8 text-center">
          <p className="text-error-600 font-medium">{error}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border-border-light flex gap-2 overflow-x-auto border-b pb-2">
            {(['all', 'completed', 'verified', 'draft', 'failed'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  statusFilter === filter
                    ? 'bg-brand-50 text-brand-700 border-brand-200 border'
                    : 'text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <CampaignsList campaigns={campaigns} />
        </div>
      )}
    </div>
  );
}
