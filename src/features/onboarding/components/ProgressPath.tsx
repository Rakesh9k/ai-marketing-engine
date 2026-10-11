'use client';

import { motion, useReducedMotion } from 'motion/react';

interface ProgressPathProps {
  /** 0..1 */
  value: number;
}

/**
 * A line that draws itself as Mitra learns more — progress as a journey rather than a "step 3 of 8"
 * counter. With reduced motion it simply sits at the right length.
 */
export function ProgressPath({ value }: ProgressPathProps) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.min(1, Math.max(0, value));
  const d = 'M 4 22 C 70 2, 110 42, 180 22 S 300 2, 396 22';

  return (
    <div
      role="progressbar"
      aria-label="How well Mitra knows your business"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className="w-full"
    >
      <svg
        viewBox="0 0 400 44"
        className="h-8 w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={d}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          className="stroke-border-light"
        />
        <motion.path
          d={d}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          className="stroke-brand-500"
          initial={false}
          animate={{ pathLength: clamped }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
    </div>
  );
}
