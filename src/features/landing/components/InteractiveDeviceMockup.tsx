'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

export type ScreenId = 'photo_offer' | 'business_brain' | 'ai_generation' | 'multi_publish';

interface InteractiveDeviceMockupProps {
  activeScreen?: ScreenId;
  onScreenChange?: (screen: ScreenId) => void;
  className?: string;
}

export function InteractiveDeviceMockup({
  activeScreen: externalScreen,
  onScreenChange,
  className = '',
}: InteractiveDeviceMockupProps) {
  const reduceMotion = useReducedMotion();
  const [internalScreen, setInternalScreen] = useState<ScreenId>('photo_offer');
  const mockupRef = useRef<HTMLDivElement>(null);

  // 3D Mouse Tilt State
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 20 });

  const activeScreen = externalScreen || internalScreen;

  const handleSelectScreen = (screen: ScreenId) => {
    setInternalScreen(screen);
    onScreenChange?.(screen);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || !mockupRef.current) return;
    // Touch has no hover: a dragging finger tilts the device, more gently than a mouse.
    const range = e.pointerType === 'mouse' ? 12 : 7;
    const rect = mockupRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    // Calculate smooth tilt values
    const rotateX = -(mouseY / rect.height) * range;
    const rotateY = (mouseX / rect.width) * range;

    setTilt({
      rotateX,
      rotateY,
      shadowX: -rotateY * 1.5,
      shadowY: 20 + Math.abs(rotateX),
    });
  };

  const resetTilt = () => {
    setTilt({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 20 });
  };

  return (
    <div className={`relative mx-auto w-full max-w-4xl select-none ${className}`}>
      {/* SCREEN CONTROLLER TABS */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => handleSelectScreen('photo_offer')}
          className={`group flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
            activeScreen === 'photo_offer'
              ? 'border-brand-500 bg-brand-500 shadow-brand-500/20 text-white shadow-md'
              : 'border-border-light bg-surface text-text-secondary hover:border-brand-500/50 hover:text-text-primary'
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">
            01
          </span>
          <span>📸 Photo & Offer</span>
        </button>

        <button
          onClick={() => handleSelectScreen('business_brain')}
          className={`group flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
            activeScreen === 'business_brain'
              ? 'border-brand-500 bg-brand-500 shadow-brand-500/20 text-white shadow-md'
              : 'border-border-light bg-surface text-text-secondary hover:border-brand-500/50 hover:text-text-primary'
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">
            02
          </span>
          <span>🧠 Business Brain</span>
        </button>

        <button
          onClick={() => handleSelectScreen('ai_generation')}
          className={`group flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
            activeScreen === 'ai_generation'
              ? 'border-brand-500 bg-brand-500 shadow-brand-500/20 text-white shadow-md'
              : 'border-border-light bg-surface text-text-secondary hover:border-brand-500/50 hover:text-text-primary'
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">
            03
          </span>
          <span>🎨 AI Generation</span>
        </button>

        <button
          onClick={() => handleSelectScreen('multi_publish')}
          className={`group flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
            activeScreen === 'multi_publish'
              ? 'border-brand-500 bg-brand-500 shadow-brand-500/20 text-white shadow-md'
              : 'border-border-light bg-surface text-text-secondary hover:border-brand-500/50 hover:text-text-primary'
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">
            04
          </span>
          <span>🚀 1-Click Launch</span>
        </button>
      </div>

      {/* 3D PARALLAX DEVICE CONTAINER */}
      <div
        ref={mockupRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        onPointerUp={resetTilt}
        onPointerCancel={resetTilt}
        className="perspective-1000 relative flex justify-center py-4"
      >
        <motion.div
          animate={
            reduceMotion
              ? { rotateX: 0, rotateY: 0 }
              : { rotateX: tilt.rotateX, rotateY: tilt.rotateY }
          }
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative w-full max-w-[340px] sm:max-w-[400px] md:max-w-[440px]"
        >
          {/* Ambient Glow behind Mockup */}
          <div className="from-brand-500/30 to-brand-600/30 absolute -inset-4 rounded-[48px] bg-gradient-to-r via-amber-500/20 opacity-70 blur-2xl" />

          {/* MAIN HARDWARE SHELL (IPHONE / TABLET STYLED MOCKUP) */}
          <div
            className="relative rounded-[44px] border-[8px] border-zinc-900 bg-zinc-950 p-3 shadow-2xl ring-1 ring-white/10 dark:border-zinc-800"
            style={{
              boxShadow: `${tilt.shadowX}px ${tilt.shadowY}px 50px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)`,
            }}
          >
            {/* Dynamic Island / Speaker Notch */}
            <div className="absolute top-4 left-1/2 z-30 flex h-4 w-28 -translate-x-1/2 items-center justify-between rounded-full bg-zinc-900 px-2">
              <div className="h-2 w-2 rounded-full bg-zinc-950" />
              <div className="h-1.5 w-10 rounded-full bg-zinc-800" />
              <div className="h-2 w-2 rounded-full bg-blue-900/60" />
            </div>

            {/* LIVE DEVICE SCREEN INNER CANVAS */}
            <div className="bg-bg-primary relative min-h-[560px] overflow-hidden rounded-[36px] p-4 sm:min-h-[600px]">
              {/* Device Status Bar */}
              <div className="text-text-secondary mb-4 flex items-center justify-between pt-1 text-[11px] font-bold">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  <span className="text-brand-600 text-[10px] font-semibold">Mitra AI Engine</span>
                  <div className="flex gap-0.5">
                    <div className="bg-text-primary h-2.5 w-1 rounded-xs" />
                    <div className="bg-text-primary h-2.5 w-1 rounded-xs" />
                    <div className="bg-text-primary h-2.5 w-1 rounded-xs" />
                  </div>
                </div>
              </div>

              {/* DYNAMIC SCREEN CONTENT WITH SLIDE/FADE ANIMATION */}
              <AnimatePresence mode="wait">
                {activeScreen === 'photo_offer' && (
                  <motion.div
                    key="photo_offer"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-brand-600 text-[10px] font-bold tracking-wider uppercase">
                          Step 01
                        </span>
                        <h4 className="text-text-primary text-sm font-bold">
                          Photo & Offer Upload
                        </h4>
                      </div>
                      <span className="bg-brand-50 text-brand-700 rounded-full px-2 py-0.5 text-[10px] font-bold">
                        Quick Start
                      </span>
                    </div>

                    {/* Preview Image Frame */}
                    <div className="border-border-light bg-surface relative h-44 w-full overflow-hidden rounded-2xl border shadow-xs">
                      <img
                        src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80"
                        alt="Hyderabadi Biryani Promo"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3">
                        <span className="text-[10px] font-bold text-amber-400">
                          SPECIAL OFFER PRESET
                        </span>
                        <span className="text-xs font-bold text-white">
                          Hyderabadi Special Mutton Biryani
                        </span>
                        <span className="text-[11px] font-medium text-zinc-200">
                          Flat 20% OFF • Weekend Family Deal
                        </span>
                      </div>
                    </div>

                    {/* Input Controls */}
                    <div className="border-border-light bg-surface space-y-2 rounded-2xl border p-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary font-medium">Business Category</span>
                        <span className="text-brand-600 font-semibold">Restaurant & Catering</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary font-medium">Offer Price</span>
                        <span className="font-semibold text-emerald-600">₹399 (Was ₹499)</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary font-medium">Target Language</span>
                        <span className="text-text-primary font-semibold">
                          Hyderabadi Telugu + English
                        </span>
                      </div>
                    </div>

                    {/* Action button in screen */}
                    <button
                      onClick={() => handleSelectScreen('business_brain')}
                      className="bg-brand-500 shadow-brand-500/20 w-full rounded-xl py-2.5 text-xs font-bold text-white shadow-md transition-transform active:scale-95"
                    >
                      Generate Campaign Pack →
                    </button>
                  </motion.div>
                )}

                {activeScreen === 'business_brain' && (
                  <motion.div
                    key="business_brain"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-brand-600 text-[10px] font-bold tracking-wider uppercase">
                          Step 02
                        </span>
                        <h4 className="text-text-primary text-sm font-bold">
                          Business Brain AI Analysis
                        </h4>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        Context Matched
                      </span>
                    </div>

                    {/* Mascot Thinking state card */}
                    <div className="border-brand-100 bg-brand-50/50 flex items-center gap-3 rounded-2xl border p-3">
                      <MitraMascot pose="thinking" size={48} className="shrink-0" />
                      <div>
                        <span className="text-brand-700 text-xs font-bold">
                          Mitra AI Learning Tone...
                        </span>
                        <p className="text-text-secondary text-[11px] leading-snug">
                          Analyzing local audience preferences, festival timing, and high-converting
                          offer hooks in Hyderabad.
                        </p>
                      </div>
                    </div>

                    {/* Brain Insights List */}
                    <div className="space-y-2">
                      <div className="border-border-light bg-surface rounded-xl border p-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-text-primary font-bold">🎯 Primary Target</span>
                          <span className="text-[10px] font-semibold text-emerald-600">
                            High Conversion
                          </span>
                        </div>
                        <p className="text-text-secondary mt-1 text-[11px]">
                          Families & tech professionals ordering weekend lunch combos.
                        </p>
                      </div>

                      <div className="border-border-light bg-surface rounded-xl border p-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-text-primary font-bold">🗣️ Copywriting Angle</span>
                          <span className="text-brand-600 text-[10px] font-semibold">
                            Authentic Taste
                          </span>
                        </div>
                        <p className="text-text-secondary mt-1 text-[11px]">
                          "Weekend biryani craving? Authentic Dum Biryani delivered hot!"
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectScreen('ai_generation')}
                      className="bg-brand-500 shadow-brand-500/20 w-full rounded-xl py-2.5 text-xs font-bold text-white shadow-md"
                    >
                      View Generated Assets →
                    </button>
                  </motion.div>
                )}

                {activeScreen === 'ai_generation' && (
                  <motion.div
                    key="ai_generation"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-brand-600 text-[10px] font-bold tracking-wider uppercase">
                          Step 03
                        </span>
                        <h4 className="text-text-primary text-sm font-bold">
                          6+ Ready Campaign Assets
                        </h4>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        100% Generated
                      </span>
                    </div>

                    {/* Grid of Generated Assets */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Asset 1: Poster */}
                      <div className="border-border-light bg-surface relative overflow-hidden rounded-xl border p-2 shadow-2xs">
                        <img
                          src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&auto=format&fit=crop&q=80"
                          alt="Instagram Poster"
                          className="h-20 w-full rounded-lg object-cover"
                        />
                        <span className="text-text-primary mt-1 block text-[10px] font-bold">
                          Instagram Poster
                        </span>
                        <span className="text-[9px] font-semibold text-emerald-600">
                          Ready to post
                        </span>
                      </div>

                      {/* Asset 2: Reel Script */}
                      <div className="border-border-light bg-surface relative overflow-hidden rounded-xl border p-2 shadow-2xs">
                        <div className="flex h-20 w-full flex-col justify-between rounded-lg bg-zinc-900 p-2 text-white">
                          <span className="text-[9px] font-bold text-amber-400">
                            🎬 REEL SCRIPT
                          </span>
                          <span className="line-clamp-2 text-[10px] leading-tight">
                            "Sunday family lunch clear kaavali ante..."
                          </span>
                          <span className="text-[8px] text-zinc-400">
                            Audio: Trending Viral Beat
                          </span>
                        </div>
                        <span className="text-text-primary mt-1 block text-[10px] font-bold">
                          15s Instagram Reel
                        </span>
                        <span className="text-brand-600 text-[9px] font-semibold">
                          With Audio Beat
                        </span>
                      </div>
                    </div>

                    {/* WhatsApp Broadcast Preview */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <span>💬 WhatsApp Broadcast Message</span>
                      </div>
                      <p className="mt-1 text-[10px] leading-snug text-emerald-900">
                        " Namaste Hyderabad! Craving piping hot Dum Biryani today? Flat 20% OFF for
                        first 50 orders! Tap to order: wa.me/91987..."
                      </p>
                    </div>

                    <button
                      onClick={() => handleSelectScreen('multi_publish')}
                      className="bg-brand-500 shadow-brand-500/20 w-full rounded-xl py-2.5 text-xs font-bold text-white shadow-md"
                    >
                      Share or Download →
                    </button>
                  </motion.div>
                )}

                {activeScreen === 'multi_publish' && (
                  <motion.div
                    key="multi_publish"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-brand-600 text-[10px] font-bold tracking-wider uppercase">
                          Step 04
                        </span>
                        <h4 className="text-text-primary text-sm font-bold">Share or download</h4>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="border-border-light bg-surface flex items-center justify-between rounded-xl border p-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500">💬</span>
                          <span className="text-text-primary font-semibold">WhatsApp message</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600">
                          Ready to share
                        </span>
                      </div>
                      <div className="border-border-light bg-surface flex items-center justify-between rounded-xl border p-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-pink-500">📸</span>
                          <span className="text-text-primary font-semibold">Post &amp; reel</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600">
                          Ready to download
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectScreen('photo_offer')}
                      className="border-brand-500 bg-brand-50 text-brand-700 hover:bg-brand-100 w-full rounded-xl border py-2.5 text-xs font-bold transition-colors"
                    >
                      ↺ Try Another Campaign
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Home Indicator Bar */}
              <div className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-zinc-400/50" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
