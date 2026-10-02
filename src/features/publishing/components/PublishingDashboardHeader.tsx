'use client';

import React from 'react';
import Link from 'next/link';
import type { PublishingDashboardSummary } from '../services/publishingDashboardService';

interface PublishingDashboardHeaderProps {
  summary: PublishingDashboardSummary;
  timezone: string;
  hasRevokedConnections?: boolean;
}

export function PublishingDashboardHeader({
  summary,
  timezone,
  hasRevokedConnections,
}: PublishingDashboardHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
            Publishing
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            See what&apos;s scheduled, published, and needs attention.
          </p>
        </div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Timezone:{' '}
          <span className="font-semibold text-gray-700 dark:text-gray-300">{timezone}</span>
        </div>
      </div>

      {/* Unresolved Failures / Needs Attention Banner */}
      {summary.totalNeedsAttention > 0 && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:flex-row sm:items-center dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
              ⚠️
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Needs Attention ({summary.totalNeedsAttention})
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {summary.totalFailed > 0 && `${summary.totalFailed} failed publication(s). `}
                {hasRevokedConnections && 'Meta social connection needs reconnection.'}
              </p>
            </div>
          </div>

          {hasRevokedConnections ? (
            <Link
              href="/settings/social"
              className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700"
            >
              Reconnect Social Accounts
            </Link>
          ) : (
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Review Failed items below
            </span>
          )}
        </div>
      )}

      {/* Operational Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Scheduled</div>
          <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {summary.totalScheduled}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Published</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.totalPublished}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Failed</div>
          <div className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {summary.totalFailed}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Needs Attention
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary.totalNeedsAttention}
          </div>
        </div>
      </div>
    </div>
  );
}
