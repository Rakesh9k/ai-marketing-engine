'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  businessService,
  usageService,
  campaignService,
  subscriptionService,
} from '@/services/database';
import type { Business, Usage, Campaign, Subscription } from '@/types';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { MascotScene } from '@/components/mascot/MascotScene';
import { PageSkeleton } from '@/components/motion/PageSkeleton';
import { PosterIllustration, SparkIllustration } from '@/components/illustrations/Illustrations';

import { MarketingCommandCenter } from '@/components/dashboard/MarketingCommandCenter';
import { QuickActionsGrid } from '@/components/dashboard/QuickActionsGrid';
import { RecentCampaignsSection } from '@/components/dashboard/RecentCampaignsSection';
import { PerformanceAndAISuggestions } from '@/components/dashboard/PerformanceAndAISuggestions';
import { RightActivityColumn } from '@/components/dashboard/RightActivityColumn';

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
    <div className="border-border-light bg-surface rounded-2xl border p-8 text-center shadow-sm">
      <MascotScene
        pose="curious"
        align="center"
        message={title}
        supporting={description}
        decoration={<SparkIllustration size={22} />}
      >
        <div className="mt-4 flex justify-center">
          <PosterIllustration size={56} className="opacity-80" />
        </div>
        <div className="mt-6 flex justify-center">{action}</div>
      </MascotScene>
    </div>
  );
}

function BusinessSelector({
  businesses,
  selectedBusinessId,
  onSelect,
}: {
  businesses: Business[];
  selectedBusinessId: string | null;
  onSelect: (id: string) => void;
}) {
  if (businesses.length <= 1) {
    return businesses[0] ? (
      <div className="bg-brand-50 text-brand-700 border-brand-200/50 flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold">
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
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2-2v14a2 2 0 002 2h10a2 2 0 002-2z"
          />
        </svg>
        <span>{businesses[0].name}</span>
      </div>
    ) : null;
  }

  return (
    <select
      value={selectedBusinessId || ''}
      onChange={(e) => onSelect(e.target.value)}
      className="border-border-medium bg-surface text-text-primary focus:ring-brand-500 rounded-xl border px-3.5 py-2 text-sm font-semibold focus:ring-2 focus:outline-none"
      aria-label="Select business"
    >
      <option value="">Select a business</option>
      {businesses.map((business) => (
        <option key={business.businessId} value={business.businessId}>
          {business.name}
        </option>
      ))}
    </select>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);
        const [businessesData, subscriptionData] = await Promise.all([
          businessService.getByUserId(user.uid),
          subscriptionService.getByUserId(user.uid),
        ]);
        setBusinesses(businessesData);

        if (businessesData.length > 0) {
          const firstBusiness = businessesData[0]!;
          const firstBusinessId = selectedBusinessId ?? firstBusiness.businessId;
          setSelectedBusinessId(firstBusinessId);

          const [usageData, campaignsData] = await Promise.all([
            usageService.getCurrentPeriod(user.uid),
            campaignService.listByBusiness(firstBusinessId, undefined, undefined, 5),
          ]);
          setUsage(usageData);
          setCampaigns(campaignsData.campaigns);
        }

        setSubscription(subscriptionData);
      } catch (err) {
        console.error(err);
        setError('Something got in the way while loading your dashboard. Please refresh.');
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [user, selectedBusinessId]);

  if (loading) {
    return <PageSkeleton variant="cards" />;
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#FDFBF8] p-8 text-center">
        <div className="bg-error-50 border-error-200 text-error-600 max-w-md rounded-2xl border p-6">
          <p className="font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          title="No business set up yet"
          description="Let's set up your business profile to start creating high-converting local campaigns."
          action={
            <Link href="/onboarding">
              <Button
                variant="primary"
                size="lg"
                className="rounded-xl bg-[#E84D1A] font-semibold text-white"
              >
                Create Business
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const selectedBusiness =
    (businesses.find((b) => b.businessId === selectedBusinessId) || businesses[0]) ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 lg:px-8">
      {/* Workspace Sub-header with Business Selector */}
      <div className="flex flex-col gap-3 border-b border-[#F0EBE1] pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-[#757580] uppercase">
            Workspace
          </h2>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xl font-bold text-[#1A1A1E]">{selectedBusiness?.name}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BusinessSelector
            businesses={businesses}
            selectedBusinessId={selectedBusinessId}
            onSelect={(id) => setSelectedBusinessId(id)}
          />
        </div>
      </div>

      {/* Main 2-Column Dashboard Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Main Column (8 cols on desktop) */}
        <div className="space-y-8 lg:col-span-8">
          {/* 1. Hero Command Center */}
          <MarketingCommandCenter business={selectedBusiness} />

          {/* 2. Quick Actions */}
          <QuickActionsGrid />

          {/* 3. Your Recent Campaigns */}
          <RecentCampaignsSection campaigns={campaigns} />

          {/* 4. Performance & AI Suggestions */}
          <PerformanceAndAISuggestions />
        </div>

        {/* Activity & Insights Column (4 cols on desktop) */}
        <div className="lg:col-span-4">
          <RightActivityColumn business={selectedBusiness} />
        </div>
      </div>
    </div>
  );
}
