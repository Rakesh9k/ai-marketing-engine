'use client';

import React, { useState } from 'react';
import type { MarketingCalendarItem } from '@/types';
import { calendarService } from '../services/calendarService';

interface EditCalendarItemModalProps {
  item: MarketingCalendarItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditCalendarItemModal({
  item,
  isOpen,
  onClose,
  onSuccess,
}: EditCalendarItemModalProps) {
  const [topic, setTopic] = useState<string>(item.topic || '');
  const [hook, setHook] = useState<string>(item.hook || '');
  const [callToAction, setCallToAction] = useState<string>(item.callToAction || '');
  const [suggestedTime, setSuggestedTime] = useState<string>(item.suggestedTime || '19:30');
  const [scheduledDate, setScheduledDate] = useState<string>(item.scheduledDate || '');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await calendarService.updateCalendarItem({
        itemId: item.itemId,
        topic,
        hook,
        callToAction,
        suggestedTime,
        scheduledDate,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update calendar item.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          Edit Calendar Item Strategy
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Refine the topic, hook, or schedule before generating creative content.
        </p>

        {errorMsg && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-900 dark:text-white">
              Topic / Angle
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2 text-xs text-gray-900 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-900 dark:text-white">
              Hook
            </label>
            <textarea
              rows={2}
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2 text-xs text-gray-900 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-900 dark:text-white">
              Call To Action (CTA)
            </label>
            <input
              type="text"
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2 text-xs text-gray-900 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-900 dark:text-white">
                Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2 text-xs text-gray-900 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-900 dark:text-white">
                Suggested Time
              </label>
              <input
                type="time"
                value={suggestedTime}
                onChange={(e) => setSuggestedTime(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2 text-xs text-gray-900 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
