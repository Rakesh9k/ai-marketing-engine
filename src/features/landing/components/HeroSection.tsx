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
      className="relative overflow-hidden pt-20 pb-12 select-none sm:pt-24 sm:pb-16 lg:pt-28 lg:pb-20"
    >
      {/* Background Marquee Ticker */}
      <div className="pointer-events-auto absolute top-16 right-0 left-0 opacity-80">
        <MarqueeTicker />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        {/* ==========================================
            HERO HEADER CONTENT (KINETIC & BOLD)
            ========================================== */}
        <div className="relative z-40 mx-auto max-w-4xl px-2 text-center sm:max-w-5xl sm:px-4">
          {/* Social Proof Pill */}
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="border-border-light bg-surface/90 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 shadow-xs backdrop-blur-md"
          >
            <span className="text-brand-600 text-xs font-bold">
              One photo. A month of marketing.
            </span>
          </motion.div>

          {/* Main Headline per Positioning */}
          <motion.h1
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-text-primary text-3xl leading-tight font-black tracking-tight sm:text-5xl md:text-6xl"
          >
            Your next marketing campaign <br className="hidden sm:inline" />
            <span className="text-brand-500">starts with one photo.</span>
          </motion.h1>

          {/* Supporting Message */}
          <motion.p
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-text-secondary mx-auto mt-4 max-w-2xl text-base leading-relaxed font-normal sm:text-lg"
          >
            Give Mitra a photo, an offer, or simply tell it what&apos;s happening in your business.
            Mitra turns it into posts, reels and campaign ideas ready to use.
            <span className="mt-2 block font-semibold">
              Tell Mitra about your business once. It remembers what matters.
            </span>
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Magnetic strength={0.3} className="w-full sm:w-auto">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="shadow-brand-500/30 bg-brand-500 hover:bg-brand-600 hover:shadow-brand-500/40 w-full cursor-pointer rounded-full px-8 py-4 text-base font-bold text-white shadow-lg transition-all sm:w-auto"
              >
                Try Mitra
              </Button>
            </Magnetic>

            <a href="#how-it-works" className="inline-block w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="border-border-medium text-text-primary hover:bg-surface-hover hover:border-brand-500 w-full cursor-pointer rounded-full px-7 py-4 text-sm font-bold transition-all sm:w-auto"
              >
                See how it works
              </Button>
            </a>
          </motion.div>

          <p className="text-text-tertiary mt-3 text-xs font-medium">
            ✨ No technical experience required • Takes less than 2 minutes
          </p>

          {/* Business Type Quick Switcher Chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
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
        <div className="relative mx-auto mt-6 min-h-[380px] w-full max-w-5xl sm:min-h-[440px] lg:min-h-[480px]">
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
