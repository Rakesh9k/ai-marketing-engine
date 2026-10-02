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
          className={`group flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeScreen === 'photo_offer'
              ? 'border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-500/20'
              : 'border-border-light bg-surface text-text-secondary hover:border-brand-500/50 hover:text-text-primary'
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">01</span>
          <span>📸 Photo & Offer</span>
        </button>

        <button
          onClick={() => handleSelectScreen('business_brain')}
          className={`group flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeScreen === 'business_brain'
              ? 'border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-500/20'
              : 'border-border-light bg-surface text-text-secondary hover:border-brand-500/50 hover:text-text-primary'
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">02</span>
          <span>🧠 Business Brain</span>
        </button>

        <button
          onClick={() => handleSelectScreen('ai_generation')}
          className={`group flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeScreen === 'ai_generation'
              ? 'border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-500/20'
              : 'border-border-light bg-surface text-text-secondary hover:border-brand-500/50 hover:text-text-primary'
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">03</span>
          <span>🎨 AI Generation</span>
        </button>

        <button
          onClick={() => handleSelectScreen('multi_publish')}
          className={`group flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeScreen === 'multi_publish'
              ? 'border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-500/20'
              : 'border-border-light bg-surface text-text-secondary hover:border-brand-500/50 hover:text-text-primary'
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">04</span>
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
          <div className="absolute -inset-4 rounded-[48px] bg-gradient-to-r from-brand-500/30 via-amber-500/20 to-brand-600/30 blur-2xl opacity-70" />

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
            <div className="relative min-h-[560px] overflow-hidden rounded-[36px] bg-bg-primary p-4 sm:min-h-[600px]">
              {/* Device Status Bar */}
              <div className="mb-4 flex items-center justify-between pt-1 text-[11px] font-bold text-text-secondary">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-brand-600">Mitra AI Engine</span>
                  <div className="flex gap-0.5">
                    <div className="h-2.5 w-1 rounded-xs bg-text-primary" />
                    <div className="h-2.5 w-1 rounded-xs bg-text-primary" />
                    <div className="h-2.5 w-1 rounded-xs bg-text-primary" />
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
                        <span className="text-[10px] font-bold tracking-wider text-brand-600 uppercase">Step 01</span>
                        <h4 className="text-sm font-bold text-text-primary">Photo & Offer Upload</h4>
                      </div>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">Quick Start</span>
                    </div>

                    {/* Preview Image Frame */}
                    <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-border-light bg-surface shadow-xs">
                      <img
                        src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80"
                        alt="Hyderabadi Biryani Promo"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-end">
                        <span className="text-[10px] font-bold text-amber-400">SPECIAL OFFER PRESET</span>
                        <span className="text-xs font-bold text-white">Hyderabadi Special Mutton Biryani</span>
                        <span className="text-[11px] font-medium text-zinc-200">Flat 20% OFF • Weekend Family Deal</span>
                      </div>
                    </div>

                    {/* Input Controls */}
                    <div className="space-y-2 rounded-2xl border border-border-light bg-surface p-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary font-medium">Business Category</span>
                        <span className="font-semibold text-brand-600">Restaurant & Catering</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary font-medium">Offer Price</span>
                        <span className="font-semibold text-emerald-600">₹399 (Was ₹499)</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary font-medium">Target Language</span>
                        <span className="font-semibold text-text-primary">Hyderabadi Telugu + English</span>
                      </div>
                    </div>

                    {/* Action button in screen */}
                    <button
                      onClick={() => handleSelectScreen('business_brain')}
                      className="w-full rounded-xl bg-brand-500 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/20 active:scale-95 transition-transform"
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
                        <span className="text-[10px] font-bold tracking-wider text-brand-600 uppercase">Step 02</span>
                        <h4 className="text-sm font-bold text-text-primary">Business Brain AI Analysis</h4>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Context Matched</span>
                    </div>

                    {/* Mascot Thinking state card */}
                    <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-3">
                      <MitraMascot pose="thinking" size={48} className="shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-brand-700">Mitra AI Learning Tone...</span>
                        <p className="text-[11px] text-text-secondary leading-snug">
                          Analyzing local audience preferences, festival timing, and high-converting offer hooks in Hyderabad.
                        </p>
                      </div>
                    </div>

                    {/* Brain Insights List */}
                    <div className="space-y-2">
                      <div className="rounded-xl border border-border-light bg-surface p-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text-primary">🎯 Primary Target</span>
                          <span className="text-[10px] font-semibold text-emerald-600">High Conversion</span>
                        </div>
                        <p className="mt-1 text-[11px] text-text-secondary">Families & tech professionals ordering weekend lunch combos.</p>
                      </div>

                      <div className="rounded-xl border border-border-light bg-surface p-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text-primary">🗣️ Copywriting Angle</span>
                          <span className="text-[10px] font-semibold text-brand-600">Authentic Taste</span>
                        </div>
                        <p className="mt-1 text-[11px] text-text-secondary">"Weekend biryani craving? Authentic Dum Biryani delivered hot!"</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectScreen('ai_generation')}
                      className="w-full rounded-xl bg-brand-500 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/20"
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
                        <span className="text-[10px] font-bold tracking-wider text-brand-600 uppercase">Step 03</span>
                        <h4 className="text-sm font-bold text-text-primary">6+ Ready Campaign Assets</h4>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">100% Generated</span>
                    </div>

                    {/* Grid of Generated Assets */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Asset 1: Poster */}
                      <div className="relative overflow-hidden rounded-xl border border-border-light bg-surface p-2 shadow-2xs">
                        <img
                          src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&auto=format&fit=crop&q=80"
                          alt="Instagram Poster"
                          className="h-20 w-full rounded-lg object-cover"
                        />
                        <span className="mt-1 block text-[10px] font-bold text-text-primary">Instagram Poster</span>
                        <span className="text-[9px] text-emerald-600 font-semibold">Ready to post</span>
                      </div>

                      {/* Asset 2: Reel Script */}
                      <div className="relative overflow-hidden rounded-xl border border-border-light bg-surface p-2 shadow-2xs">
                        <div className="h-20 w-full rounded-lg bg-zinc-900 p-2 text-white flex flex-col justify-between">
                          <span className="text-[9px] font-bold text-amber-400">🎬 REEL SCRIPT</span>
                          <span className="text-[10px] leading-tight line-clamp-2">"Sunday family lunch clear kaavali ante..."</span>
                          <span className="text-[8px] text-zinc-400">Audio: Trending Viral Beat</span>
                        </div>
                        <span className="mt-1 block text-[10px] font-bold text-text-primary">15s Instagram Reel</span>
                        <span className="text-[9px] text-brand-600 font-semibold">With Audio Beat</span>
                      </div>
                    </div>

                    {/* WhatsApp Broadcast Preview */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <span>💬 WhatsApp Broadcast Message</span>
                      </div>
                      <p className="mt-1 text-[10px] text-emerald-900 leading-snug">
                        " Namaste Hyderabad! Craving piping hot Dum Biryani today? Flat 20% OFF for first 50 orders! Tap to order: wa.me/91987..."
                      </p>
                    </div>

                    <button
                      onClick={() => handleSelectScreen('multi_publish')}
                      className="w-full rounded-xl bg-brand-500 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/20"
                    >
                      Publish Multi-Channel →
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
                        <span className="text-[10px] font-bold tracking-wider text-brand-600 uppercase">Step 04</span>
                        <h4 className="text-sm font-bold text-text-primary">Campaign Live & Scaling</h4>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 animate-pulse">LIVE NOW</span>
                    </div>

                    {/* Live Stats Box */}
                    <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-surface to-amber-50 p-3 shadow-xs">
                      <span className="text-[10px] font-bold text-brand-700 uppercase">Real-Time Performance</span>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                        <div className="bg-surface rounded-xl p-2 border border-border-light">
                          <span className="block text-base font-extrabold text-text-primary">1.4K</span>
                          <span className="text-[9px] text-text-secondary">Views</span>
                        </div>
                        <div className="bg-surface rounded-xl p-2 border border-border-light">
                          <span className="block text-base font-extrabold text-text-primary">312</span>
                          <span className="text-[9px] text-text-secondary">Clicks</span>
                        </div>
                        <div className="bg-brand-500 text-white rounded-xl p-2">
                          <span className="block text-base font-extrabold">48</span>
                          <span className="text-[9px] text-white/90 font-medium">Orders</span>
                        </div>
                      </div>
                    </div>

                    {/* Social Channels Active List */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between rounded-xl border border-border-light bg-surface p-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500">💬</span>
                          <span className="font-semibold text-text-primary">WhatsApp Business</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600">Sent to 850 contacts</span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-border-light bg-surface p-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-pink-500">📸</span>
                          <span className="font-semibold text-text-primary">Instagram Post & Reel</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600">Published</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectScreen('photo_offer')}
                      className="w-full rounded-xl border border-brand-500 bg-brand-50 py-2.5 text-xs font-bold text-brand-700 hover:bg-brand-100 transition-colors"
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
