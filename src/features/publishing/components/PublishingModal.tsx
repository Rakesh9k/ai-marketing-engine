'use client';

import { useState } from 'react';
import type { SocialConnection, PublishPlatform, PublishContentType, PublishJob } from '@/types';
import { publishingService } from '../services/publishingService';
import { Button } from '@/components/ui/Button';

interface PublishingModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  connections: SocialConnection[];
  onJobCreated: (job: PublishJob) => void;
}

export function PublishingModal({
  isOpen,
  onClose,
  campaignId,
  connections,
  onJobCreated,
}: PublishingModalProps) {
  const activeConnections = connections.filter((c) => c.status === 'active');
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    activeConnections[0]?.connectionId || ''
  );
  const [platform, setPlatform] = useState<PublishPlatform>('instagram');
  const [contentType, setContentType] = useState<PublishContentType>('post');
  const [isScheduling, setIsScheduling] = useState<boolean>(false);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');
  const [captionOverride, setCaptionOverride] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnectionId) {
      setError('Please select a connected social account');
      return;
    }

    let scheduledAtIso: string | null = null;
    if (isScheduling) {
      if (!scheduledDate) {
        setError('Please select a scheduled date');
        return;
      }
      const combined = new Date(`${scheduledDate}T${scheduledTime}:00`);
      if (isNaN(combined.getTime()) || combined.getTime() <= Date.now()) {
        setError('Scheduled time must be in the future');
        return;
      }
      scheduledAtIso = combined.toISOString();
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await publishingService.createPublishJob({
        campaignId,
        socialConnectionId: selectedConnectionId,
        platform,
        contentType,
        scheduledAt: scheduledAtIso,
        captionOverride: captionOverride.trim() || undefined,
      });

      onJobCreated(res.job);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="backdrop-sm fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Publish Campaign</h3>
          <button
            onClick={onClose}
            className="text-lg font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Account Selection */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Meta Account / Page
            </label>
            {activeConnections.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                No active Meta account connected. Please connect your Facebook Page / Instagram in
                Settings → Social Accounts first.
              </p>
            ) : (
              <select
                value={selectedConnectionId}
                onChange={(e) => setSelectedConnectionId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {activeConnections.map((conn) => (
                  <option key={conn.connectionId} value={conn.connectionId}>
                    {conn.facebookPage.name}{' '}
                    {conn.instagram?.username ? `(@${conn.instagram.username})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Platform & Content Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Platform
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setPlatform('instagram')}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium ${
                    platform === 'instagram'
                      ? 'border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                      : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                  }`}
                >
                  Instagram
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform('facebook')}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium ${
                    platform === 'facebook'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                  }`}
                >
                  Facebook
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Content Format
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setContentType('post')}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium ${
                    contentType === 'post'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                  }`}
                >
                  Post
                </button>
                <button
                  type="button"
                  onClick={() => setContentType('reel')}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium ${
                    contentType === 'reel'
                      ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                      : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                  }`}
                >
                  Reel
                </button>
              </div>
            </div>
          </div>

          {/* Mode Selection (Publish Now vs Schedule) */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Timing
            </label>
            <div className="flex space-x-3">
              <label className="flex cursor-pointer items-center space-x-2 text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="timing"
                  checked={!isScheduling}
                  onChange={() => setIsScheduling(false)}
                />
                <span>Publish Immediately</span>
              </label>
              <label className="flex cursor-pointer items-center space-x-2 text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="timing"
                  checked={isScheduling}
                  onChange={() => setIsScheduling(true)}
                />
                <span>Schedule for Later</span>
              </label>
            </div>
          </div>

          {/* Schedule Date/Time Inputs */}
          {isScheduling && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
              <div>
                <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full rounded border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            </div>
          )}

          {/* Caption Override */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Caption (Optional Override)
            </label>
            <textarea
              rows={2}
              value={captionOverride}
              onChange={(e) => setCaptionOverride(e.target.value)}
              placeholder="Leave blank to use generated campaign copy..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || activeConnections.length === 0}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {submitting ? 'Submitting...' : isScheduling ? 'Schedule Publish' : 'Publish Now'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
