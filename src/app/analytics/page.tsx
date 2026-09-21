'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { businessService } from '@/services/database';
import { callFunction } from '@/services/api';
import type { Business } from '@/types';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { MascotScene } from '@/components/mascot/MascotScene';
import {
  ChartIllustration,
  WrenchIllustration,
  MagnifyingGlassIllustration,
} from '@/components/illustrations/Illustrations';

/**
 * Phase 32 — Analytics Dashboard.
 *
 * Every number on this page traces to a real `analytics_events` document
 * aggregated server-side by the `getAnalyticsDashboard` Cloud Function (see
 * functions/src/functions/analytics/getAnalyticsDashboard.ts) — nothing
 * here is computed, estimated, or invented client-side. Business isolation
 * is enforced by that function's `verifyBusinessAccess` call, not by
 * anything in this component; a business the signed-in user isn't
 * authorized for simply can't be requested (the callable rejects it before
 * any event data is read).
 */

interface DailyActivityPoint {
  date: string;
  campaignsGenerated: number;
  assetsDownloaded: number;
  whatsappClicks: number;
}

interface AnalyticsDashboardResult {
  businessId: string;
  rangeDays: 7 | 30 | 90;
  rangeStart: string;
  rangeEnd: string;
  totals: {
    campaignsStarted: number;
    campaignsGenerated: number;
    assetsDownloaded: number;
    whatsappClicks: number;
  };
  dailyActivity: DailyActivityPoint[];
  eventsAggregated: number;
  truncated: boolean;
  subscription: { planId: string; status: string } | null;
}

const RANGE_OPTIONS: ReadonlyArray<{ value: 7 | 30 | 90; label: string }> = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <p className="text-sm font-medium text-neutral-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
      {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
    </div>
  );
}

/**
 * One primary series (campaigns generated per day), thin rounded bars, a
 * single brand-orange fill — no dual axes, no legend needed for a single
 * series. Each bar carries a native <title> so the exact count is
 * available on hover/focus without a custom tooltip layer.
 */
