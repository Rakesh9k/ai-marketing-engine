'use client';

import React, { useState } from 'react';
import type { ScheduledPost } from '@/types';
import { reschedulePost } from '@/features/scheduling/services/schedulingService';

interface RescheduleModalProps {
  post: ScheduledPost;
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

export function RescheduleModal({ post, isOpen, onClose, onSuccess }: RescheduleModalProps) {
  const defaultFutureDate = new Date(Date.now() + 3600000);
  const initialDate = post.scheduledAt
    ? post.scheduledAt.split('T')[0]
    : defaultFutureDate.toISOString().split('T')[0];
  const initialTime = post.scheduledAt
    ? new Date(post.scheduledAt).toTimeString().substring(0, 5)
    : defaultFutureDate.toTimeString().substring(0, 5);

  const [dateStr, setDateStr] = useState<string>(initialDate || '');
  const [timeStr, setTimeStr] = useState<string>(initialTime || '');
  const [timezone, setTimezone] = useState<string>(post.timezone || 'Asia/Kolkata');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateStr || !timeStr) {
      setErrorMsg('Please select both a valid date and time.');
      return;
    }

    const isoDateTime = `${dateStr}T${timeStr}:00.000Z`;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await reschedulePost({
        scheduledPostId: post.scheduledPostId,
        newScheduledAt: isoDateTime,
        timezone,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reschedule post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Reschedule Publication</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Set a new date and time for this {post.platform} post.
        </p>

        {errorMsg && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-900 dark:text-white">
              New Date
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-900 dark:text-white">
              New Time
            </label>
            <input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-900 dark:text-white">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {!COMMON_TIMEZONES.includes(timezone) && <option value={timezone}>{timezone}</option>}
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Confirm Reschedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
