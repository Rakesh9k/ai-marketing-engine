'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { MitraMascot } from '@/components/ui/MitraMascot';

export function FinalCTASection({ onGetStarted }: { onGetStarted: () => void }) {
  const reduceMotion = useReducedMotion();

  const handleScrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="bg-bg-primary relative overflow-hidden py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="from-brand-600 via-brand-600 to-brand-700 relative rounded-3xl bg-gradient-to-br px-6 py-16 text-center text-white shadow-2xl sm:px-12 sm:py-20"
        >
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-black/10 blur-3xl" />

          {/* Cheer Mascot Accent */}
          <div className="relative z-10 mx-auto max-w-md">
            <MitraMascot
              pose="rocket"
              size="lg"
              glow
              shadow
              animated
              alt="Mitra Rocket Growth Launch Mascot"
            />
          </div>

          <h2 className="relative z-10 mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Your next campaign starts with one idea.
          </h2>

          <p className="relative z-10 mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/90 sm:text-xl">
            Give Mitra your photo, offer, or idea. We&rsquo;ll help turn it into complete,
            ready-to-publish marketing content.
          </p>

          <div className="relative z-10 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="xl"
              variant="secondary"
              onClick={onGetStarted}
              className="text-brand-700 w-full border-none bg-white font-bold shadow-xl hover:bg-neutral-100 sm:w-auto"
            >
              Start for Free →
            </Button>

            <Button
              size="xl"
              variant="outline"
              onClick={handleScrollToHowItWorks}
              className="w-full border-white/40 text-white hover:bg-white/10 sm:w-auto"
            >
              Explore how Mitra works
            </Button>
          </div>

          <p className="relative z-10 mt-4 text-xs text-white/80">
            Instant setup • No credit card required
          </p>
        </motion.div>
      </div>
    </section>
  );
}
