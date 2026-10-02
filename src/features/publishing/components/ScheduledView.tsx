'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import type { ScheduledPostWithMetadata } from '../services/publishingDashboardService';
import type { PublishPlatform, PublishContentType, ScheduledPost } from '@/types';
import { cancelSchedule } from '@/features/scheduling/services/schedulingService';

interface ScheduledViewProps {
  scheduledPosts: ScheduledPostWithMetadata[];
  platformFilter: 'all' | PublishPlatform;
  formatFilter: 'all' | PublishContentType;
  onRefresh: () => void;
  onRescheduleClick: (post: ScheduledPost) => void;
}

export function ScheduledView({
  scheduledPosts,
  platformFilter,
  formatFilter,
  onRefresh,
  onRescheduleClick,
}: ScheduledViewProps) {
  const [cancellingPost, setCancellingPost] = useState<ScheduledPostWithMetadata | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Filter scheduled items
  const filteredPosts = scheduledPosts.filter((post) => {
    const matchesPlatform = platformFilter === 'all' || post.platform === platformFilter;
    const matchesFormat = formatFilter === 'all' || post.contentType === formatFilter;
    const isActiveStatus = post.status === 'scheduled' || post.status === 'processing';
    return matchesPlatform && matchesFormat && isActiveStatus;
  });

  const handleConfirmCancel = async () => {
    if (!cancellingPost) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelSchedule(cancellingPost.scheduledPostId);
      setCancellingPost(null);
      onRefresh();
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel scheduled post.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (filteredPosts.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-12 text-center dark:border-gray-800 dark:bg-gray-900/30">
        <div className="text-3xl">🗓️</div>
        <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
          No scheduled content
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          You don&apos;t have any upcoming posts waiting to be published.
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPosts.map((post) => {
          const dateFormatted = format(parseISO(post.scheduledAt), 'MMM d, yyyy · h:mm a');

          return (
            <div
              key={post.scheduledPostId}
              className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <div className="flex items-start gap-3">
                  {/* Media Thumbnail */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                    {post.thumbnailUrl ? (
                      <Image
                        src={post.thumbnailUrl}
                        alt={post.campaignTitle || 'Campaign'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl">
                        {post.contentType === 'reel' ? '🎬' : '🖼️'}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 capitalize dark:text-gray-300">
                        {post.platform}
                      </span>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase dark:bg-indigo-950 dark:text-indigo-300">
                        {post.status}
                      </span>
                    </div>

                    <h4 className="mt-1 truncate text-sm font-bold text-gray-900 dark:text-white">
                      {post.campaignTitle || 'Campaign'}
                    </h4>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      📅 {dateFormatted}
                    </p>
                  </div>
                </div>

                {post.caption && (
                  <p className="mt-3 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                    {post.caption}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                <Link
                  href={`/campaigns/${post.campaignId}`}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  Open Campaign
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRescheduleClick(post)}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Reschedule
                  </button>

                  {post.status === 'scheduled' && (
                    <button
                      onClick={() => setCancellingPost(post)}
                      className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400 dark:hover:bg-rose-900/50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancellingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Cancel Scheduled Post?
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to cancel the scheduled {cancellingPost.platform} post for{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {cancellingPost.campaignTitle}
              </span>
              ?
            </p>

            {cancelError && (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                {cancelError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setCancellingPost(null)}
                disabled={isCancelling}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Keep Post
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
