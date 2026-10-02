'use client';

import type { ElementType, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DURATION, EASE, STAGGER } from '@/lib/motionTokens';

interface RevealProps {
  children: ReactNode;
  /** Position in a staggered group; delays entrance by index * STAGGER.normal. */
  index?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
}

/** Fades/slides content in once as it scrolls into view. No-op under reduced motion. */
export function Reveal({ children, index = 0, y = 18, className, as = 'div' }: RevealProps) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    const Tag = as as ElementType;
    return <Tag className={className}>{children}</Tag>;
  }
  const MotionTag = motion[as];
  return (
    <MotionTag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: DURATION.slow, ease: EASE.enter, delay: index * STAGGER.normal }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}
