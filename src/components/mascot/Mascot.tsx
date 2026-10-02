'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import {
  MASCOT_STATES,
  MASCOT_SIZE_MAP,
  type MascotState,
  type MascotSize,
} from './mascotStates';
import {
  MASCOT_ANIMATION_VARIANTS,
  type MascotAnimationVariant,
} from './mascotAnimations';

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
  const effectiveState = (state || pose || 'idle') as MascotState;
  const meta = MASCOT_STATES[effectiveState] || MASCOT_STATES.idle;

  // Calculate dimensions to preserve aspect ratio (CLS = 0)
  const height = typeof size === 'number' ? size : MASCOT_SIZE_MAP[size] || 96;
  const width = Math.round(height * (meta.width / meta.height));

  const chosenVariantKey = (variant || meta.defaultVariant || 'floating') as MascotAnimationVariant;
  const motionConfig = reduceMotion || !animated
    ? MASCOT_ANIMATION_VARIANTS['static']
    : MASCOT_ANIMATION_VARIANTS[chosenVariantKey] || MASCOT_ANIMATION_VARIANTS['floating'];

  const isInteractive = interactive || Boolean(onClick);

  return (
    <motion.div
      initial={motionConfig.initial}
      animate={motionConfig.animate}
      whileHover={isInteractive && !reduceMotion ? { y: -6, scale: 1.03 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      onClick={onClick}
      className={`relative inline-flex flex-col items-center justify-center ${
        isInteractive ? 'cursor-pointer select-none' : ''
      } ${className}`.trim()}
      style={{ width, height }}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : alt || meta.alt}
    >
      {/* Soft Ambient Brand-Orange Glow */}
      {glow && (
        <div
          className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-2xl transition-opacity duration-500"
          style={{
            background: 'radial-gradient(circle, rgba(232, 77, 26, 0.28) 0%, rgba(232, 77, 26, 0) 70%)',
            transform: 'scale(1.35)',
          }}
        />
      )}

      {/* Official 3D CGI Mascot PNG */}
      <Image
        src={meta.src}
        alt={alt || meta.alt}
        width={width}
        height={height}
        priority={priority || effectiveState === 'idle' || effectiveState === 'creating'}
        className="object-contain drop-shadow-md transition-transform duration-300 pointer-events-none"
        style={{ width, height }}
      />

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
  );
}
