import type { TargetAndTransition } from 'motion/react';

export type MascotAnimationVariant =
  | 'floating'
  | 'breathing'
  | 'popIn'
  | 'celebrate'
  | 'thinking'
  | 'success'
  | 'error'
  | 'attention'
  | 'hover'
  | 'static';

export interface MascotAnimationConfig {
  initial?: TargetAndTransition;
  animate?: TargetAndTransition;
}

export const MASCOT_ANIMATION_VARIANTS: Record<MascotAnimationVariant, MascotAnimationConfig> = {
  floating: {
    initial: { y: 0 },
    animate: {
      y: [-3, 4, -3],
      transition: {
        duration: 3.6,
        ease: 'easeInOut',
        repeat: Infinity,
      },
    },
  },
  breathing: {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.018, 1],
      transition: {
        duration: 3.2,
        ease: 'easeInOut',
        repeat: Infinity,
      },
    },
  },
  popIn: {
    initial: { opacity: 0, scale: 0.88, y: 12 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 380,
        damping: 24,
      },
    },
  },
  celebrate: {
    initial: { opacity: 0, scale: 0.9, y: 10 },
    animate: {
      opacity: 1,
      scale: [1, 1.05, 1],
      y: [0, -8, 0],
      rotate: [0, -2, 2, 0],
      transition: {
        duration: 0.8,
        ease: 'easeOut',
      },
    },
  },
  thinking: {
    initial: { y: 0, rotate: 0 },
    animate: {
      y: [-2, 2, -2],
      rotate: [-1, 1, -1],
      transition: {
        duration: 4.2,
        ease: 'easeInOut',
        repeat: Infinity,
      },
    },
  },
  success: {
    initial: { opacity: 0, scale: 0.85 },
    animate: {
      opacity: 1,
      // Springs only support two keyframes, so the overshoot uses a tween.
      scale: [0.85, 1.06, 1],
      transition: {
        duration: 0.5,
        ease: 'easeOut',
        times: [0, 0.6, 1],
      },
    },
  },
  error: {
    initial: { opacity: 0, scale: 0.95 },
    animate: {
      opacity: 1,
      scale: 1,
      x: [0, -4, 4, -3, 3, 0],
      transition: {
        duration: 0.5,
        ease: 'easeInOut',
      },
    },
  },
  attention: {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.04, 1],
      rotate: [0, -3, 3, -2, 2, 0],
      transition: {
        duration: 0.7,
        ease: 'easeInOut',
      },
    },
  },
  hover: {
    initial: { y: 0, scale: 1 },
    animate: { y: 0, scale: 1 },
  },
  static: {
    initial: { opacity: 1, y: 0, scale: 1 },
    animate: { opacity: 1, y: 0, scale: 1 },
  },
};