function ActivityChart({ data }: { data: DailyActivityPoint[] }) {
  const width = 800;
  const height = 180;
  const paddingBottom = 20;
  const max = Math.max(1, ...data.map((d) => d.campaignsGenerated));
  const barGap = 2;
  const barWidth = Math.max(1, width / data.length - barGap);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-40 w-full"
      role="img"
      aria-label={`Campaigns generated per day, ${data.length}-day range`}
    >
      {data.map((point, i) => {
        const barHeight = (point.campaignsGenerated / max) * (height - paddingBottom - 4);
        const x = i * (barWidth + barGap);
        const y = height - paddingBottom - barHeight;
        return (
          <rect
            key={point.date}
            x={x}
            y={y}
            width={barWidth}
            height={Math.max(barHeight, point.campaignsGenerated > 0 ? 2 : 0)}
            rx={Math.min(2, barWidth / 2)}
            fill="#E84D1A"
            opacity={point.campaignsGenerated > 0 ? 1 : 0.15}
          >
            <title>
              {point.date}: {point.campaignsGenerated} campaign
              {point.campaignsGenerated === 1 ? '' : 's'} generated
            </title>
          </rect>
        );
      })}
      <line
        x1={0}
        y1={height - paddingBottom}
        x2={width}
        y2={height - paddingBottom}
        stroke="var(--color-border-light, #e9e2d8)"
        strokeWidth={1}
      />
    </svg>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [days, setDays] = useState<7 | 30 | 90>(30);
  // Phase 35 fix: "Try again" used to call setDays(days) with the same
  // value, which React bails out of without re-running the fetch effect —
  // the button silently did nothing. This tick is a dedicated, always-
  // different dependency the retry button can bump.
  const [retryTick, setRetryTick] = useState(0);
  const [data, setData] = useState<AnalyticsDashboardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function loadBusinesses() {
      try {
        const businessesData = await businessService.getByUserId(user!.uid);
        if (cancelled) return;
        setBusinesses(businessesData);
        if (businessesData.length > 0) {
          setSelectedBusinessId(businessesData[0]!.businessId);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Couldn't load your businesses.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadBusinesses();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedBusinessId) return;
    let cancelled = false;
    async function loadAnalytics() {
      setDataLoading(true);
      setError(null);
      try {
        const result = await callFunction<
          { businessId: string; days: 7 | 30 | 90 },
          AnalyticsDashboardResult
        >({
          functionName: 'getAnalyticsDashboard',
          data: { businessId: selectedBusinessId!, days },
        });
        if (!cancelled) setData(result);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics.');
          setData(null);
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    void loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [selectedBusinessId, days, retryTick]);

  const hasAnyActivity = useMemo(() => data !== null && data.eventsAggregated > 0, [data]);

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

  if (businesses.length === 0) {
    return (
      <div className="bg-bg-primary min-h-screen p-8">
        <MascotScene
          pose="point"
          align="center"
          message="No business set up yet."
          supporting="Create your first business to see analytics."
        >
          <Link href="/onboarding" className="mt-4 inline-block">
            <Button>Create Business</Button>
          </Link>
        </MascotScene>
      </div>
    );
  }

  return (
    <div className="bg-bg-primary min-h-screen">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Analytics</h1>
          <p className="mt-1 text-neutral-500">Real usage from your Mitra activity.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {businesses.length > 1 && (
            <select
              value={selectedBusinessId || ''}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              className="focus:ring-brand-500 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
              aria-label="Select business"
            >
              {businesses.map((b) => (
                <option key={b.businessId} value={b.businessId}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex rounded-lg border border-neutral-300 bg-white p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDays(opt.value)}
                aria-pressed={days === opt.value}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  days === opt.value
                    ? 'bg-brand-600 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <MascotScene
        pose="analyst"
        size="sm"
        message="Here's what's actually happened."
        className="mb-6"
      />

      {error && (
        <div className="flex justify-center p-8">
          <MascotScene
            pose="concerned"
            align="center"
            message="Something got in the way."
            supporting={error}
            decoration={<WrenchIllustration size={20} />}
          >
            <Button size="sm" className="mt-4" onClick={() => setRetryTick((n) => n + 1)}>
              Try again
            </Button>
          </MascotScene>
        </div>
      )}

      {!error && dataLoading && (
        <div className="flex justify-center p-12">
          <div
            className="border-brand-600 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
            aria-hidden="true"
          />
        </div>
      )}

      {!error && !dataLoading && data && !hasAnyActivity && (
        <div className="flex justify-center p-8">
          <MascotScene
            pose="discovering"
            align="center"
            message="No activity yet in this period."
            supporting="Generate a campaign, download an asset, or share on WhatsApp — it'll show up here."
            decoration={<MagnifyingGlassIllustration size={20} />}
          />
        </div>
      )}

      {!error && !dataLoading && data && hasAnyActivity && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Campaigns Generated"
              value={data.totals.campaignsGenerated.toString()}
              description={`of ${data.totals.campaignsStarted} started`}
            />
            <StatCard title="Assets Downloaded" value={data.totals.assetsDownloaded.toString()} />
            <StatCard title="WhatsApp Clicks" value={data.totals.whatsappClicks.toString()} />
            <StatCard
              title="Plan"
              value={
                data.subscription
                  ? data.subscription.planId.charAt(0).toUpperCase() +
                    data.subscription.planId.slice(1)
                  : 'Free'
              }
              description={data.subscription ? data.subscription.status : 'No active subscription'}
            />
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <ChartIllustration size={28} />
              <h2 className="text-lg font-semibold text-neutral-900">
                Campaigns generated, last {data.rangeDays} days
              </h2>
            </div>
            <ActivityChart data={data.dailyActivity} />
          </div>

          {data.truncated && (
            <p className="text-sm text-neutral-500">
              This business has more activity than a single dashboard load shows in detail — the
              totals above only reflect the first {data.eventsAggregated} events found in this
              range.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
