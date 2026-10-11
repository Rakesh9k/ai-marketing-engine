'use client';

import React, { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useMagnetic } from '@/hooks/useMagnetic';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  strength?: number;
  className?: string;
}

export function MagneticButton({
  children,
  strength = 6,
  className = '',
  disabled,
  onClick,
  ...props
}: MagneticButtonProps) {
  const { ref, position, handleMouseMove, handleMouseLeave } = useMagnetic({ strength, disabled });
  const reduceMotion = useReducedMotion();
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!reduceMotion && !disabled) {
      const rect = e.currentTarget.getBoundingClientRect();
      const id = Date.now() + Math.random();
      setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
      window.setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 600);
    }
    onClick?.(e);
  };

  return (
    <motion.button
      ref={ref as any}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      disabled={disabled}
      animate={{ x: position.x, y: position.y }}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 350, damping: 20 }}
      className={`border-trace relative inline-flex items-center justify-center overflow-hidden rounded-xl font-bold transition-shadow focus:outline-none disabled:opacity-50 ${className}`.trim()}
      {...(props as any)}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          className="btn-ripple pointer-events-none absolute rounded-full bg-white/40"
          style={{ left: r.x, top: r.y }}
        />
      ))}
    </motion.button>
  );
}
