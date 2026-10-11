'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

export interface BusinessContext {
  id: string;
  name: string;
  tagline: string;
  offer: string;
  category: string;
  image: string;
}

interface FloatingCardsProps {
  currentBusiness?: BusinessContext;
  parallaxOffset?: { x: number; y: number };
}

export function FloatingCards({
  currentBusiness,
  parallaxOffset = { x: 0, y: 0 },
}: FloatingCardsProps) {
  const reduceMotion = useReducedMotion();
  const [activeStyle, setActiveStyle] = useState<string>('Funny & Quirky');

  // Parallax helper per layer weight
  const getLayerOffset = (factor: number) => ({
    x: reduceMotion ? 0 : parallaxOffset.x * factor,
    y: reduceMotion ? 0 : parallaxOffset.y * factor,
  });

  return (
    <>
      {/* ==========================================
          LEFT COLUMN FLOATING ELEMENTS
          ========================================== */}

      {/* 1. TOP-LEFT: Primary Active Campaign Card */}
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 20, rotate: -3 }}
        animate={{
          opacity: 1,
          y: reduceMotion ? 0 : [0, -10, 0],
          x: getLayerOffset(0.04).x,
          rotate: reduceMotion ? -3 : [-3, -1, -3],
          scale: reduceMotion ? 1 : [1, 1.02, 1],
        }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                y: { duration: 4.8, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 6.2, repeat: Infinity, ease: 'easeInOut' },
                scale: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 0.5 },
              }
        }
        className="border-border-light bg-surface/95 absolute top-0 left-0 z-20 w-60 rounded-2xl border p-3.5 shadow-xl backdrop-blur-xs transition-all duration-300 hover:scale-105 sm:w-64 lg:top-2 lg:-left-6"
        style={{ transformOrigin: 'center left' }}
      >
        <div className="relative h-28 w-full overflow-hidden rounded-xl bg-neutral-900">
          <img
            src={
              currentBusiness?.image ||
              'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80'
            }
            alt={currentBusiness?.name || 'Hyderabadi Biryani'}
            className="h-full w-full object-cover opacity-90 transition-transform duration-500 hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute right-2.5 bottom-2 left-2.5 text-white">
            <span className="bg-brand-500/90 inline-block rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase">
              {currentBusiness?.offer || 'Limited Time'}
            </span>
            <h4 className="mt-0.5 truncate text-xs font-bold">
              {currentBusiness?.name || 'Hyderabadi Biryani Special'}
            </h4>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <div className="text-text-secondary flex items-center gap-1.5 text-[11px] font-medium">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="max-w-[150px] truncate">
              {currentBusiness?.tagline || 'Authentic taste.'}
            </span>
          </div>
          <span className="bg-brand-50 text-brand-600 border-brand-100 rounded-full border px-2 py-0.5 text-[9px] font-bold">
            Active
          </span>
        </div>
      </motion.div>

      {/* 3. LOWER-LEFT: Multi-language Pill Stack */}
      <motion.div
        animate={{
          y: reduceMotion ? 0 : [0, -6, 0],
          x: getLayerOffset(0.025).x,
          rotate: reduceMotion ? -1 : [-1, -3, -1],
        }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
        className="border-border-light bg-surface/95 absolute bottom-6 left-2 z-20 hidden rounded-2xl border px-3.5 py-2.5 shadow-md backdrop-blur-md md:flex md:flex-col md:gap-1.5 lg:bottom-8 lg:-left-8"
      >
        <span className="text-text-secondary flex items-center gap-1 text-[11px] font-bold">
          🌐 <span>Multi-language Dialects</span>
        </span>
        <div className="flex gap-1 text-[10px] font-bold">
          <span className="bg-brand-50 text-brand-700 rounded-md px-1.5 py-0.5">English</span>
          <span className="bg-brand-50 text-brand-700 rounded-md px-1.5 py-0.5">తెలుగు</span>
          <span className="bg-brand-50 text-brand-700 rounded-md px-1.5 py-0.5">Hinglish</span>
        </div>
      </motion.div>

      {/* ==========================================
          RIGHT COLUMN FLOATING ELEMENTS
          ========================================== */}

      {/* 4. TOP-RIGHT: Coffee Campaign Card */}
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 20, rotate: 3 }}
        animate={{
          opacity: 1,
          y: reduceMotion ? 0 : [0, -8, 0],
          x: getLayerOffset(0.035).x,
          rotate: reduceMotion ? 3 : [3, 4, 3],
          scale: reduceMotion ? 1 : [1, 1.015, 1],
        }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                y: { duration: 4.6, repeat: Infinity, ease: 'easeInOut', delay: 0.2 },
                rotate: { duration: 6.5, repeat: Infinity, ease: 'easeInOut' },
                scale: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 0.5, delay: 0.1 },
              }
        }
        className="border-border-light bg-surface/95 absolute top-0 right-0 z-20 w-56 rounded-2xl border p-3 shadow-xl transition-all duration-300 hover:scale-105 sm:w-60 lg:top-2 lg:-right-6"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-amber-900">
            <img
              src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&auto=format&fit=crop&q=80"
              alt="Specialty Coffee"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <h5 className="text-text-primary truncate text-xs font-bold">Specialty Coffee</h5>
              <span className="rounded-md bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-800">
                20% OFF
              </span>
            </div>
            <p className="text-text-secondary mt-0.5 truncate text-[10px]">
              Fresh brews. Better mornings.
            </p>
          </div>
        </div>
      </motion.div>

      {/* 5. MID-RIGHT: Style Selector Card */}
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
        animate={{
          opacity: 1,
          y: reduceMotion ? 0 : [0, 9, 0],
          x: getLayerOffset(0.04).x,
          rotate: reduceMotion ? -2 : [-2, -3, -2],
        }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                y: { duration: 5.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 },
                rotate: { duration: 7.2, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 0.5, delay: 0.3 },
              }
        }
        className="border-border-light bg-surface/95 absolute top-40 right-1 z-30 hidden w-60 rounded-2xl border p-3.5 shadow-xl backdrop-blur-xs transition-all duration-300 hover:scale-105 sm:block lg:top-44 lg:-right-10"
      >
        <div className="text-text-primary flex items-center justify-between text-xs font-bold">
          <span>Choose your style</span>
          <span className="text-brand-600 bg-brand-50 rounded-md px-1.5 py-0.5 text-[9px] font-bold">
            AI Adaptive
          </span>
        </div>
        <div className="mt-2 space-y-1">
          {[
            { label: 'Funny & Quirky', icon: '🎯' },
            { label: 'Serious & Professional', icon: '💼' },
            { label: 'Trendy & Modern', icon: '⚡' },
            { label: 'Minimal & Clean', icon: '🌿' },
          ].map((style) => (
            <button
              key={style.label}
              onClick={() => setActiveStyle(style.label)}
              className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1 text-[11px] font-medium transition-all ${
                activeStyle === style.label
                  ? 'bg-brand-50 text-brand-700 border-brand-200 border font-bold shadow-xs'
                  : 'text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span>{style.icon}</span>
                <span>{style.label}</span>
              </span>
              <span
                className={`h-2.5 w-2.5 rounded-full border ${
                  activeStyle === style.label
                    ? 'border-brand-600 bg-brand-600 ring-brand-200 ring-2'
                    : 'border-border-medium'
                }`}
              />
            </button>
          ))}
        </div>
      </motion.div>

      {/* ==========================================
          FLOATING BRAND ACCENT BADGES
          ========================================== */}
      <motion.div
        animate={reduceMotion ? {} : { y: [0, -12, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
        className="to-brand-500 absolute top-28 left-44 z-10 hidden rounded-xl bg-gradient-to-br from-amber-400 p-1.5 text-white shadow-md md:block"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
        </svg>
      </motion.div>

      <motion.div
        animate={reduceMotion ? {} : { y: [0, 10, 0], rotate: [0, -12, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        className="from-brand-500 absolute top-28 right-48 z-10 hidden rounded-xl bg-gradient-to-br to-rose-600 p-1.5 text-white shadow-md md:block"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </motion.div>
    </>
  );
}
