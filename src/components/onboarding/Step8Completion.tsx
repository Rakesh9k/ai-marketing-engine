'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/mascot/Mascot';

export function Step8Completion() {
  const reduceMotion = useReducedMotion();

  const capabilities = [
    { title: 'Business Brain Saved', icon: '🧠', desc: 'Your details are stored securely' },
    { title: 'Ready to Create', icon: '⚡', desc: 'Copy, image and reel from one offer' },
    { title: 'Made for Local', icon: '🚀', desc: 'Written for your area and language' },
  ];

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center py-6 text-center">
      {/* Celebratory Mascot Render with Chair */}
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative my-2 flex justify-center drop-shadow-2xl"
      >
        {/* Soft Background Sunburst Glow */}
        <div className="absolute inset-0 -z-10 scale-125 rounded-full bg-gradient-to-t from-orange-200/60 via-amber-200/40 to-transparent blur-3xl" />

        <Mascot state="success" size="hero" glow shadow animated priority />
      </motion.div>

      {/* Handwritten Style Annotation Tag */}
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/80 px-4 py-1.5 text-xs font-bold text-amber-950 shadow-2xs"
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
        <h1 className="text-3xl font-black tracking-tight text-[#1A1A1E] sm:text-4xl lg:text-5xl">
          Welcome to Mitra!
        </h1>
        <p className="mx-auto max-w-md text-base leading-relaxed text-neutral-600 sm:text-lg">
          Your business is set up. Get ready for amazing campaigns, more customers and real growth.
        </p>
      </motion.div>

      {/* Capability Badges Grid */}
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="my-8 grid w-full grid-cols-1 gap-3.5 sm:grid-cols-3"
      >
        {capabilities.map((cap) => (
          <div
            key={cap.title}
            className="flex flex-col items-center rounded-2xl border border-neutral-200/90 bg-white/90 p-4 text-center shadow-sm"
          >
            <span className="mb-1 text-2xl">{cap.icon}</span>
            <span className="text-xs font-extrabold text-[#1A1A1E]">{cap.title}</span>
            <span className="mt-0.5 text-[11px] text-neutral-500">{cap.desc}</span>
          </div>
        ))}
      </motion.div>

      {/* First Campaign Launch CTA */}
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
      >
        <Link href="/campaigns/new" className="inline-block w-full sm:w-auto">
          <Button
            size="lg"
            className="w-full cursor-pointer rounded-2xl bg-[#E84D1A] px-10 py-4 text-base font-extrabold text-white shadow-xl shadow-orange-600/25 transition-all hover:scale-105 hover:bg-[#d03f10] sm:w-auto"
          >
            Create My First Campaign →
          </Button>
        </Link>
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-neutral-500 underline hover:text-neutral-800"
        >
          Go to Dashboard
        </Link>
      </motion.div>
    </div>
  );
}
