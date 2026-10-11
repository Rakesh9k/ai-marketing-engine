'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mascot } from '../mascot/Mascot';

export interface GenerationStage {
  id: string;
  label: string;
  sublabel: string;
}

const DEFAULT_STAGES: GenerationStage[] = [
  {
    id: '1',
    label: 'Understanding Offer',
    sublabel: 'Analyzing target audience & regional context...',
  },
  { id: '2', label: 'Shaping Strategy', sublabel: 'Selecting high-conversion marketing angle...' },
  {
    id: '3',
    label: 'Writing Copy & Hook',
    sublabel: 'Generating localized caption & call to action...',
  },
  {
    id: '4',
    label: 'Crafting Visual Assets',
    sublabel: 'Building brand-consistent poster layout...',
  },
  {
    id: '5',
    label: 'Preparing Campaign',
    sublabel: 'Finalizing formatting for instant publishing...',
  },
];

interface AIGenerationTimelineProps {
  stages?: GenerationStage[];
  activeStageIndex?: number;
  onComplete?: () => void;
  className?: string;
}

export function AIGenerationTimeline({
  stages = DEFAULT_STAGES,
  activeStageIndex: controlledIndex,
  onComplete,
  className = '',
}: AIGenerationTimelineProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const currentIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  useEffect(() => {
    if (controlledIndex !== undefined) return;
    const interval = setInterval(() => {
      setInternalIndex((prev) => {
        if (prev < stages.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          if (onComplete) onComplete();
          return prev;
        }
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [controlledIndex, stages.length, onComplete]);

  const currentStage = stages[currentIndex] || stages[0] || DEFAULT_STAGES[0];
  const isFinished = currentIndex === stages.length - 1;

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 text-center ${className}`.trim()}
    >
      {/* Mascot State Reaction */}
      <Mascot state={isFinished ? 'success' : 'creating'} size="xl" glow shadow animated priority />

      {/* Stage Headline & Sublabel */}
      <div className="mt-6 flex h-16 max-w-md flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage?.id || 'stage'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              {currentStage?.label}
            </h3>
            <p className="mt-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {currentStage?.sublabel}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Visual Multi-step Timeline Checkmarks */}
      <div className="mt-6 flex w-full max-w-sm items-center justify-center gap-2">
        {stages.map((stage, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <React.Fragment key={stage.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                        ? 'scale-110 bg-[#E84D1A] text-white ring-4 ring-[#E84D1A]/20'
                        : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                  }`}
                >
                  {isDone ? '✓' : idx + 1}
                </div>
              </div>
              {idx < stages.length - 1 && (
                <div
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    idx < currentIndex ? 'bg-emerald-500' : 'bg-neutral-200 dark:bg-neutral-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
