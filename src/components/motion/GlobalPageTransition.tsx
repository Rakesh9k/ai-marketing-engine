'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { PAGE_TRANSITION_VARIANTS } from '@/lib/motionTokens';

interface GlobalPageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function GlobalPageTransition({ children, className = '' }: GlobalPageTransitionProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={PAGE_TRANSITION_VARIANTS.initial}
      animate={PAGE_TRANSITION_VARIANTS.animate}
      exit={PAGE_TRANSITION_VARIANTS.exit}
      className={className}
    >
      {children}
    </motion.div>
  );
}
