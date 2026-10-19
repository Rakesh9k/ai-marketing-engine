'use client';

import { useState, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { MitraMascot } from '@/components/ui/MitraMascot';
import type { BusinessContext } from './FloatingCards';
import { FloatingCards } from './FloatingCards';
import { ConnectingLines } from './ConnectingLines';
import { MarqueeTicker } from './MarqueeTicker';
import { useAutoRotate } from '@/hooks/useAutoRotate';
import { Magnetic } from './KineticEffects';

const BUSINESS_PRESETS: BusinessContext[] = [
  {
    id: 'restaurant',
    name: 'Hyderabadi Biryani Special',
    tagline: 'Authentic taste. Unbeatable flavour.',
    offer: 'Limited Time',
    category: 'Restaurant',
    image:
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'salon',
    name: 'Festive Glow-Up Package',
    tagline: 'Glass skin facial & hair spa combo.',
    offer: '20% OFF',
    category: 'Salon & Beauty',
    image:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'cafe',
    name: 'Artisanal Cold Brew Coffee',
    tagline: 'Freshly roasted beans every morning.',
    offer: 'Buy 1 Get 1',
    category: 'Cafe & Bakery',
    image:
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'realestate',
    name: 'Luxury 3BHK Apartment Launch',
    tagline: 'Gated community in tech corridor.',
    offer: 'Free Site Visit',
    category: 'Real Estate',
    image:
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'cloudkitchen',
    name: 'Weekend Family Combo Box',
    tagline: 'Delicious meals delivered hot.',
    offer: 'Flat ₹150 OFF',
    category: 'Cloud Kitchen',
    image:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
  },
];

export function HeroSection({ onGetStarted }: { onGetStarted: () => void }) {
  const reduceMotion = useReducedMotion();

  const heroRef = useRef<HTMLDivElement>(null);

  // Parallax coordinates
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  // Auto-rotates only while the hero is on screen; picking a chip takes over for good.
  const { index: activeBusinessIdx, select: setActiveBusinessIdx } = useAutoRotate({
    count: BUSINESS_PRESETS.length,
    intervalMs: 6000,
    containerRef: heroRef,
  });

  // Mouse parallax movement handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion || window.innerWidth < 1024 || !heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    setParallax({
      x: Math.max(-18, Math.min(18, mouseX / 25)),
      y: Math.max(-18, Math.min(18, mouseY / 25)),
    });
  };

  const currentBusiness = BUSINESS_PRESETS[activeBusinessIdx];

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden pt-20 pb-8 select-none sm:pt-24 sm:pb-12 lg:pt-24 lg:pb-16"
    >
      {/* Background Marquee Ticker - Positioned clearly below fixed header */}
      <div className="pointer-events-auto relative mt-2 mb-4 w-full opacity-90 sm:mt-3 sm:mb-6">
        <MarqueeTicker />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-2 sm:px-6 lg:px-8">
        {/* ==========================================
            HERO HEADER CONTENT (KINETIC & BOLD)
            ========================================== */}
        <div className="relative z-40 mx-auto max-w-4xl px-2 text-center sm:max-w-5xl sm:px-4">
          {/* Social Proof Pill */}
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="border-border-light bg-surface/90 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 shadow-xs backdrop-blur-md"
          >
            <span className="text-brand-600 text-xs font-bold">
              One photo. A month of marketing.
            </span>
          </motion.div>

          {/* Main Headline strictly in 2 lines */}
          <motion.h1
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-text-primary mt-2 text-2xl leading-tight font-black tracking-tight sm:text-4xl md:text-5xl lg:text-[52px]"
          >
            <span className="block whitespace-normal sm:whitespace-nowrap">Your next marketing campaign</span>
            <span className="text-brand-500 block whitespace-normal sm:whitespace-nowrap">starts with one photo.</span>
          </motion.h1>

          {/* Supporting Message - Concise and crisp */}
          <motion.p
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-text-secondary mx-auto mt-3 max-w-2xl text-sm leading-snug font-normal sm:text-base sm:leading-relaxed"
          >
            Give Mitra a photo or an offer — it instantly turns into ready-to-use posts, reels, and captions.
            <span className="mt-1 block font-semibold text-text-primary">
              Tell Mitra about your business once. It remembers what matters.
            </span>
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Magnetic strength={0.3} className="w-full sm:w-auto">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="shadow-brand-500/30 bg-brand-500 hover:bg-brand-600 hover:shadow-brand-500/40 w-full cursor-pointer rounded-full px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all sm:w-auto"
              >
                Try Mitra
              </Button>
            </Magnetic>

            <a href="#how-it-works" className="inline-block w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="border-border-medium text-text-primary hover:bg-surface-hover hover:border-brand-500 w-full cursor-pointer rounded-full px-7 py-3.5 text-sm font-bold transition-all sm:w-auto"
              >
                See how it works
              </Button>
            </a>
          </motion.div>

          <p className="text-text-tertiary mt-2 text-xs font-medium">
            ✨ No technical experience required • Takes less than 2 minutes
          </p>

          {/* Business Type Quick Switcher Chips */}
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-text-tertiary text-[11px] font-semibold">
              Try sample context:
            </span>
            {BUSINESS_PRESETS.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => setActiveBusinessIdx(idx)}
                className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                  activeBusinessIdx === idx
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-surface border-border-light text-text-secondary hover:border-brand-500 border'
                }`}
              >
                {b.category}
              </button>
            ))}
          </div>
        </div>

        {/* ==========================================
            HERO VISUAL STAGE (MASCOT & FLOATING CARDS)
            ========================================== */}
        <div className="relative mx-auto mt-4 min-h-[360px] w-full max-w-5xl sm:min-h-[420px] lg:min-h-[450px]">
          {/* Animated Connecting SVG Lines */}
          <div className="hidden sm:block">
            <ConnectingLines />
          </div>

          {/* Dynamic Floating Side UI Cards */}
          <FloatingCards currentBusiness={currentBusiness} parallaxOffset={parallax} />

          {/* CENTRAL MASCOT ANCHOR */}
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 z-30 flex items-center justify-center">
            <div className="relative">
              {/* Glow behind mascot */}
              <div className="bg-brand-500/20 absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />

              {/* Subtly floating mascot image */}
              <motion.div
                animate={
                  reduceMotion
                    ? { y: 0 }
                    : {
                        y: [0, -10, 0],
                        x: parallax.x * 0.015,
                      }
                }
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : {
                        y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
                        x: { duration: 0.2 },
                      }
                }
                className="pointer-events-auto relative"
              >
                <MitraMascot
                  pose="creating"
                  size="hero"
                  glow
                  shadow
                  animated
                  alt="Mitra AI Campaign Generator"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
