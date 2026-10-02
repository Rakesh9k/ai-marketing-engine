'use client';

import React, { useState } from 'react';
import type { ScheduledPost, ScheduledPostStatus } from '@/types';
import { cancelSchedule, retrySchedule } from '../services/schedulingService';
import Link from 'next/link';

interface ScheduledPostsListProps {
  posts: ScheduledPost[];
  onRefresh: () => void;
}

export function ScheduledPostsList({ posts, onRefresh }: ScheduledPostsListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!posts || posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        No scheduled posts for this campaign yet. Click <strong>Schedule</strong> above to set
        automated publishing time.
      </div>
    );
  }

  const handleCancel = async (postId: string) => {
    try {
      setLoadingId(postId);
      setErrorMsg(null);
      await cancelSchedule(postId);
      setLoadingId(null);
      onRefresh();
    } catch (err: any) {
      setLoadingId(null);
      setErrorMsg(err?.message || 'Failed to cancel schedule.');
    }
  };

  const handleRetry = async (postId: string) => {
    try {
      setLoadingId(postId);
      setErrorMsg(null);
      await retrySchedule(postId);
      setLoadingId(null);
      onRefresh();
    } catch (err: any) {
      setLoadingId(null);
      setErrorMsg(err?.message || 'Failed to retry schedule.');
    }
  };

  const getStatusBadge = (status: ScheduledPostStatus) => {
    switch (status) {
      case 'scheduled':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            ⏳ Scheduled
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
            ⚙️ Processing
          </span>
        );
      case 'published':
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
            ✅ Published
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
            ❌ Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            🚫 Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:bg-gray-800/50 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">Scheduled Time</th>
              <th className="px-4 py-3">Timezone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {posts.map((post) => {
              const formattedDate = new Date(post.scheduledAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return (
                <tr
                  key={post.scheduledPostId}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                    <span className="capitalize">
                      {post.platform === 'instagram' ? '📸 Instagram' : '📘 Facebook'}{' '}
                      <span className="text-xs text-gray-500">({post.contentType})</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                    {formattedDate}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                    {post.timezone}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getStatusBadge(post.status)}
                    {post.errorCode === 'CONNECTION_REVOKED' && (
                      <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                        Connection Revoked.{' '}
                        <Link href="/settings/social" className="font-semibold underline">
                          Reconnect Meta
                        </Link>
                      </div>
                    )}
                    {post.errorMessage && post.errorCode !== 'CONNECTION_REVOKED' && (
                      <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {post.errorMessage}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {post.status === 'scheduled' && (
                      <button
                        onClick={() => handleCancel(post.scheduledPostId)}
                        disabled={loadingId === post.scheduledPostId}
                        className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {loadingId === post.scheduledPostId ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                    {post.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(post.scheduledPostId)}
                        disabled={loadingId === post.scheduledPostId}
                        className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {loadingId === post.scheduledPostId ? 'Retrying...' : 'Retry'}
                      </button>
                    )}
                    {post.status === 'published' && post.externalPostId && (
                      <span className="font-mono text-xs text-gray-500">
                        Post ID: {post.externalPostId}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
