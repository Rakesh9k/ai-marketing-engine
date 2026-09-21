'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { REEL_STATUS_COPY } from '@/features/reel/constants';
import { watchReel } from '@/features/reel/services/reelService';
import type { ReelProject } from '@/types';

interface ReelGenerationProgressProps {
  reelId: string;
  initialReel?: ReelProject | null;
  onCompleted?: (reel: ReelProject) => void;
  onRetry?: () => void;
}

const TERMINAL_STATUSES = new Set(['completed', 'failed']);

/**
 * Watches a Reel project's Firestore document and renders stage-appropriate
 * copy while the backend pipeline (analyzing -> planning -> rendering)
 * advances. Mirrors the polling/listener pattern used for campaign
 * generation progress elsewhere in the app, adapted to Reel's own status
 * enum. Shows only real backend states, never a fabricated percentage.
 */
export function ReelGenerationProgress({
  reelId,
  initialReel = null,
  onCompleted,
  onRetry,
}: ReelGenerationProgressProps) {
  const [reel, setReel] = useState<ReelProject | null>(initialReel);
  const [watchError, setWatchError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = watchReel(
      reelId,
      (updated) => {
        setReel(updated);
        if (updated && updated.status === 'completed') {
          onCompleted?.(updated);
        }
      },
      (error) => {
        setWatchError(error.message);
      }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onCompleted is stable enough for this listener's lifetime
  }, [reelId]);

  const status = reel?.status ?? 'draft';
  const copy = REEL_STATUS_COPY[status] ?? REEL_STATUS_COPY['draft']!;
  const isTerminal = TERMINAL_STATUSES.has(status);
  const isFailed = status === 'failed';

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
      {!isTerminal && (
        <div
          className="border-brand-600 mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
          aria-hidden="true"
        />
      )}

      {isFailed && (
        <div className="bg-error-50 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <svg className="text-error-600 h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {status === 'completed' && (
        <div className="mx-auto mb-4 text-4xl" aria-hidden="true">
          🎬
        </div>
      )}

      <h2 className="text-lg font-semibold text-neutral-900">{copy.title}</h2>
      {copy.subtitle && <p className="mt-1 text-neutral-500">{copy.subtitle}</p>}

      {isFailed && (
        <div className="mx-auto mt-4 max-w-md space-y-3">
          <p className="text-sm text-neutral-600">
            {reel?.error?.message || "Mitra couldn't build the Reel this time. Please try again."}
          </p>
          <p className="text-sm text-neutral-500">
            Your credits were not consumed for this failed generation.
          </p>
          {onRetry && (
            <Button variant="primary" onClick={onRetry}>
              Try Again
            </Button>
          )}
        </div>
      )}

      {watchError && (
        <p className="text-error-600 mt-4 text-sm">Lost connection to live updates: {watchError}</p>
      )}
    </div>
  );
}
