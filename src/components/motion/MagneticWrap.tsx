'use client';

import React, { type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

interface MagneticWrapProps {
  children: ReactNode;
  /** Max pull toward the pointer, in px. */
  strength?: number;
  className?: string;
}

const SPRING = { stiffness: 350, damping: 20, mass: 0.3 };

/**
 * Pulls whatever it wraps (e.g. a styled <Link>) toward a mouse pointer.
 * Use this instead of MagneticButton when the target is an anchor, so we
 * never nest a <button> inside a link. Mouse-only; no-op for touch and
 * reduced motion.
 */
export function MagneticWrap({ children, strength = 6, className = '' }: MagneticWrapProps) {
  const reduceMotion = useReducedMotion();
  const x = useSpring(useMotionValue(0), SPRING);
  const y = useSpring(useMotionValue(0), SPRING);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    x.set(Math.max(-1, Math.min(1, dx)) * strength);
    y.set(Math.max(-1, Math.min(1, dy)) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      style={reduceMotion ? undefined : { x, y }}
      className={`inline-block ${className}`.trim()}
    >
      {children}
    </motion.div>
  );
}
