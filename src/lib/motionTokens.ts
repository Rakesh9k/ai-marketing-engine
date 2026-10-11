import type { Transition } from 'motion/react';

export const DURATION = {
  instant: 0.1,
  fast: 0.18,
  normal: 0.3,
  slow: 0.5,
  dramatic: 0.8,
} as const;

export const EASE = {
  standard: [0.4, 0, 0.2, 1] as const,
  enter: [0, 0, 0.2, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
  emphasized: [0.2, 0, 0, 1] as const,
};

export const SPRING = {
  snappy: { type: 'spring', stiffness: 450, damping: 26 } satisfies Transition,
  gentle: { type: 'spring', stiffness: 280, damping: 22 } satisfies Transition,
  bouncy: { type: 'spring', stiffness: 500, damping: 18 } satisfies Transition,
  float: { type: 'spring', stiffness: 120, damping: 14 } satisfies Transition,
};

export const STAGGER = {
  fast: 0.04,
  normal: 0.08,
  slow: 0.14,
};

export const PAGE_TRANSITION_VARIANTS = {
  initial: { opacity: 0, y: 8, scale: 0.995 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATION.normal,
      ease: EASE.standard,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: DURATION.fast,
      ease: EASE.exit,
    },
  },
};

export const REVEAL_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * STAGGER.fast,
      duration: DURATION.normal,
      ease: EASE.enter,
    },
  }),
};
