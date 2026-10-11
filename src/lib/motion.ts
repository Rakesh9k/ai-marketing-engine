import type { Variants } from 'motion/react';

/**
 * Timing hierarchy (seconds) — kept in step with DURATION in ./motionTokens so the two
 * motion vocabularies agree:
 *   instant  micro interactions (press, hover feedback)
 *   fast     small UI transitions and all exits (exits are quicker than entrances)
 *   normal   content entrances (lists, cards, panels)
 *   slow     large / hero transitions
 */
export const MOTION_DURATIONS = {
  instant: 0.1,
  fast: 0.18,
  normal: 0.3,
  slow: 0.5,
} as const;

export const EASE_STANDARD = [0.4, 0, 0.2, 1] as const;
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: MOTION_DURATIONS.normal, ease: EASE_OUT_EXPO },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: MOTION_DURATIONS.fast, ease: 'easeIn' },
  },
};

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: MOTION_DURATIONS.normal, ease: EASE_OUT_EXPO },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: MOTION_DURATIONS.fast, ease: 'easeIn' },
  },
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};
