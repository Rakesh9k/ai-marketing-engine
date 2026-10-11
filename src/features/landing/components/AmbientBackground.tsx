'use client';

import { motion, useReducedMotion } from 'motion/react';

export function AmbientBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      {/* Subtle Warm Background Mesh Grid */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(#1c1815 0.75px, transparent 0.75px), radial-gradient(#1c1815 0.75px, transparent 0.75px)`,
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 16px 16px',
        }}
      />

      {/* Morphing Fluid Blob 1 - Top Left Orange Accent */}
      <motion.div
        animate={
          reduceMotion
            ? { x: 0, y: 0, scale: 1 }
            : {
                x: [0, 40, -30, 0],
                y: [0, -50, 30, 0],
                scale: [1, 1.15, 0.9, 1],
                rotate: [0, 45, -30, 0],
              }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                duration: 18,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
        className="from-brand-500/12 via-brand-400/8 dark:from-brand-500/20 dark:via-brand-600/10 absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br to-transparent blur-[100px]"
      />

      {/* Morphing Fluid Blob 2 - Center Right Warm Amber */}
      <motion.div
        animate={
          reduceMotion
            ? { x: 0, y: 0, scale: 1 }
            : {
                x: [0, -50, 40, 0],
                y: [0, 40, -40, 0],
                scale: [1, 0.85, 1.1, 1],
                rotate: [0, -40, 30, 0],
              }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                duration: 22,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
        className="via-brand-500/6 dark:via-brand-500/10 absolute top-1/3 -right-24 h-[600px] w-[600px] rounded-full bg-gradient-to-bl from-amber-500/10 to-transparent blur-[120px] dark:from-amber-500/15"
      />

      {/* Morphing Fluid Blob 3 - Bottom Left Soft Flame */}
      <motion.div
        animate={
          reduceMotion
            ? { x: 0, y: 0, scale: 1 }
            : {
                x: [0, 35, -25, 0],
                y: [0, -35, 25, 0],
                scale: [1, 1.1, 0.95, 1],
              }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                duration: 25,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
        className="from-brand-600/8 dark:from-brand-600/15 absolute -bottom-40 left-1/4 h-[550px] w-[550px] rounded-full bg-gradient-to-tr via-amber-400/5 to-transparent blur-[110px]"
      />
    </div>
  );
}
