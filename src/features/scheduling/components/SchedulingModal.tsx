'use client';

import React, { useState } from 'react';
import type { SocialConnection, PublishPlatform, PublishContentType } from '@/types';
import { createSchedule } from '../services/schedulingService';

interface SchedulingModalProps {
  campaignId: string;
  connections: SocialConnection[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

export function SchedulingModal({
  campaignId,
  connections,
  isOpen,
  onClose,
  onSuccess,
}: SchedulingModalProps) {
  const defaultTimezone =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata';

  // Default to 2 hours in the future
  const defaultFutureDate = new Date(Date.now() + 7200000);
  const defaultDateStr = defaultFutureDate.toISOString().split('T')[0] || '';
  const defaultTimeStr = defaultFutureDate.toTimeString().substring(0, 5) || '';

  const [platform, setPlatform] = useState<PublishPlatform>('instagram');
  const [contentType, setContentType] = useState<PublishContentType>('post');

  const getFilteredConnections = (p: PublishPlatform) =>
    connections.filter((c) => {
      if (c.status !== 'active') return false;
      if (p === 'instagram') return !!c.instagram?.id;
      if (p === 'facebook') return !!c.facebookPage?.id;
      return false;
    });

  const activeConns = getFilteredConnections(platform);
  const firstConn = activeConns.length > 0 ? activeConns[0] : null;
  const initialConnId = firstConn ? firstConn.connectionId : '';
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(initialConnId);
  const [dateStr, setDateStr] = useState<string>(defaultDateStr);
  const [timeStr, setTimeStr] = useState<string>(defaultTimeStr);
  const [timezone, setTimezone] = useState<string>(defaultTimezone);
  const [captionOverride, setCaptionOverride] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePlatformChange = (p: PublishPlatform) => {
    setPlatform(p);
    const validConns = getFilteredConnections(p);
    if (validConns.length > 0 && validConns[0]) {
      setSelectedConnectionId(validConns[0].connectionId);
    } else {
      setSelectedConnectionId('');
    }
  };

  const getAccountLabel = (c: SocialConnection) => {
    if (platform === 'instagram' && c.instagram?.username) {
      return `@${c.instagram.username} (Instagram)`;
    }
    if (c.facebookPage?.name) {
      return `${c.facebookPage.name} (Facebook)`;
    }
    return c.connectionId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const activeId = selectedConnectionId || activeConns[0]?.connectionId;
    if (!activeId) {
      setErrorMsg(`No active ${platform} connection found. Please connect your account first.`);
      return;
    }

    try {
      setSubmitting(true);
      const combinedIso = new Date(`${dateStr}T${timeStr}:00`).toISOString();

      await createSchedule({
        campaignId,
        socialConnectionId: activeId,
        platform,
        contentType,
        scheduledAt: combinedIso,
        timezone,
        captionOverride: captionOverride.trim() || undefined,
      });

      setSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setSubmitting(false);
      setErrorMsg(err?.message || 'Failed to schedule post. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all dark:bg-gray-900">
        <div className="flex items-center justify-between border-b pb-4 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            📅 Schedule Campaign Post
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Platform selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Target Platform
            </label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePlatformChange('instagram')}
                className={`flex items-center justify-center rounded-xl border p-3 text-sm font-semibold ${
                  platform === 'instagram'
                    ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                    : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'
                }`}
              >
                📸 Instagram
              </button>
              <button
                type="button"
                onClick={() => handlePlatformChange('facebook')}
                className={`flex items-center justify-center rounded-xl border p-3 text-sm font-semibold ${
                  platform === 'facebook'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'
                }`}
              >
                📘 Facebook
              </button>
            </div>
          </div>

          {/* Content Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Content Format
            </label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setContentType('post')}
                className={`rounded-xl border p-2.5 text-sm font-medium ${
                  contentType === 'post'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                    : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'
                }`}
              >
                Feed Post
              </button>
              <button
                type="button"
                onClick={() => setContentType('reel')}
                className={`rounded-xl border p-2.5 text-sm font-medium ${
                  contentType === 'reel'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                    : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'
                }`}
              >
                Reel / Video
              </button>
            </div>
          </div>

          {/* Connection Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Connected Account
            </label>
            {activeConns.length === 0 ? (
              <div className="mt-1 text-sm text-red-600 dark:text-red-400">
                No connected active {platform} account. Go to Settings &gt; Social Connections.
              </div>
            ) : (
              <select
                value={selectedConnectionId || activeConns[0]?.connectionId}
                onChange={(e) => setSelectedConnectionId(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {activeConns.map((conn) => (
                  <option key={conn.connectionId} value={conn.connectionId}>
                    {getAccountLabel(conn)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date & Time Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
          </div>

          {/* Timezone Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Timezone (IANA)
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

          {/* Optional Caption Override */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Caption Override (Optional)
            </label>
            <textarea
              value={captionOverride}
              onChange={(e) => setCaptionOverride(e.target.value)}
              placeholder="Leave blank to use AI generated campaign caption..."
              rows={2}
              className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Modal Actions */}
          <div className="mt-6 flex justify-end space-x-3 border-t pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || activeConns.length === 0}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Scheduling...' : 'Schedule Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
