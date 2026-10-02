'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Mascot } from './Mascot';
import type { MascotState, MascotSize } from './mascotStates';
import type { MascotAnimationVariant } from './mascotAnimations';

interface MascotSceneProps {
  state?: MascotState | string;
  pose?: MascotState | string;
  size?: MascotSize | number;
  variant?: MascotAnimationVariant;
  /** Short headline message — Mitra speaks concisely. */
  message: string;
  /** Optional supporting line under the message. */
  supporting?: string;
  /** Small illustration objects or badges placed around mascot */
  decoration?: ReactNode;
  align?: 'left' | 'center';
  glow?: boolean;
  shadow?: boolean;
  className?: string;
  children?: ReactNode;
}

export function MascotScene({
  state,
  pose = 'idle',
  size = 'lg',
  variant,
  message,
  supporting,
  decoration,
  align = 'left',
  glow = true,
  shadow = true,
  className = '',
  children,
}: MascotSceneProps) {
  const reduceMotion = useReducedMotion();
  const activeState = (state || pose) as MascotState;

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 26 }}
      className={`relative flex gap-6 ${
        align === 'center' ? 'flex-col items-center text-center' : 'items-start'
      } ${className}`.trim()}
    >
      {/* Mascot Anchor */}
      <div className="relative shrink-0">
        <Mascot
          state={activeState}
          size={size}
          variant={variant}
          glow={glow}
          shadow={shadow}
          animated
          interactive
        />
        {decoration && (
          <div className="pointer-events-none absolute -top-3 -right-3 z-10" aria-hidden="true">
            {decoration}
          </div>
        )}
      </div>

      {/* Narrative Speech / Copy Container */}
      <div className={align === 'center' ? 'max-w-xl' : 'pt-2 max-w-lg'}>
        <p className="text-text-primary text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
          {message}
        </p>
        {supporting && (
          <p className="text-text-secondary mt-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {supporting}
          </p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </motion.div>
  );
}
