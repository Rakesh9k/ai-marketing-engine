'use client';

import { motion, useReducedMotion } from 'motion/react';

interface AmbientBackgroundProps {
  showGrid?: boolean;
  className?: string;
}

export function AmbientBackground({ showGrid = true, className = '' }: AmbientBackgroundProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={`pointer-events-none fixed inset-0 -z-50 overflow-hidden ${className}`.trim()}>
      {/* Slow Moving Ambient Gradient Orbs */}
      <motion.div
        animate={
          reduceMotion
            ? { opacity: 0.15 }
            : {
                x: [0, 40, -20, 0],
                y: [0, -30, 20, 0],
                scale: [1, 1.08, 0.95, 1],
              }
        }
        transition={{
          duration: 24,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
        className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[#E84D1A]/12 via-orange-400/8 to-transparent blur-3xl"
      />

      <motion.div
        animate={
          reduceMotion
            ? { opacity: 0.1 }
            : {
                x: [0, -50, 30, 0],
                y: [0, 40, -30, 0],
                scale: [1, 0.92, 1.06, 1],
              }
        }
        transition={{
          duration: 28,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
        className="absolute top-1/3 -right-40 h-[700px] w-[700px] rounded-full bg-gradient-to-bl from-amber-500/10 via-[#E84D1A]/6 to-transparent blur-3xl"
      />

      {/* Optional Ultra-subtle Architectural Grid */}
      {showGrid && (
        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      )}
    </div>
  );
}
