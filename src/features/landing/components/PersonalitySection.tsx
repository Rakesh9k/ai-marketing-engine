'use client';

import { motion, useReducedMotion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

export function PersonalitySection() {
  const reduceMotion = useReducedMotion();

  const thoughtBubbles = [
    { text: '💡 Need a weekend offer?', pos: 'top-2 left-4 sm:-left-8' },
    { text: '🎉 Try a festive campaign!', pos: 'top-16 right-4 sm:-right-8' },
    { text: '🗣️ Want this in Telugu?', pos: 'bottom-20 left-2 sm:-left-12' },
    { text: '🎬 Let’s make a Reel!', pos: 'bottom-8 right-2 sm:-right-10' },
  ];

  return (
    <section className="bg-bg-secondary overflow-hidden py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="bg-brand-50 text-brand-700 border-brand-100 rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase">
            Intelligent Marketing Partner
          </span>
          <h2 className="text-text-primary mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            Your business has the idea. <br className="hidden sm:block" />
            Mitra turns it into action.
          </h2>
          <p className="text-text-secondary mx-auto mt-4 max-w-2xl text-base sm:text-lg">
            Mitra sits beside you like an experienced marketing colleague, proactively suggesting
            campaign ideas tailored to your local market.
          </p>
        </div>

        {/* Central Mascot with Floating Thought Bubbles Stage */}
        <div className="relative mx-auto mt-16 flex min-h-[380px] max-w-2xl items-center justify-center">
          {/* Soft warm glow behind mascot */}
          <div className="bg-brand-500/15 absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />

          {/* Central Mascot */}
          <motion.div
            animate={reduceMotion ? {} : { y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-20"
          >
            <MitraMascot
              pose="curious"
              size="2xl"
              glow
              shadow
              animated
              alt="Mitra AI Idea Mascot"
            />
          </motion.div>

          {/* Floating Thought Bubbles */}
          {thoughtBubbles.map((bubble, idx) => (
            <motion.div
              key={bubble.text}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              animate={reduceMotion ? {} : { y: [0, idx % 2 === 0 ? -5 : 5, 0] }}
              transition={{
                y: { duration: 4 + idx, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 0.5, delay: idx * 0.15 },
              }}
              className={`absolute z-30 ${bubble.pos} border-border-light bg-surface rounded-2xl border px-4 py-2.5 shadow-lg backdrop-blur-xs transition-transform hover:scale-105`}
            >
              <span className="text-text-primary text-xs font-bold">{bubble.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
