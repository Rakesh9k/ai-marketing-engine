'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usageService, subscriptionService } from '@/services/database';
import type { Usage, Subscription, SubscriptionPlan } from '@/types';
import { formatINR } from '@/lib/utils';

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const isWarning = percentage > 80;
  const isDanger = percentage >= 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-neutral-600">{label}</span>
        <span className="font-medium text-neutral-900">
          {value} / {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
        <div
          className={`h-full transition-all duration-300 ${
            isDanger ? 'bg-error-500' : isWarning ? 'bg-warning-500' : 'bg-brand-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-right text-xs text-neutral-500">{Math.round(percentage)}% used</p>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
          {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
        </div>
        <div className="bg-brand-50 text-brand-600 rounded-lg p-2">{icon}</div>
      </div>
    </div>
  );
}

function PlanDetails({ subscription }: { subscription: Subscription | null }) {
  const planNames: Record<SubscriptionPlan, string> = {
    free: 'Free',
    starter: 'Starter',
    business: 'Business',
    agency: 'Agency',
  };

  const planLimits: Record<SubscriptionPlan, { campaigns: number; credits: number }> = {
    free: { campaigns: 1, credits: 100 },
    starter: { campaigns: 5, credits: 500 },
    business: { campaigns: 12, credits: 1200 },
    agency: { campaigns: 30, credits: 3000 },
  };

  const currentPlan = subscription?.planId || 'free';
  const limits = planLimits[currentPlan];

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-neutral-900">Current Plan</h3>
      <div className="bg-brand-50 border-brand-200 mb-6 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-brand-700 text-sm">Current Plan</p>
            <p className="text-brand-900 text-2xl font-bold">
              {planNames[subscription?.planId || 'free']}
            </p>
          </div>
          <div className="text-right">
            <p className="text-brand-700 text-sm">Monthly Price</p>
            <p className="text-brand-900 text-xl font-bold">
              {subscription?.planId === 'free'
                ? 'Free'
                : formatINR(
                    subscription?.planId === 'starter'
                      ? 499
                      : subscription?.planId === 'business'
                        ? 999
                        : 2499
                  )}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="mb-2 font-medium text-neutral-900">Monthly Limits</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProgressBar value={0} max={limits.campaigns} label="Campaigns" />
            <ProgressBar value={0} max={limits.credits} label="Credits" />
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-4">
          <h4 className="mb-2 font-medium text-neutral-900">Plan Details</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Monthly Credits</dt>
              <dd className="font-medium text-neutral-900">{limits.credits}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Campaigns per Month</dt>
              <dd className="font-medium text-neutral-900">{limits.campaigns}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Credit Value</dt>
              <dd className="font-medium text-neutral-900">1 Credit = ₹1</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Base Campaign Cost</dt>
              <dd className="font-medium text-neutral-900">100 Credits</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Asset Regeneration</dt>
              <dd className="font-medium text-neutral-900">10 Credits</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Image Generation</dt>
              <dd className="font-medium text-neutral-900">20 Credits per image</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

function UsageHistory({ usageHistory }: { usageHistory: Usage[] }) {
  if (usageHistory.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-neutral-400"
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
        <h3 className="mt-4 text-lg font-medium text-neutral-900">No usage history</h3>
        <p className="mt-1 text-sm text-neutral-500">Your usage history will appear here</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <table className="w-full">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-500 uppercase">
              Period
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-500 uppercase">
              Plan
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-500 uppercase">
              Campaigns
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-500 uppercase">
              Credits Used
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-500 uppercase">
              Images
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-500 uppercase">
              Copy Generations
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-500 uppercase">
              Regenerations
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {usageHistory.map((usage) => (
            <tr key={usage.usageId} className="hover:bg-neutral-50">
              <td className="px-4 py-3 text-sm text-neutral-900">
                {new Date(usage.periodStart).toLocaleDateString('en-IN', {
                  month: 'short',
                  year: 'numeric',
                })}
              </td>
              <td className="px-4 py-3 text-sm text-neutral-900 capitalize">{usage.planId}</td>
              <td className="px-4 py-3 text-sm text-neutral-900">{usage.campaignsCreated}</td>
              <td className="px-4 py-3 text-sm text-neutral-900">{usage.creditsUsed}</td>
              <td className="px-4 py-3 text-sm text-neutral-900">{usage.imagesGenerated}</td>
              <td className="px-4 py-3 text-sm text-neutral-900">{usage.copyGenerations}</td>
              <td className="px-4 py-3 text-sm text-neutral-900">{usage.regenerations}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UsagePage() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageHistory, setUsageHistory] = useState<Usage[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);
        const [usageData, subscriptionData, historyData] = await Promise.all([
          usageService.getCurrentPeriod(user.uid),
          subscriptionService.getByUserId(user.uid),
          usageService.listByUser(user.uid, 12),
        ]);
        setUsage(usageData);
        setSubscription(subscriptionData);
        setUsageHistory(historyData);
      } catch (err) {
        console.error(err);
        setError('Failed to load usage data');
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [user]);

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

  const currentUsage = usage;
  const currentSubscription = subscription;
  const creditsIncluded = currentSubscription?.creditsIncluded || 100;
  const creditsUsed = currentUsage?.creditsUsed || 0;
  const creditsRemaining = creditsIncluded - creditsUsed;
  const __campaignsCreated = currentUsage?.campaignsCreated || 0;
  void __campaignsCreated;

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

  const ImagesIcon = () => (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );

  const CopyIcon = () => (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );

  const RegenIcon = () => (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );

  return (
    <div className="bg-bg-primary min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Usage & Credits</h1>
        <p className="mt-1 text-neutral-500">Track your credit usage and campaign activity</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Credits Remaining"
          value={creditsRemaining.toString()}
          description={`of ${creditsIncluded} this period`}
          icon={<CreditsIcon />}
        />
        <StatCard
          title="Campaigns This Period"
          value={currentUsage?.campaignsCreated?.toString() || '0'}
          description="campaigns created"
          icon={<CampaignsIcon />}
        />
        <StatCard
          title="Images Generated"
          value={currentUsage?.imagesGenerated?.toString() || '0'}
          description="total images"
          icon={<ImagesIcon />}
        />
        <StatCard
          title="Copy Generations"
          value={currentUsage?.copyGenerations?.toString() || '0'}
          description="total generations"
          icon={<CopyIcon />}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PlanDetails subscription={subscription} />
        </div>
        <div>
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Usage Breakdown</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
                <div className="flex items-center gap-3">
                  <CreditsIcon />
                  <div>
                    <p className="text-sm text-neutral-500">Credits Used</p>
                    <p className="font-medium text-neutral-900">
                      {creditsUsed} / {creditsIncluded}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-neutral-900">
                    {creditsRemaining} remaining
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
                <div className="flex items-center gap-3">
                  <CampaignsIcon />
                  <div>
                    <p className="text-sm text-neutral-500">Campaigns Created</p>
                    <p className="font-medium text-neutral-900">
                      {currentUsage?.campaignsCreated || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
                <div className="flex items-center gap-3">
                  <ImagesIcon />
                  <div>
                    <p className="text-sm text-neutral-500">Images Generated</p>
                    <p className="font-medium text-neutral-900">
                      {currentUsage?.imagesGenerated || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
                <div className="flex items-center gap-3">
                  <CopyIcon />
                  <div>
                    <p className="text-sm text-neutral-500">Copy Generations</p>
                    <p className="font-medium text-neutral-900">
                      {currentUsage?.copyGenerations || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
                <div className="flex items-center gap-3">
                  <RegenIcon />
                  <div>
                    <p className="text-sm text-neutral-500">Regenerations</p>
                    <p className="font-medium text-neutral-900">
                      {currentUsage?.regenerations || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
                <div className="flex items-center gap-3">
                  <svg
                    className="h-5 w-5 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M23 4v6h-6"
                    />
                    <path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                  <div>
                    <p className="text-sm text-neutral-500">Regenerations</p>
                    <p className="font-medium text-neutral-900">
                      {currentUsage?.regenerations || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Usage History</h2>
        <UsageHistory usageHistory={usageHistory} />
      </div>
    </div>
  );
}
