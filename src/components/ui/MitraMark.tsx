'use client';

import { motion, useReducedMotion, type Transition } from 'motion/react';

/**
 * The Mitra "M" brand mark — a bold rounded M with a separate solid dot above
 * its center. This is the single source of truth for the icon; every place
 * that needs the Mitra product mark should render this component rather than
 * re-declaring the SVG.
 *
 * The `state` prop turns the dot into the brand's small vocabulary of
 * animated states (see AGENTS brief: "M + dot pulsing = thinking",
 * "M + orbit = loading", "M + expanding circle = success"). Omit it for the
 * plain static mark used in logos, navigation and favicons.
 *
 * Animated with `motion` (Framer Motion) rather than CSS keyframes so state
 * transitions (e.g. loading -> success) interpolate instead of snapping, and
 * so reduced-motion can be honored explicitly via `useReducedMotion` — the
 * global CSS prefers-reduced-motion rule only covers `animation`/`transition`,
 * not JS-driven transforms.
 */

// Mirrors --ease-standard / --ease-out-expo in globals.css.
const EASE_STANDARD = [0.4, 0, 0.2, 1] as const;
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const SIZE_MAP = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
  '2xl': 48,
} as const;

export type MitraMarkSize = keyof typeof SIZE_MAP;
export type MitraMarkState = 'thinking' | 'loading' | 'success';

interface MitraMarkProps {
  size?: MitraMarkSize;
  className?: string;
  /** Purely decorative next to visible "Mitra" text — hides it from screen readers. */
  decorative?: boolean;
  ariaLabel?: string;
  /** Animates the dot to signal Mitra is thinking, working, or just finished. */
  state?: MitraMarkState;
}

export function MitraMark({
  size = 'md',
  className,
  decorative = false,
  ariaLabel = 'Mitra',
  state,
}: MitraMarkProps) {
  const dimension = SIZE_MAP[size];
  const label = state === 'thinking' || state === 'loading' ? `${ariaLabel} is working` : ariaLabel;
  const reduceMotion = useReducedMotion();

  const pulseTransition: Transition = reduceMotion
    ? { duration: 0 }
    : { duration: 1.4, ease: EASE_STANDARD, repeat: Infinity };

  const orbitTransition: Transition = reduceMotion
    ? { duration: 0 }
    : { duration: 2.2, ease: 'linear', repeat: Infinity };

  const ringTransition: Transition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.9, ease: EASE_OUT_EXPO };

  return (
    <motion.svg
      width={dimension}
      height={dimension}
      viewBox="0 0 200 190"
      whileHover={reduceMotion ? undefined : { scale: 1.06 }}
      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={`text-brand-500 shrink-0 ${className || ''}`.trim()}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : label}
    >
      <path
        d="M32,156 L32,56 L100,118 L168,56 L168,156"
        fill="none"
        stroke="currentColor"
        strokeWidth="32"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {state === 'success' && (
        <motion.circle
          cx="100"
          cy="105"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          initial={{ r: 20, opacity: 0.5 }}
          animate={{ r: reduceMotion ? 20 : 94, opacity: 0 }}
          transition={ringTransition}
        />
      )}
      {state === 'loading' ? (
        <motion.g
          style={{ transformOrigin: '100px 40px' }}
          animate={reduceMotion ? { rotate: 0 } : { rotate: 360 }}
          transition={orbitTransition}
        >
          <circle cx="100" cy="18" r="14" fill="currentColor" />
        </motion.g>
      ) : (
        <motion.circle
          cx="100"
          cy="18"
          r="14"
          fill="currentColor"
          style={{ transformOrigin: '100px 18px' }}
          animate={
            state === 'thinking' && !reduceMotion
              ? { opacity: [1, 0.45, 1], scale: [1, 0.82, 1] }
              : { opacity: 1, scale: 1 }
          }
          transition={state === 'thinking' ? pulseTransition : { duration: 0.2 }}
        />
      )}
    </motion.svg>
  );
}
