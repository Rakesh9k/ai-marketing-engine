'use client';

import { useEffect, useState, useRef } from 'react';
import { campaignService } from '@/services/database';
import { MitraMark } from '@/components/ui/MitraMark';
import type { Campaign, CampaignStatus } from '@/types';

const STATUS_MESSAGES: Partial<Record<CampaignStatus, string>> = {
  draft: 'Preparing your campaign...',
  validating: 'Validating your campaign details...',
  queued: 'Queued for generation...',
  analyzing: 'Understanding your business and product...',
  strategizing: 'Building your campaign strategy...',
  generating_copy: 'Generating campaign copy...',
  generating_creatives: 'Creating campaign creatives...',
  validating_output: 'Checking campaign accuracy...',
  generated: 'Campaign generated.',
  verified: 'Campaign generated and verified.',
  completed: 'Campaign complete.',
  failed: 'Campaign generation failed.',
};

const TERMINAL_STATUSES: CampaignStatus[] = ['generated', 'verified', 'completed', 'failed'];

interface GenerationProgressProps {
  campaignId: string;
  onSettled: (campaign: Campaign) => void;
}

/**
 * Polls the real campaign document for its actual backend-reported status.
 * No fake percentages — only the real pipeline stage names the backend sets.
 */
export function GenerationProgress({ campaignId, onSettled }: GenerationProgressProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const current = await campaignService.get(campaignId);
        if (cancelled) return;
        if (current) {
          setCampaign(current);
          setPollError(null);
          if (TERMINAL_STATUSES.includes(current.status) && !settledRef.current) {
            settledRef.current = true;
            onSettled(current);
            return;
          }
        }
      } catch {
        if (!cancelled) setPollError("Couldn't check campaign progress. Retrying...");
      }
      if (!cancelled) {
        timer = setTimeout(poll, 2500);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [campaignId, onSettled]);

  const status = campaign?.status || 'draft';
  const message = STATUS_MESSAGES[status] || 'Working on your campaign...';

  return (
    <div
      className="rounded-lg border border-neutral-200 bg-white p-8 text-center"
      role="status"
      aria-live="polite"
    >
      {/* M dominates the AI-thinking moment (design brief §11) — the mark's
          own built-in "loading" state (an orbiting dot, already defined in
          globals.css for exactly this) replaces what used to be a second,
          redundant generic spinner stacked underneath it. */}
      <MitraMark size="xl" state="loading" decorative className="mx-auto mb-4" />
      <p className="text-lg font-medium text-neutral-900">{message}</p>
      <p className="mt-1 text-sm text-neutral-500">
        This can take up to a minute. Please don&apos;t close this page.
      </p>
      {pollError && <p className="text-warning-600 mt-3 text-sm">{pollError}</p>}
    </div>
  );
}
