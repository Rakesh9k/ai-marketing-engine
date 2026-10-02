'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/mascot/Mascot';

export function Step8Completion() {
  const reduceMotion = useReducedMotion();

  const capabilities = [
    { title: 'Campaigns Ready', icon: '🛡️', desc: 'Pre-built templates generated' },
    { title: 'AI Powered', icon: '⚡', desc: 'Localized prompt brain active' },
    { title: 'Local Growth', icon: '🚀', desc: 'Targeted neighborhood reach' },
  ];

  return (
    <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-6 min-h-[70vh]">
      {/* Celebratory Mascot Render with Chair */}
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative my-2 drop-shadow-2xl flex justify-center"
      >
        {/* Soft Background Sunburst Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-orange-200/60 via-amber-200/40 to-transparent rounded-full blur-3xl -z-10 scale-125" />

        <Mascot state="success" size="hero" glow shadow animated priority />
      </motion.div>

      {/* Handwritten Style Annotation Tag */}
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-100/80 border border-amber-300 text-amber-950 text-xs font-bold shadow-2xs mb-3"
      >
        <span>✨</span>
        <span>You&apos;re all set!</span>
      </motion.div>

      {/* Main Headline & Supporting Text */}
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1A1A1E] tracking-tight">
          Welcome to Mitra!
        </h1>
        <p className="text-base sm:text-lg text-neutral-600 max-w-md mx-auto leading-relaxed">
          Your business is set up. Get ready for amazing campaigns, more customers and real growth.
        </p>
      </motion.div>

      {/* Capability Badges Grid */}
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-8 w-full"
      >
        {capabilities.map((cap) => (
          <div
            key={cap.title}
            className="p-4 rounded-2xl bg-white/90 border border-neutral-200/90 shadow-sm flex flex-col items-center text-center"
          >
            <span className="text-2xl mb-1">{cap.icon}</span>
            <span className="text-xs font-extrabold text-[#1A1A1E]">{cap.title}</span>
            <span className="text-[11px] text-neutral-500 mt-0.5">{cap.desc}</span>
          </div>
        ))}
      </motion.div>

      {/* First Campaign Launch CTA */}
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="w-full sm:w-auto flex flex-col sm:flex-row items-center justify-center gap-3"
      >
        <Link href="/campaigns/new" className="w-full sm:w-auto inline-block">
          <Button
            size="lg"
            className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-[#E84D1A] hover:bg-[#d03f10] text-white text-base font-extrabold shadow-xl shadow-orange-600/25 transition-all hover:scale-105 cursor-pointer"
          >
            Create My First Campaign →
          </Button>
        </Link>
        <Link href="/dashboard" className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 underline">
          Go to Dashboard
        </Link>
      </motion.div>
    </div>
  );
}
