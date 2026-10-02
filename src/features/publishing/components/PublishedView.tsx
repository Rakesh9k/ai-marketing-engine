'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import type { PublishJobWithMetadata } from '../services/publishingDashboardService';
import type { PublishPlatform, PublishContentType } from '@/types';

interface PublishedViewProps {
  publishJobs: PublishJobWithMetadata[];
  platformFilter: 'all' | PublishPlatform;
  formatFilter: 'all' | PublishContentType;
}

export function PublishedView({ publishJobs, platformFilter, formatFilter }: PublishedViewProps) {
  const publishedJobs = publishJobs.filter((job) => {
    const matchesPlatform = platformFilter === 'all' || job.platform === platformFilter;
    const matchesFormat = formatFilter === 'all' || job.contentType === formatFilter;
    return matchesPlatform && matchesFormat && job.status === 'published';
  });

  if (publishedJobs.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-12 text-center dark:border-gray-800 dark:bg-gray-900/30">
        <div className="text-3xl">🚀</div>
        <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
          No posts published yet
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your published content and live posts will appear here once executed.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {publishedJobs.map((job) => {
        const publishedDateStr = job.publishedAt || job.createdAt;
        const dateFormatted = format(parseISO(publishedDateStr), 'MMM d, yyyy · h:mm a');

        // Construct external URL only when a valid numeric or Facebook/IG external post ID exists
        const hasExternalLink = !!job.externalPostId;
        const externalUrl =
          job.platform === 'instagram'
            ? `https://instagram.com/p/${job.externalPostId}`
            : `https://facebook.com/${job.externalPostId}`;

        return (
          <div
            key={job.jobId}
            className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div>
              <div className="flex items-start gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                  {job.thumbnailUrl ? (
                    <Image
                      src={job.thumbnailUrl}
                      alt={job.campaignTitle || 'Campaign'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl">
                      {job.contentType === 'reel' ? '🎬' : '🖼️'}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 capitalize dark:text-gray-300">
                      {job.platform}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase dark:bg-emerald-950 dark:text-emerald-300">
                      ✓ Published
                    </span>
                  </div>

                  <h4 className="mt-1 truncate text-sm font-bold text-gray-900 dark:text-white">
                    {job.campaignTitle || 'Campaign'}
                  </h4>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Published: {dateFormatted}
                  </p>
                </div>
              </div>

              {job.externalPostId && (
                <div className="mt-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                  Post ID: {job.externalPostId}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
              <Link
                href={`/campaigns/${job.campaignId}`}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                Open Campaign
              </Link>

              {hasExternalLink && (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  <span>View Post</span>
                  <span>↗</span>
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
