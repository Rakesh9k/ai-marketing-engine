'use client';

import { useRef } from 'react';
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';

interface MarqueeTickerProps {
  items?: string[];
  speed?: number;
  className?: string;
}

const DEFAULT_ITEMS = [
  '🟢 Mitra AI v4.2 Live',
  '⚡ 52,400+ Local Campaigns Generated',
  '🗣️ 12+ Indian Regional Languages Supported',
  '📸 Photo + Offer → 1-Click WhatsApp & Instagram Launch',
  '📊 99.4% AI Tone & Cultural Context Match',
  '🚀 ₹4.8Cr+ Revenue Generated for Local Businesses',
];

export function MarqueeTicker({
  items = DEFAULT_ITEMS,
  speed = 35,
  className = '',
}: MarqueeTickerProps) {
  const reduceMotion = useReducedMotion();

  // Scroll velocity speeds the ticker up and skews it slightly; both settle back at rest.
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const skewX = useTransform(smoothVelocity, [-3000, 3000], [-8, 8], { clamp: true });
  const x = useMotionValue(0);
  const lastTime = useRef<number | null>(null);

  useAnimationFrame((time) => {
    if (reduceMotion) return;
    const dt = lastTime.current === null ? 0 : time - lastTime.current;
    lastTime.current = time;
    const boost = 1 + Math.min(Math.abs(smoothVelocity.get()) / 400, 6);
    // One third of the track is one full loop; speed is seconds per loop.
    const next = x.get() - (33.333 / (speed * 1000)) * dt * boost;
    x.set(next <= -33.333 ? next + 33.333 : next);
  });

  const xPercent = useTransform(x, (v) => `${v}%`);

  const duplicatedItems = [...items, ...items, ...items];

  return (
    <div className={`relative overflow-hidden py-3 select-none ${className}`}>
      {/* Edge Blur Gradients */}
      <div className="pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-16 bg-gradient-to-r from-bg-primary to-transparent" />
      <div className="pointer-events-none absolute top-0 bottom-0 right-0 z-10 w-16 bg-gradient-to-l from-bg-primary to-transparent" />

      <div className="flex w-full overflow-hidden">
        <motion.div
          style={{ x: xPercent, skewX: reduceMotion ? 0 : skewX }}
          className="flex shrink-0 items-center gap-8 whitespace-nowrap"
        >
          {duplicatedItems.map((item, idx) => (
            <div
              key={`${item}-${idx}`}
              className="border-border-light/70 bg-surface/80 hover:border-brand-500/40 inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-xs font-semibold text-text-secondary shadow-2xs backdrop-blur-md transition-colors"
            >
              <span>{item}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
