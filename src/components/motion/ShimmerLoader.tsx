'use client';

import { motion, useReducedMotion } from 'motion/react';

interface ShimmerLoaderProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export function ShimmerLoader({
  width = '100%',
  height = '20px',
  borderRadius = '12px',
  className = '',
}: ShimmerLoaderProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={`relative overflow-hidden bg-neutral-200/80 dark:bg-neutral-800/80 ${className}`.trim()}
      style={{ width, height, borderRadius }}
    >
      {!reduceMotion && (
        <motion.div
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.8,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10"
        />
      )}
    </div>
  );
}
