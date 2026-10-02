'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import type {
  ScheduledPostWithMetadata,
  PublishJobWithMetadata,
} from '../services/publishingDashboardService';
import type { PublishPlatform, PublishContentType } from '@/types';

interface CalendarItem {
  id: string;
  campaignId: string;
  campaignTitle: string;
  thumbnailUrl?: string;
  platform: PublishPlatform;
  contentType: PublishContentType;
  dateIso: string;
  status: 'scheduled' | 'processing' | 'published' | 'failed' | 'cancelled';
  errorMessage?: string | null;
}

interface CalendarViewProps {
  scheduledPosts: ScheduledPostWithMetadata[];
  publishJobs: PublishJobWithMetadata[];
  platformFilter: 'all' | PublishPlatform;
  formatFilter: 'all' | PublishContentType;
}

export function CalendarView({
  scheduledPosts,
  publishJobs,
  platformFilter,
  formatFilter,
}: CalendarViewProps) {
  // Aggregate items into a unified calendar model
  const items: CalendarItem[] = [];

  // Add active scheduled posts
  scheduledPosts.forEach((post) => {
    if (
      (platformFilter === 'all' || post.platform === platformFilter) &&
      (formatFilter === 'all' || post.contentType === formatFilter)
    ) {
      items.push({
        id: post.scheduledPostId,
        campaignId: post.campaignId,
        campaignTitle: post.campaignTitle || 'Campaign',
        thumbnailUrl: post.thumbnailUrl,
        platform: post.platform,
        contentType: post.contentType,
        dateIso: post.scheduledAt,
        status: post.status,
        errorMessage: post.errorMessage,
      });
    }
  });

  // Add publish jobs (for historical/published items)
  publishJobs.forEach((job) => {
    if (
      (platformFilter === 'all' || job.platform === platformFilter) &&
      (formatFilter === 'all' || job.contentType === formatFilter)
    ) {
      // Avoid duplicating items already present in scheduledPosts
      const existsInScheduled = items.some(
        (i) =>
          i.id === job.jobId || (i.campaignId === job.campaignId && i.platform === job.platform)
      );
      if (!existsInScheduled && (job.status === 'published' || job.status === 'failed')) {
        items.push({
          id: job.jobId,
          campaignId: job.campaignId,
          campaignTitle: job.campaignTitle || 'Campaign',
          thumbnailUrl: job.thumbnailUrl,
          platform: job.platform,
          contentType: job.contentType,
          dateIso: job.publishedAt || job.scheduledAt || job.createdAt,
          status: job.status,
          errorMessage: job.errorMessage,
        });
      }
    }
  });

  // Sort chronologically
  items.sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime());

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-12 text-center dark:border-gray-800 dark:bg-gray-900/30">
        <div className="text-3xl">📅</div>
        <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
          Nothing scheduled yet
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Plan your next social post from an approved campaign strategy.
        </p>
        <div className="mt-6">
          <Link
            href="/campaigns"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            View Campaigns
          </Link>
        </div>
      </div>
    );
  }

  // Group items by date heading
  const groupedByDate: Array<{ groupHeader: string; items: CalendarItem[] }> = [];

  items.forEach((item) => {
    const itemDate = parseISO(item.dateIso);
    let groupHeader = '';

    if (isToday(itemDate)) {
      groupHeader = 'TODAY';
    } else if (isTomorrow(itemDate)) {
      groupHeader = 'TOMORROW';
    } else {
      groupHeader = format(itemDate, 'dd MMM yyyy').toUpperCase();
    }

    let existingGroup = groupedByDate.find((g) => g.groupHeader === groupHeader);
    if (!existingGroup) {
      existingGroup = { groupHeader, items: [] };
      groupedByDate.push(existingGroup);
    }
    existingGroup.items.push(item);
  });

  return (
    <div className="space-y-8">
      {groupedByDate.map((group) => (
        <div key={group.groupHeader} className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400">
              {group.groupHeader}
            </h3>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => {
              const timeStr = format(parseISO(item.dateIso), 'h:mm a');

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700"
                >
                  <div className="flex items-start gap-3">
                    {/* Media Thumbnail or Format Icon */}
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

                    {/* Content Meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          {timeStr}
                        </span>
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 uppercase dark:bg-gray-800 dark:text-gray-300">
                          {item.contentType}
                        </span>
                      </div>

                      <h4 className="mt-1 truncate text-sm font-bold text-gray-900 dark:text-white">
                        {item.campaignTitle}
                      </h4>

                      {/* Independent Platform Status */}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-700 capitalize dark:text-gray-300">
                            {item.platform}
                          </span>
                          {item.status === 'published' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              ✓ Published
                            </span>
                          )}
                          {item.status === 'scheduled' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              ✓ Scheduled
                            </span>
                          )}
                          {item.status === 'processing' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                              ⏳ Processing...
                            </span>
                          )}
                          {item.status === 'failed' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                              ✕ Failed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Deep Link CTA */}
                  <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800/80">
                    <Link
                      href={`/campaigns/${item.campaignId}`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      Open Campaign &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
