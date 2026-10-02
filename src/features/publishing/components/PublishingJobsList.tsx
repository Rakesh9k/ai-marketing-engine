'use client';

import { useState } from 'react';
import type { PublishJob } from '@/types';
import { publishingService } from '../services/publishingService';
import { Button } from '@/components/ui/Button';

interface PublishingJobsListProps {
  jobs: PublishJob[];
  onRefresh: () => void;
}

export function PublishingJobsList({ jobs, onRefresh }: PublishingJobsListProps) {
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!jobs || jobs.length === 0) {
    return null;
  }

  const handleCancel = async (jobId: string) => {
    setActionId(jobId);
    setError(null);
    try {
      await publishingService.cancelPublishJob(jobId);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
    } finally {
      setActionId(null);
    }
  };

  const handleRetry = async (jobId: string) => {
    setActionId(jobId);
    setError(null);
    try {
      await publishingService.retryPublishJob(jobId);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry job');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Publishing History & Status
        </h4>
        <button
          onClick={onRefresh}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Refresh Status
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <div
            key={job.jobId}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-900 capitalize dark:text-slate-100">
                    {job.platform} {job.contentType}
                  </span>

                  {/* Status Badges */}
                  {job.status === 'published' && (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                      Published ✓
                    </span>
                  )}
                  {(job.status === 'publishing' || job.status === 'processing') && (
                    <span className="inline-flex animate-pulse items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                      Publishing...
                    </span>
                  )}
                  {job.status === 'scheduled' && (
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400">
                      Scheduled
                    </span>
                  )}
                  {job.status === 'failed' && (
                    <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                      Failed
                    </span>
                  )}
                  {job.status === 'cancelled' && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Cancelled
                    </span>
                  )}
                </div>

                {job.externalPostId && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    External Post ID:{' '}
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {job.externalPostId}
                    </span>
                  </p>
                )}

                {job.scheduledAt && job.status === 'scheduled' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Scheduled for: {new Date(job.scheduledAt).toLocaleString()}
                  </p>
                )}

                {job.status === 'failed' && job.errorMessage && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    Error ({job.errorCode}): {job.errorMessage}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {job.status === 'scheduled' && (
                  <Button
                    variant="outline"
                    onClick={() => handleCancel(job.jobId)}
                    disabled={actionId === job.jobId}
                    className="text-xs text-slate-600 dark:text-slate-300"
                  >
                    Cancel Schedule
                  </Button>
                )}

                {job.status === 'failed' && (
                  <Button
                    onClick={() => handleRetry(job.jobId)}
                    disabled={actionId === job.jobId}
                    className="bg-blue-600 text-xs text-white hover:bg-blue-700"
                  >
                    {actionId === job.jobId ? 'Retrying...' : 'Retry Publish'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
