'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import type {
  ScheduledPostWithMetadata,
  PublishJobWithMetadata,
} from '../services/publishingDashboardService';
import type { PublishPlatform, PublishContentType } from '@/types';
import { normalizePublishError } from '../utils/errorNormalizer';
import { retrySchedule } from '@/features/scheduling/services/schedulingService';
import { publishingService } from '../services/publishingService';

interface FailedViewProps {
  scheduledPosts: ScheduledPostWithMetadata[];
  publishJobs: PublishJobWithMetadata[];
  platformFilter: 'all' | PublishPlatform;
  formatFilter: 'all' | PublishContentType;
  onRefresh: () => void;
}

export function FailedView({
  scheduledPosts,
  publishJobs,
  platformFilter,
  formatFilter,
  onRefresh,
}: FailedViewProps) {
  const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({});
  const [retryErrors, setRetryErrors] = useState<Record<string, string>>({});

  // Collect all failed items from scheduledPosts & publishJobs
  const failedItems: Array<{
    id: string;
    type: 'scheduled_post' | 'publish_job';
    campaignId: string;
    campaignTitle: string;
    thumbnailUrl?: string;
    platform: PublishPlatform;
    contentType: PublishContentType;
    dateIso: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    connectionStatus?: string;
  }> = [];

  scheduledPosts.forEach((post) => {
    if (
      post.status === 'failed' &&
      (platformFilter === 'all' || post.platform === platformFilter) &&
      (formatFilter === 'all' || post.contentType === formatFilter)
    ) {
      failedItems.push({
        id: post.scheduledPostId,
        type: 'scheduled_post',
        campaignId: post.campaignId,
        campaignTitle: post.campaignTitle || 'Campaign',
        thumbnailUrl: post.thumbnailUrl,
        platform: post.platform,
        contentType: post.contentType,
        dateIso: post.scheduledAt || post.createdAt,
        errorCode: post.errorCode,
        errorMessage: post.errorMessage,
        connectionStatus: post.connectionStatus,
      });
    }
  });

  publishJobs.forEach((job) => {
    if (
      job.status === 'failed' &&
      (platformFilter === 'all' || job.platform === platformFilter) &&
      (formatFilter === 'all' || job.contentType === formatFilter)
    ) {
      const alreadyAdded = failedItems.some(
        (i) =>
          i.id === job.jobId || (i.campaignId === job.campaignId && i.platform === job.platform)
      );
      if (!alreadyAdded) {
        failedItems.push({
          id: job.jobId,
          type: 'publish_job',
          campaignId: job.campaignId,
          campaignTitle: job.campaignTitle || 'Campaign',
          thumbnailUrl: job.thumbnailUrl,
          platform: job.platform,
          contentType: job.contentType,
          dateIso: job.publishedAt || job.scheduledAt || job.createdAt,
          errorCode: job.errorCode,
          errorMessage: job.errorMessage,
          connectionStatus: job.connectionStatus,
        });
      }
    }
  });

  const handleRetry = async (itemId: string, type: 'scheduled_post' | 'publish_job') => {
    if (retryingIds[itemId]) return; // Prevent double-clicks

    setRetryingIds((prev) => ({ ...prev, [itemId]: true }));
    setRetryErrors((prev) => ({ ...prev, [itemId]: '' }));

    try {
      if (type === 'scheduled_post') {
        await retrySchedule(itemId);
      } else {
        await publishingService.retryPublishJob(itemId);
      }
      onRefresh();
    } catch (err: any) {
      setRetryErrors((prev) => ({
        ...prev,
        [itemId]: err.message || 'Retry attempt failed. Please try again or open campaign.',
      }));
    } finally {
      setRetryingIds((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  if (failedItems.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-emerald-50/50 p-12 text-center dark:border-emerald-950 dark:bg-emerald-950/20">
        <div className="text-3xl">✨</div>
        <h3 className="mt-3 text-base font-semibold text-emerald-900 dark:text-emerald-200">
          All clear!
        </h3>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
          No publishing failures detected across your accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {failedItems.map((item) => {
        const normalizedErr = normalizePublishError(item.errorCode, item.errorMessage);
        const dateFormatted = format(parseISO(item.dateIso), 'MMM d, yyyy · h:mm a');
        const isRetrying = !!retryingIds[item.id];
        const retryErr = retryErrors[item.id];

        return (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-2xl border border-rose-200 bg-white p-5 shadow-sm dark:border-rose-900/50 dark:bg-gray-900"
          >
            <div>
              <div className="flex items-start gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.campaignTitle}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl">
                      {item.contentType === 'reel' ? '🎬' : '🖼️'}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 capitalize dark:text-gray-300">
                      {item.platform}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 uppercase dark:bg-rose-950 dark:text-rose-300">
                      ✕ Failed
                    </span>
                  </div>

                  <h4 className="mt-1 truncate text-sm font-bold text-gray-900 dark:text-white">
                    {item.campaignTitle}
                  </h4>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Failed at: {dateFormatted}
                  </p>
                </div>
              </div>

              {/* Normalized Error Message */}
              <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50/80 p-3 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
                <span className="block font-semibold">Reason:</span>
                {normalizedErr.userMessage}
              </div>

              {retryErr && (
                <div className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {retryErr}
                </div>
              )}
            </div>

            {/* Contextual Action Button */}
            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
              <Link
                href={`/campaigns/${item.campaignId}`}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                Open Campaign
              </Link>

              {normalizedErr.actionType === 'reconnect' ? (
                <Link
                  href="/settings/social"
                  className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700"
                >
                  Reconnect
                </Link>
              ) : normalizedErr.actionType === 'retry' ? (
                <button
                  onClick={() => handleRetry(item.id, item.type)}
                  disabled={isRetrying}
                  className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </button>
              ) : (
                <Link
                  href={`/campaigns/${item.campaignId}`}
                  className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                >
                  Inspect Campaign
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
