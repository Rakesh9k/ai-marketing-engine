'use client';

import React, { type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

interface InteractiveCardProps {
  children: ReactNode;
  maxTilt?: number;
  glow?: boolean;
  /** Skip the built-in surface styling so className fully controls the look. */
  bare?: boolean;
  className?: string;
  onClick?: () => void;
}

const SPRING = { stiffness: 350, damping: 24 };

/**
 * Card that tilts toward a mouse pointer. Driven by motion values, so pointer
 * movement never re-renders the card's children. Touch and pen input are
 * ignored, and reduced motion disables tilt entirely.
 */
export function InteractiveCard({
  children,
  maxTilt = 3,
  glow = false,
  bare = false,
  className = '',
  onClick,
}: InteractiveCardProps) {
  const reduceMotion = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), SPRING);
  const rotateY = useSpring(useMotionValue(0), SPRING);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateX.set(-py * 2 * maxTilt);
    rotateY.set(px * 2 * maxTilt);
  };

  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const surface = bare
    ? ''
    : 'rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-md transition-shadow hover:shadow-xl dark:border-neutral-800/80 dark:bg-neutral-900/90';

  return (
    <motion.div
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onClick={onClick}
      style={reduceMotion ? undefined : { rotateX, rotateY, transformPerspective: 1000 }}
      whileHover={reduceMotion ? undefined : { scale: 1.01 }}
      transition={{ type: 'spring', ...SPRING }}
      className={`relative ${surface} ${onClick ? 'cursor-pointer select-none' : ''} ${
        glow ? 'ring-2 ring-[#E84D1A]/30 dark:ring-[#E84D1A]/40' : ''
      } ${className}`.trim()}
    >
      {glow && (
        <div className="pointer-events-none absolute -inset-0.5 -z-10 rounded-3xl bg-gradient-to-br from-[#E84D1A]/20 to-transparent opacity-80 blur-md" />
      )}
      {children}
    </motion.div>
  );
}
