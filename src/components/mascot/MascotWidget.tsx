'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Mascot } from './Mascot';
import { useMascot } from './MascotProvider';

export function MascotWidget() {
  const { state } = useMascot();
  const [open, setOpen] = useState(false);
  // The attention ping is an invitation, not a permanent fixture: it stops once opened.
  const [seen, setSeen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className="fixed right-6 bottom-6 z-40 flex flex-col items-end">
      {/* Floating Popup Bubble */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            className="mb-3 w-72 rounded-2xl border border-neutral-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-neutral-800/90 dark:bg-neutral-900/95"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5 dark:border-neutral-800">
              <span className="text-xs font-bold text-[#E84D1A]">Mitra AI Partner</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close Mitra panel"
                className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs leading-snug font-medium text-neutral-700 dark:text-neutral-300">
              &quot;Ready to craft this week&apos;s campaigns or review performance insights?&quot;
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                href="/campaigns/new"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl bg-[#E84D1A] py-1.5 text-center text-xs font-bold text-white shadow-sm transition hover:bg-[#d44315]"
              >
                Create Campaign
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Mascot Trigger Badge */}
      <button
        onClick={() => {
          setOpen((prev) => !prev);
          setSeen(true);
        }}
        aria-label="Mitra AI Partner"
        aria-expanded={open}
        className="group relative flex items-center justify-center rounded-full bg-white p-2.5 shadow-2xl ring-2 ring-[#E84D1A]/30 transition hover:ring-[#E84D1A] dark:bg-neutral-900 dark:ring-[#E84D1A]/40"
      >
        <Mascot state={state} size={52} animated shadow={false} glow={false} />
        <span className="absolute -top-1 -right-1 flex h-3 w-3" aria-hidden="true">
          {!seen && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E84D1A] opacity-75" />
          )}
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[#E84D1A]" />
        </span>
      </button>
    </div>
  );
}
