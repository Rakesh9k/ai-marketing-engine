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
import { formatINR } from '@/lib/utils';

function StatCard({
  title,
  value,
  description,
  icon,
  trend,
}: {
  title: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
  trend?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
          {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
          {trend && <p className="text-success-600 mt-2 text-sm font-medium">{trend}</p>}
        </div>
        <div className="bg-brand-50 text-brand-600 rounded-lg p-2">{icon}</div>
      </div>
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
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
        <svg
          className="h-8 w-8 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm text-neutral-500">{description}</p>
      <div className="mt-6">{action}</div>
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
      <div className="bg-brand-50 text-brand-700 flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
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
        <span className="font-medium">{businesses[0].name}</span>
      </div>
    ) : null;
  }

  return (
    <select
      value={selectedBusinessId || ''}
      onChange={(e) => onSelect(e.target.value)}
      className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
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

function CampaignsList({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <div className="divide-y divide-neutral-200">
      {campaigns.map((campaign) => {
        const statusClass =
          campaign.status === 'completed'
            ? 'bg-success-100 text-success-700'
            : campaign.status === 'draft'
              ? 'bg-neutral-100 text-neutral-700'
              : campaign.status === 'failed'
                ? 'bg-error-100 text-error-700'
                : 'bg-brand-100 text-brand-700';
        return (
          <Link
            key={campaign.campaignId}
            href={`/campaigns/${campaign.campaignId}`}
            className="block p-4 transition-colors hover:bg-neutral-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-neutral-900">{campaign.offer.headline}</h3>
                <p className="text-sm text-neutral-500 capitalize">
                  {campaign.objective.replace('_', ' ')}
                </p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs ${statusClass}`}>
                {campaign.status}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
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
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      void loadData();
    }
  }, [user, selectedBusinessId]);

  useEffect(() => {
    if (selectedBusinessId && user) {
      const businessId = selectedBusinessId;
      async function loadBusinessData() {
        try {
          const [usageData, campaignsData] = await Promise.all([
            usageService.getCurrentPeriod(user!.uid),
            campaignService.listByBusiness(businessId, undefined, undefined, 5),
          ]);
          setUsage(usageData);
          setCampaigns(campaignsData.campaigns);
        } catch (err) {
          console.error(err);
        }
      }
      void loadBusinessData();
    }
  }, [selectedBusinessId, user?.uid, user]);

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

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-error-600">{error}</p>
      </div>
    );
  }

  const creditsIncluded = subscription?.creditsIncluded || 100;
  const creditsUsed = usage?.creditsUsed || 0;
  const creditsRemaining = creditsIncluded - creditsUsed;
  const campaignsThisPeriod = usage?.campaignsCreated || 0;
  const campaignLimit =
    subscription?.planId === 'free'
      ? 1
      : subscription?.planId === 'starter'
        ? 5
        : subscription?.planId === 'business'
          ? 12
          : 30;

  const CampaignsIcon = () => (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 9h6M9 15h4" />
    </svg>
  );

  const ProductsIcon = () => (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M20 6L12 2L4 6L4 18L12 22L20 18L20 6Z" />
      <path d="M12 22V12" />
    </svg>
  );

  const CreditsIcon = () => (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );

  const handleSelectBusiness = (businessId: string) => {
    setSelectedBusinessId(businessId);
  };

  return (
    <div className="bg-bg-primary min-h-screen">
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
            <p className="mt-1 text-neutral-500">
              Welcome back, {user?.displayName || user?.email || 'User'}!
            </p>
          </div>
          <div className="flex items-center gap-3">
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
              <Button>Create Business</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Credits Remaining"
              value={creditsRemaining.toString()}
              description={`of ${creditsIncluded} this period`}
              icon={<CreditsIcon />}
              trend={creditsRemaining < 20 ? 'Low credits - consider upgrading' : undefined}
            />
            <StatCard
              title="Campaigns This Period"
              value={`${campaignsThisPeriod} / ${campaignLimit}`}
              description="campaigns created"
              icon={<CampaignsIcon />}
              trend={campaignsThisPeriod >= campaignLimit ? 'Limit reached' : undefined}
            />
            <StatCard
              title="Active Campaigns"
              value={campaigns
                .filter((c) => c.status !== 'completed' && c.status !== 'failed')
                .length.toString()}
              description="in progress or draft"
              icon={<CampaignsIcon />}
            />
            <StatCard
              title="Current Plan"
              value={
                subscription?.planId
                  ? subscription.planId.charAt(0).toUpperCase() + subscription.planId.slice(1)
                  : 'Free'
              }
              description={`${formatINR(subscription?.creditsIncluded || 100)} credits/month`}
              icon={<CreditsIcon />}
            />
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900">Recent Campaigns</h2>
                  <Link
                    href="/campaigns"
                    className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                  >
                    View all
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-neutral-200">
                {campaigns.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-neutral-500">No campaigns yet</p>
                    <Link href="/campaigns">
                      <Button className="mt-4">Create your first campaign</Button>
                    </Link>
                  </div>
                ) : (
                  <CampaignsList campaigns={campaigns} />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900">Quick Actions</h2>
              </div>
              <div className="space-y-3 p-6">
                <Link href="/campaigns/new">
                  <Button className="w-full justify-start gap-3">
                    <span className="bg-brand-100 text-brand-600 flex h-8 w-8 items-center justify-center rounded-lg">
                      <CampaignsIcon />
                    </span>
                    <div>
                      <p className="font-medium text-neutral-900">Create Campaign</p>
                      <p className="text-sm text-neutral-500">Generate a new marketing campaign</p>
                    </div>
                  </Button>
                </Link>
                <Link href="/brand">
                  <Button variant="outline" className="w-full justify-start gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v8M8 12h8" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-medium text-neutral-900">Set Up Brand Kit</p>
                      <p className="text-sm text-neutral-500">Configure colors, fonts, and tone</p>
                    </div>
                  </Button>
                </Link>
                <Link href="/products">
                  <Button variant="outline" className="w-full justify-start gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                      <ProductsIcon />
                    </span>
                    <div>
                      <p className="font-medium text-neutral-900">Add Products</p>
                      <p className="text-sm text-neutral-500">
                        Manage your menu items and services
                      </p>
                    </div>
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900">Your Business</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {businesses.map((business) => (
                  <div
                    key={business.businessId}
                    className="rounded-lg border border-neutral-200 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-neutral-900">{business.name}</h3>
                        <p className="text-sm text-neutral-500 capitalize">{business.category}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          business.status === 'active'
                            ? 'bg-success-100 text-success-700'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {business.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-neutral-600">
                      <p>
                        {business.location.city}, {business.location.state}
                      </p>
                      <p>{business.contact.phone}</p>
                      {business.contact.whatsapp && <p>WhatsApp: {business.contact.whatsapp}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
