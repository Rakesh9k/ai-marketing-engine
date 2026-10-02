'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type {
  Campaign,
  SocialConnection,
  ScheduledPost,
  PublishJob,
  PublishPlatform,
  PublishContentType,
} from '@/types';
import {
  createMultiPlatformSchedule,
  cancelSchedule,
  reschedulePost,
  retrySchedule,
} from '../services/schedulingService';

interface CampaignSchedulingSectionProps {
  campaign: Campaign;
  connections: SocialConnection[];
  scheduledPosts: ScheduledPost[];
  publishJobs: PublishJob[];
  onRefresh: () => void;
}

const COMMON_TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Singapore',
  'Australia/Sydney',
  'UTC',
];

export function CampaignSchedulingSection({
  campaign,
  connections,
  scheduledPosts,
  publishJobs: _publishJobs,
  onRefresh,
}: CampaignSchedulingSectionProps) {
  const defaultTimezone =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata';

  const defaultFutureDate = new Date(Date.now() + 7200000);
  const defaultDateStr = defaultFutureDate.toISOString().split('T')[0] || '';
  const defaultTimeStr = defaultFutureDate.toTimeString().substring(0, 5) || '';

  // Active Connections
  const activeIgConn = connections.find((c) => c.status === 'active' && !!c.instagram?.id);
  const activeFbConn = connections.find((c) => c.status === 'active' && !!c.facebookPage?.id);

  // Platform selection state
  const [selectInstagram, setSelectInstagram] = useState<boolean>(!!activeIgConn);
  const [selectFacebook, setSelectFacebook] = useState<boolean>(!!activeFbConn);
  const [contentType, setContentType] = useState<PublishContentType>('post');

  // Date & Time state
  const [dateStr, setDateStr] = useState<string>(defaultDateStr);
  const [timeStr, setTimeStr] = useState<string>(defaultTimeStr);
  const [timezone, setTimezone] = useState<string>(defaultTimezone);

  // Form submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Inline Reschedule & Cancel Modal States
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleTime, setRescheduleTime] = useState<string>('');
  const [rescheduleTz, setRescheduleTz] = useState<string>(defaultTimezone);

  const [cancellingPost, setCancellingPost] = useState<ScheduledPost | null>(null);

  const isEligible = ['generated', 'verified', 'completed', 'approved', 'active'].includes(
    campaign.status
  );

  if (!isEligible) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
        Publishing and scheduling will become available once this campaign strategy and creatives
        are generated.
      </div>
    );
  }

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectInstagram && !selectFacebook) {
      setErrorMsg('Please select at least one social destination (Instagram or Facebook).');
      return;
    }

    const platformsToSchedule: Array<{
      platform: PublishPlatform;
      socialConnectionId: string;
      contentType: PublishContentType;
    }> = [];

    if (selectInstagram) {
      if (!activeIgConn) {
        setErrorMsg(
          'Instagram is selected but no active Instagram Professional connection exists.'
        );
        return;
      }
      platformsToSchedule.push({
        platform: 'instagram',
        socialConnectionId: activeIgConn.connectionId,
        contentType,
      });
    }

    if (selectFacebook) {
      if (!activeFbConn) {
        setErrorMsg('Facebook is selected but no active Facebook Page connection exists.');
        return;
      }
      platformsToSchedule.push({
        platform: 'facebook',
        socialConnectionId: activeFbConn.connectionId,
        contentType,
      });
    }

    try {
      setSubmitting(true);
      const combinedIso = new Date(`${dateStr}T${timeStr}:00`).toISOString();

      await createMultiPlatformSchedule({
        campaignId: campaign.campaignId,
        platforms: platformsToSchedule,
        scheduledAt: combinedIso,
        timezone,
      });

      setSubmitting(false);
      setSuccessMsg('Campaign post scheduled successfully!');
      onRefresh();
    } catch (err: any) {
      setSubmitting(false);
      setErrorMsg(err?.message || 'Failed to schedule campaign post.');
    }
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    try {
      setSubmitting(true);
      const combinedIso = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString();
      await reschedulePost({
        scheduledPostId: editingPost.scheduledPostId,
        newScheduledAt: combinedIso,
        timezone: rescheduleTz,
      });
      setSubmitting(false);
      setEditingPost(null);
      setSuccessMsg('Post rescheduled successfully.');
      onRefresh();
    } catch (err: any) {
      setSubmitting(false);
      setErrorMsg(err?.message || 'Failed to reschedule post.');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingPost) return;
    try {
      setSubmitting(true);
      await cancelSchedule(cancellingPost.scheduledPostId);
      setSubmitting(false);
      setCancellingPost(null);
      setSuccessMsg('Scheduled post cancelled.');
      onRefresh();
    } catch (err: any) {
      setSubmitting(false);
      setErrorMsg(err?.message || 'Failed to cancel scheduled post.');
    }
  };

  const handleActionRetry = async (postId: string) => {
    try {
      setSubmitting(true);
      await retrySchedule(postId);
      setSubmitting(false);
      setSuccessMsg('Retrying scheduled post...');
      onRefresh();
    } catch (err: any) {
      setSubmitting(false);
      setErrorMsg(err?.message || 'Failed to retry scheduled post.');
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b pb-4 dark:border-gray-800">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            🚀 Publish &amp; Schedule
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review destinations, pick a date &amp; time, and schedule automated campaign publishing.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-300">
          {successMsg}
        </div>
      )}

      {/* 1. Schedule Form */}
      <form onSubmit={handleScheduleSubmit} className="mt-6 space-y-6">
        {/* Where am I publishing it? Destinations */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            1. Select Destinations
          </label>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Instagram Card */}
            <div
              className={`relative flex items-start rounded-xl border p-4 transition-all ${
                selectInstagram
                  ? 'border-purple-600 bg-purple-50/50 dark:border-purple-500 dark:bg-purple-950/20'
                  : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
              }`}
            >
              <div className="flex h-5 items-center">
                <input
                  id="ig-check"
                  type="checkbox"
                  checked={selectInstagram}
                  disabled={!activeIgConn}
                  onChange={(e) => setSelectInstagram(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
              </div>
              <div className="ml-3 flex-1 text-sm">
                <label
                  htmlFor="ig-check"
                  className="cursor-pointer font-semibold text-gray-900 dark:text-white"
                >
                  📸 Instagram
                </label>
                {activeIgConn ? (
                  <div className="mt-1 flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
                    <span>✓ Connected</span>
                    <span className="font-normal text-gray-500">
                      (@{activeIgConn.instagram?.username || activeIgConn.facebookPage?.name})
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-gray-500">
                    Not connected.{' '}
                    <Link
                      href="/settings/social"
                      className="font-semibold text-purple-600 underline"
                    >
                      Connect
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Facebook Card */}
            <div
              className={`relative flex items-start rounded-xl border p-4 transition-all ${
                selectFacebook
                  ? 'border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/20'
                  : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
              }`}
            >
              <div className="flex h-5 items-center">
                <input
                  id="fb-check"
                  type="checkbox"
                  checked={selectFacebook}
                  disabled={!activeFbConn}
                  onChange={(e) => setSelectFacebook(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="ml-3 flex-1 text-sm">
                <label
                  htmlFor="fb-check"
                  className="cursor-pointer font-semibold text-gray-900 dark:text-white"
                >
                  📘 Facebook
                </label>
                {activeFbConn ? (
                  <div className="mt-1 flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
                    <span>✓ Connected</span>
                    <span className="font-normal text-gray-500">
                      ({activeFbConn.facebookPage?.name})
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-gray-500">
                    Not connected.{' '}
                    <Link href="/settings/social" className="font-semibold text-blue-600 underline">
                      Connect
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Format & Date/Time Controls */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Format
            </label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as PublishContentType)}
              className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="post">Feed Post</option>
              <option value="reel">Reel / Video</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Date
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Time
            </label>
            <input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {!COMMON_TIMEZONES.includes(timezone) && <option value={timezone}>{timezone}</option>}
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Schedule Action Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Timezone:{' '}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{timezone}</span>
          </div>
          <button
            type="submit"
            disabled={submitting || (!selectInstagram && !selectFacebook)}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Scheduling...' : '📅 Schedule Post'}
          </button>
        </div>
      </form>

      {/* 2. Active Scheduled Posts & Published Jobs List */}
      {scheduledPosts.length > 0 && (
        <div className="mt-8 border-t pt-6 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Scheduled &amp; Published Destinations
          </h3>

          <div className="mt-4 space-y-3">
            {scheduledPosts.map((post) => {
              const formattedDate = new Date(post.scheduledAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              const isFailed = post.status === 'failed';
              const isPublished = post.status === 'published';
              const isScheduled = post.status === 'scheduled';

              return (
                <div
                  key={post.scheduledPostId}
                  className="flex flex-col justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-4 sm:flex-row sm:items-center dark:border-gray-800 dark:bg-gray-800/40"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900 capitalize dark:text-white">
                        {post.platform === 'instagram' ? '📸 Instagram' : '📘 Facebook'}{' '}
                        <span className="text-xs font-normal text-gray-500">
                          ({post.contentType})
                        </span>
                      </span>

                      {isScheduled && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          ⏳ Scheduled
                        </span>
                      )}
                      {post.status === 'processing' && (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                          ⚙️ Processing
                        </span>
                      )}
                      {isPublished && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                          ✓ Published
                        </span>
                      )}
                      {isFailed && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
                          ✕ Failed
                        </span>
                      )}
                      {post.status === 'cancelled' && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          🚫 Cancelled
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formattedDate} • <span className="font-mono">{post.timezone}</span>
                    </div>

                    {post.errorCode === 'CONNECTION_REVOKED' && (
                      <div className="text-xs text-red-600 dark:text-red-400">
                        Meta connection is revoked.{' '}
                        <Link href="/settings/social" className="font-semibold underline">
                          Reconnect Meta
                        </Link>
                      </div>
                    )}

                    {post.errorMessage && post.errorCode !== 'CONNECTION_REVOKED' && (
                      <div className="text-xs text-red-600 dark:text-red-400">
                        {post.errorMessage}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center space-x-2 sm:mt-0">
                    {isScheduled && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(post.scheduledAt);
                            setEditingPost(post);
                            setRescheduleDate(d.toISOString().split('T')[0] || '');
                            setRescheduleTime(d.toTimeString().substring(0, 5) || '');
                            setRescheduleTz(post.timezone || defaultTimezone);
                          }}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancellingPost(post)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {isFailed && (
                      <button
                        type="button"
                        onClick={() => handleActionRetry(post.scheduledPostId)}
                        disabled={submitting}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Retry Post
                      </button>
                    )}

                    {isPublished && post.externalPostId && (
                      <span className="font-mono text-xs text-gray-500">
                        ID: {post.externalPostId}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Reschedule Post ({editingPost.platform})
            </h3>
            <form onSubmit={handleConfirmReschedule} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Date
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Time
                </label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Timezone
                </label>
                <select
                  value={rescheduleTz}
                  onChange={(e) => setRescheduleTz(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end space-x-3 border-t pt-4 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Keep Current
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Save Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Cancel Scheduled Post?
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              This will prevent this content from being automatically published to{' '}
              <span className="font-semibold capitalize">{cancellingPost.platform}</span> on{' '}
              {new Date(cancellingPost.scheduledAt).toLocaleString()}.
            </p>

            <div className="mt-6 flex justify-end space-x-3 border-t pt-4 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setCancellingPost(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Keep Scheduled
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={submitting}
                className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Cancel Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
