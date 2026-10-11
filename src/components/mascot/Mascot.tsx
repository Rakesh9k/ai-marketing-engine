'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { MASCOT_STATES, MASCOT_SIZE_MAP, type MascotState, type MascotSize } from './mascotStates';
import { MASCOT_ANIMATION_VARIANTS, type MascotAnimationVariant } from './mascotAnimations';

export interface MascotProps {
  /** Mascot state key (e.g. 'idle', 'curious', 'creating', 'designer', 'analyzing', etc.) */
  state?: MascotState | string;
  /** Legacy alias for state */
  pose?: MascotState | string;
  /** Size token or exact pixel height */
  size?: MascotSize | number;
  /** Motion animation variant */
  variant?: MascotAnimationVariant;
  /** Enables motion animation (defaults to true if variant is provided) */
  animated?: boolean;
  /** Renders contextual soft ground shadow beneath mascot */
  shadow?: boolean;
  /** Renders soft ambient brand-orange glow behind mascot */
  glow?: boolean;
  /** Enables hover lift & interactive cursor */
  interactive?: boolean;
  /** Priority image preloading for hero/landing */
  priority?: boolean;
  /** Accessibility alt text */
  alt?: string;
  /** Set false if mascot is informative rather than decorative */
  decorative?: boolean;
  /** Additional styling classes */
  className?: string;
  onClick?: () => void;
}

/** Variants that repeat forever. Everything else plays once and settles. */
const LOOPING_VARIANTS: ReadonlySet<MascotAnimationVariant> = new Set([
  'floating',
  'breathing',
  'thinking',
]);

// Calm, critically damped: a pose change or hover settles without overshoot or bounce.
const SETTLE = { type: 'spring', stiffness: 300, damping: 30 } as const;
const POSE_FADE_S = 0.2;

export function Mascot({
  state,
  pose,
  size = 'md',
  variant,
  animated = true,
  shadow = false,
  glow = false,
  interactive = false,
  priority = false,
  alt,
  decorative = true,
  className = '',
  onClick,
}: MascotProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // Ambient loops only run while the mascot is actually on screen; off-screen it rests.
  const inView = useInView(ref, { margin: '120px' });

  const effectiveState = (state || pose || 'idle') as MascotState;
  const meta = MASCOT_STATES[effectiveState] || MASCOT_STATES.idle;

  // Calculate dimensions to preserve aspect ratio (CLS = 0)
  const height = typeof size === 'number' ? size : MASCOT_SIZE_MAP[size] || 96;
  const width = Math.round(height * (meta.width / meta.height));

  const chosenVariantKey = (variant || meta.defaultVariant || 'floating') as MascotAnimationVariant;
  const isLooping = LOOPING_VARIANTS.has(chosenVariantKey);
  const rest = reduceMotion || !animated || (isLooping && !inView);
  const motionConfig = rest
    ? MASCOT_ANIMATION_VARIANTS['static']
    : MASCOT_ANIMATION_VARIANTS[chosenVariantKey] || MASCOT_ANIMATION_VARIANTS['floating'];

  const isInteractive = interactive || Boolean(onClick);
  const fade = reduceMotion ? 0 : POSE_FADE_S;

  return (
    // Outer box: owns the footprint. Different poses have different aspect ratios, so the
    // width eases to its new value instead of jumping (initial={false}: no mount animation,
    // so first paint is unchanged and layout shift stays zero).
    <motion.div
      ref={ref}
      initial={false}
      animate={{ width, height }}
      transition={{ duration: fade, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      className={`relative inline-flex flex-col items-center justify-center ${
        isInteractive ? 'cursor-pointer select-none' : ''
      } ${className}`.trim()}
      style={{ width, height }}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : alt || meta.alt}
    >
      {/* Inner box: the pose's entrance / ambient animation. */}
      <motion.div
        initial={motionConfig.initial}
        animate={motionConfig.animate}
        whileHover={isInteractive && !reduceMotion ? { y: -3, scale: 1.02 } : undefined}
        transition={SETTLE}
        className="relative flex h-full w-full items-center justify-center"
      >
        {/* Soft Ambient Brand-Orange Glow */}
        {glow && (
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-2xl transition-opacity duration-500"
            style={{
              background:
                'radial-gradient(circle, rgba(232, 77, 26, 0.28) 0%, rgba(232, 77, 26, 0) 70%)',
              transform: 'scale(1.35)',
            }}
          />
        )}

        {/* Official 3D CGI Mascot PNG. Poses crossfade; rapid changes simply replace the
            pending pose, so nothing queues up or competes. */}
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={effectiveState}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: fade, ease: 'easeOut' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Image
              src={meta.src}
              alt={alt || meta.alt}
              width={width}
              height={height}
              priority={priority || effectiveState === 'idle' || effectiveState === 'creating'}
              className="pointer-events-none object-contain drop-shadow-md"
              style={{ width, height }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Contextual Soft Ground Shadow */}
        {shadow && (
          <div
            className="pointer-events-none absolute -bottom-2 left-1/2 -z-10 -translate-x-1/2 rounded-full bg-neutral-900/15 blur-xs dark:bg-black/30"
            style={{
              width: Math.max(16, width * 0.65),
              height: Math.max(4, height * 0.08),
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
