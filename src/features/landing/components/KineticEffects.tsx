'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { MitraLogo } from '@/components/ui/MitraLogo';
import { useAutoRotate } from '@/hooks/useAutoRotate';

interface MagneticProps {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}

export function Magnetic({ children, strength = 0.25, className = '' }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const reduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion || !ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * strength, y: middleY * strength });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, mass: 0.2 }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
}

/**
 * Self-Drawing SVG stroke path component for morphing / self-drawing icons
 */
interface SelfDrawingPathProps {
  d: string;
  className?: string;
  strokeWidth?: number;
  duration?: number;
  fillDelay?: number;
}

export function SelfDrawingPath({
  d,
  className = '',
  strokeWidth = 2,
  duration = 1.2,
}: SelfDrawingPathProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.path
      d={d}
      className={className}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
      whileInView={{ pathLength: 1 }}
      viewport={{ once: true }}
      transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}

/**
 * Kinetic Headline with word-by-word reveal and hover distortion tracking effect
 */
interface KineticHeadlineProps {
  text: string;
  highlightWord?: string;
  className?: string;
}

export function KineticHeadline({ text, highlightWord, className = '' }: KineticHeadlineProps) {
  const reduceMotion = useReducedMotion();
  const words = text.split(' ');

  return (
    <h2 className={`font-bold tracking-tight ${className}`}>
      {words.map((word, idx) => {
        const isHighlight =
          highlightWord && word.toLowerCase().includes(highlightWord.toLowerCase());

        return (
          <motion.span
            key={`${word}-${idx}`}
            initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.05 }}
            className={`mr-[0.25em] inline-block transition-transform duration-300 hover:scale-105 ${
              isHighlight
                ? 'text-brand-600 from-brand-600 via-brand-500 bg-gradient-to-r to-amber-600 bg-clip-text text-transparent'
                : 'text-text-primary'
            }`}
          >
            {word}
          </motion.span>
        );
      })}
    </h2>
  );
}

/**
 * Promper / Text Scroll Rotating Headline
 * Displays rotating action words ("Create.", "Promote.", "Grow.") smoothly scrolling vertically
 * in a loop while keeping "All with" and the full Mitra logo on the exact same single line.
 * Uses solid brand colors (no text gradient) and embeds the official Mitra logo.
 */
interface RotatingWordHeadlineProps {
  words?: string[];
  suffix?: string;
  className?: string;
  intervalMs?: number;
}

export function RotatingWordHeadline({
  words = ['Create.', 'Promote.', 'Grow.'],
  suffix = 'All with',
  className = '',
  intervalMs = 2400,
}: RotatingWordHeadlineProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  // Only ticks while on screen, with the tab foregrounded, and without reduced motion.
  const { index } = useAutoRotate({ count: words.length, intervalMs, containerRef });

  const currentWord = words[index];

  return (
    <div
      ref={containerRef}
      className="flex w-full max-w-full items-center justify-center overflow-visible px-1 py-1"
    >
      <h1
        className={`inline-flex flex-nowrap items-center justify-center gap-x-1.5 leading-none font-extrabold tracking-tight whitespace-nowrap sm:gap-x-2.5 ${className}`}
      >
        {/* Animated Vertical Text Scroll Slot (Dynamic Width Grid, No Wide Gap) */}
        <span className="relative inline-grid h-[1.3em] shrink-0 items-center overflow-hidden text-left [grid-template-areas:'stack']">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={currentWord}
              style={{ gridArea: 'stack' }}
              initial={
                reduceMotion ? { opacity: 1 } : { y: '100%', opacity: 0, filter: 'blur(3px)' }
              }
              animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
              exit={reduceMotion ? { opacity: 0 } : { y: '-100%', opacity: 0, filter: 'blur(3px)' }}
              transition={{
                y: { type: 'spring', stiffness: 280, damping: 22 },
                opacity: { duration: 0.25 },
                filter: { duration: 0.2 },
              }}
              className="text-brand-600 inline-block font-extrabold whitespace-nowrap select-none"
            >
              {currentWord}
            </motion.span>
          </AnimatePresence>
        </span>

        {/* Static Suffix Text: "All with" (Natural Gap) */}
        <span className="text-text-primary shrink-0 font-extrabold select-none">{suffix}</span>

        {/* Full Mitra Wordmark Logo Image in exact font cap-height alignment */}
        <span className="inline-flex shrink-0 items-center self-center">
          <MitraLogo
            variant="wordmark"
            size="sm"
            className="h-[1.05em] w-auto translate-y-[-0.04em] object-contain"
            ariaLabel="Mitra"
          />
        </span>
      </h1>
    </div>
  );
}
