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

export function FloatingCards({ currentBusiness, parallaxOffset = { x: 0, y: 0 } }: FloatingCardsProps) {
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
        className="absolute top-0 left-0 z-20 w-60 rounded-2xl border border-border-light bg-surface/95 p-3.5 shadow-xl backdrop-blur-xs transition-all duration-300 hover:scale-105 sm:w-64 lg:-left-6 lg:top-2"
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
          <div className="absolute bottom-2 left-2.5 right-2.5 text-white">
            <span className="inline-block rounded-md bg-brand-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              {currentBusiness?.offer || 'Limited Time'}
            </span>
            <h4 className="mt-0.5 truncate text-xs font-bold">{currentBusiness?.name || 'Hyderabadi Biryani Special'}</h4>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate max-w-[150px]">{currentBusiness?.tagline || 'Authentic taste.'}</span>
          </div>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-bold text-brand-600 border border-brand-100">
            Active
          </span>
        </div>
      </motion.div>

      {/* 2. MID-LEFT: WhatsApp Notification Pill */}
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -20 }}
        animate={{
          opacity: 1,
          y: reduceMotion ? 0 : [0, 8, 0],
          x: getLayerOffset(0.03).x,
          rotate: reduceMotion ? 2 : [2, 0, 2],
        }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                y: { duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 },
                rotate: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 0.5, delay: 0.2 },
              }
        }
        className="absolute top-44 left-1 z-30 hidden rounded-2xl border border-emerald-100 bg-surface/95 p-3 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105 sm:flex sm:items-center sm:gap-2.5 sm:w-56 lg:top-48 lg:-left-10"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.299.434 2.503 1.185 3.477l-.775 2.83 2.899-.76c.94.516 2.009.81 3.139.81 3.18 0 5.767-2.587 5.767-5.766.001-3.18-2.585-5.757-5.766-5.757zm0 10.377c-.961 0-1.895-.26-2.704-.752l-.194-.118-2.009.527.536-1.959-.13-.207a4.673 4.673 0 0 1-.715-2.482c.001-2.585 2.105-4.689 4.69-4.689 2.584 0 4.688 2.104 4.689 4.689 0 2.585-2.104 4.691-4.689 4.691z"/>
          </svg>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-1 text-[11px] font-bold text-text-primary">
            <span>Campaign published!</span>
            <span className="text-emerald-600">✓</span>
          </div>
          <p className="truncate text-[10px] text-text-secondary">Sent to 1,248 WhatsApp leads</p>
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
        className="absolute bottom-6 left-2 z-20 hidden rounded-2xl border border-border-light bg-surface/95 px-3.5 py-2.5 shadow-md backdrop-blur-md md:flex md:flex-col md:gap-1.5 lg:bottom-8 lg:-left-8"
      >
        <span className="text-[11px] font-bold text-text-secondary flex items-center gap-1">
          🌐 <span>Multi-language Dialects</span>
        </span>
        <div className="flex gap-1 text-[10px] font-bold">
          <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-brand-700">English</span>
          <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-brand-700">తెలుగు</span>
          <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-brand-700">Hinglish</span>
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
        className="absolute top-0 right-0 z-20 w-56 rounded-2xl border border-border-light bg-surface/95 p-3 shadow-xl transition-all duration-300 hover:scale-105 sm:w-60 lg:-right-6 lg:top-2"
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
              <h5 className="truncate text-xs font-bold text-text-primary">Specialty Coffee</h5>
              <span className="rounded-md bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-800">
                20% OFF
              </span>
            </div>
            <p className="mt-0.5 truncate text-[10px] text-text-secondary">Fresh brews. Better mornings.</p>
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
        className="absolute top-40 right-1 z-30 hidden w-60 rounded-2xl border border-border-light bg-surface/95 p-3.5 shadow-xl backdrop-blur-xs transition-all duration-300 hover:scale-105 sm:block lg:top-44 lg:-right-10"
      >
        <div className="flex items-center justify-between text-xs font-bold text-text-primary">
          <span>Choose your style</span>
          <span className="text-[9px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-md">
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
              className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                activeStyle === style.label
                  ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200 shadow-xs'
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
                    ? 'border-brand-600 bg-brand-600 ring-2 ring-brand-200'
                    : 'border-border-medium'
                }`}
              />
            </button>
          ))}
        </div>
      </motion.div>

      {/* 6. LOWER-RIGHT: Analytics Performance Card */}
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
        animate={{
          opacity: 1,
          y: reduceMotion ? 0 : [0, -7, 0],
          x: getLayerOffset(0.03).x,
          rotate: reduceMotion ? 2 : [2, 1, 2],
        }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                y: { duration: 5.1, repeat: Infinity, ease: 'easeInOut', delay: 0.7 },
                rotate: { duration: 6.8, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 0.5, delay: 0.4 },
              }
        }
        className="absolute bottom-6 right-2 z-20 hidden w-60 rounded-2xl border border-border-light bg-surface/95 p-3 shadow-xl transition-all duration-300 hover:scale-105 sm:block lg:bottom-8 lg:-right-8"
      >
        <div className="flex items-center justify-between text-[11px] font-bold text-text-primary">
          <span>Campaign Performance</span>
          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
            +34% Growth
          </span>
        </div>

        {/* Animated SVG Sparkline */}
        <div className="mt-1.5 h-8 w-full">
          <svg className="h-full w-full overflow-visible" viewBox="0 0 200 40">
            <path
              d="M 0 32 Q 40 10, 80 24 T 140 12 T 200 6"
              fill="none"
              stroke="#E84D1A"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 0 32 Q 40 10, 80 24 T 140 12 T 200 6 L 200 40 L 0 40 Z"
              fill="url(#sparklineGrad)"
              opacity="0.25"
            />
          </svg>
        </div>

        <div className="mt-1 grid grid-cols-3 gap-1 border-t border-border-light pt-1.5 text-center">
          <div>
            <span className="block text-[11px] font-bold text-text-primary">2.4K</span>
            <span className="text-[9px] text-text-tertiary">Views</span>
          </div>
          <div>
            <span className="block text-[11px] font-bold text-text-primary">892</span>
            <span className="text-[9px] text-text-tertiary">Clicks</span>
          </div>
          <div>
            <span className="block text-[11px] font-bold text-brand-600">123</span>
            <span className="text-[9px] text-text-tertiary">Orders</span>
          </div>
        </div>
      </motion.div>

      {/* ==========================================
          FLOATING BRAND ACCENT BADGES
          ========================================== */}
      <motion.div
        animate={reduceMotion ? {} : { y: [0, -12, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-28 left-44 z-10 hidden rounded-xl bg-gradient-to-br from-amber-400 to-brand-500 p-1.5 text-white shadow-md md:block"
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
        className="absolute top-28 right-48 z-10 hidden rounded-xl bg-gradient-to-br from-brand-500 to-rose-600 p-1.5 text-white shadow-md md:block"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </motion.div>
    </>
  );
}
