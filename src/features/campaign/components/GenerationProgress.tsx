'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
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

const STAGE_STEPS: { id: string; label: string; statuses: CampaignStatus[] }[] = [
  {
    id: 'business',
    label: 'Understanding your business',
    statuses: ['draft', 'validating', 'analyzing'],
  },
  { id: 'offer', label: 'Reading your offer', statuses: ['queued'] },
  { id: 'audience', label: 'Finding the right audience', statuses: ['strategizing'] },
  { id: 'copy', label: 'Building campaign strategy', statuses: ['generating_copy'] },
  {
    id: 'creatives',
    label: 'Preparing campaign creatives',
    statuses: ['generating_creatives', 'validating_output', 'generated', 'verified', 'completed'],
  },
];

function getActiveStageIndex(status: CampaignStatus): number {
  for (let i = 0; i < STAGE_STEPS.length; i++) {
    if (STAGE_STEPS[i]!.statuses.includes(status)) {
      return i;
    }
  }
  return 0;
}

const PERSONALITY_NUDGES: Partial<Record<CampaignStatus, string>> = {
  analyzing: 'Gathering insights about your brand and products...',
  strategizing: "Now I'm shaping this specifically for your target audience.",
  generating_copy: 'Turning your idea into copy people will want to read.',
  generating_creatives: 'Designing visual concepts tailored for your campaign.',
  validating_output: 'Double-checking prices, terms, and accuracy...',
};

interface GenerationProgressProps {
  campaignId: string;
  onSettled: (campaign: Campaign) => void;
}

/**
 * Polls the real campaign document for its actual backend-reported status,
 * displaying a sophisticated, motion-enhanced progress timeline with
 * Mitra's active thinking personality.
 */
export function GenerationProgress({ campaignId, onSettled }: GenerationProgressProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const settledRef = useRef(false);
  const reduceMotion = useReducedMotion();

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
  const activeStageIndex = getActiveStageIndex(status);
  const personalityNudge = PERSONALITY_NUDGES[status];

  const fadeProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.25, ease: 'easeOut' as const },
      };

  return (
    <div
      className="border-border-light bg-surface mx-auto max-w-xl rounded-2xl border p-8 text-center shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="mb-6 flex justify-center">
        <MitraMark size="xl" state="loading" decorative />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={status} {...fadeProps} className="space-y-1">
          <p className="text-text-primary text-xl font-semibold tracking-tight">{message}</p>
          {personalityNudge ? (
            <p className="text-brand-600 animate-pulse text-sm font-medium">{personalityNudge}</p>
          ) : (
            <p className="text-text-secondary text-sm">
              This can take up to a minute. Please don&apos;t close this page.
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Stage Sequence Progress Timeline */}
      <div className="border-border-light mt-8 space-y-3 border-t pt-6 text-left">
        {STAGE_STEPS.map((stage, idx) => {
          const isDone = idx < activeStageIndex;
          const isCurrent = idx === activeStageIndex;

          return (
            <div key={stage.id} className="flex items-center gap-3 text-sm">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                {isDone ? (
                  <motion.span
                    initial={reduceMotion ? {} : { scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-brand-600 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                  >
                    ✓
                  </motion.span>
                ) : isCurrent ? (
                  <span className="relative flex h-3 w-3">
                    <span className="bg-brand-400 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
                    <span className="bg-brand-600 relative inline-flex h-3 w-3 rounded-full"></span>
                  </span>
                ) : (
                  <span className="bg-border-medium h-2 w-2 rounded-full" />
                )}
              </div>
              <span
                className={`transition-colors duration-200 ${
                  isCurrent
                    ? 'text-text-primary font-semibold'
                    : isDone
                      ? 'text-text-secondary line-through opacity-70'
                      : 'text-text-tertiary'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {pollError && <p className="text-warning-600 mt-4 text-sm font-medium">{pollError}</p>}
    </div>
  );
}
