'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { MitraMascot } from '@/components/ui/MitraMascot';

const SAMPLE_PROMPTS = [
  {
    label: 'Biryani Special Offer',
    prompt: 'Weekend 15% discount for family biryani orders',
    output: {
      igCaption:
        '✨ Weekend Feast Alert! 🍛 Authentic Hyderabadi Biryani with 15% OFF for families. Order online or visit Jubilee Hills today! #BiryaniLovers #HyderabadFoodies',
      whatsapp:
        'Hi {Name}! 👋 Enjoy 15% OFF family biryani packs this weekend at {Business Name}. Reply YES to reserve your table!',
      reelScript:
        '🎬 Hook: "Craving authentic biryani this weekend?" -> Show sizzling biryani pot -> Overlay 15% OFF offer tag -> Call to action.',
    },
  },
  {
    label: 'Festive Skincare Package',
    prompt: 'Diwali festive skin glow package offer',
    output: {
      igCaption:
        '✨ Get your festive glow ready! Book our Exclusive Dussehra & Diwali Beauty Combo for ₹1,499 only. Limited appointments left!',
      whatsapp:
        'Namaste {Name}! 🎁 Festive skincare slots filling fast. Book your appointment now & get a complimentary facial mask!',
      reelScript:
        '🎬 Hook: "Get Diwali-ready skin in 45 mins!" -> Show salon ambient setting -> Highlight combo price -> Tap link in bio.',
    },
  },
  {
    label: 'Real Estate Site Visit',
    prompt: 'Weekend site visit invitation for luxury 3BHK',
    output: {
      igCaption:
        '🏡 Luxury 3BHK Gated Apartments in Kondapur. Zero booking fee this weekend only! Schedule your private site visit today.',
      whatsapp:
        'Hi {Name}, explore 3BHK homes in Kondapur with panoramic views. Visit us this Saturday for exclusive booking discounts!',
      reelScript:
        '🎬 Hook: "Looking for your dream home in Kondapur?" -> Walkthrough preview -> Show clubhouse amenities -> CTA button.',
    },
  },
];

export function AboutInteractiveDemo() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const current = SAMPLE_PROMPTS[selectedIndex]!;

  return (
    <section className="bg-surface border-border-light relative overflow-hidden border-t py-20">
      <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <div className="border-brand-200 bg-brand-50 text-brand-700 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold">
            <span>✨</span>
            <span>Interactive Experience</span>
          </div>

          <h2 className="text-text-primary text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Tell Mitra what you want to <span className="text-brand-600">promote.</span>
          </h2>

          <p className="text-text-secondary text-base leading-relaxed">
            See how Mitra turns a single business intent into multi-channel marketing campaigns.
          </p>
        </div>

        {/* Prompt Selector Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {SAMPLE_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                selectedIndex === idx
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-bg-secondary text-text-secondary border-border-light hover:bg-surface border'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Interactive Storyteller Box */}
        <div className="border-border-medium bg-bg-secondary mx-auto max-w-4xl space-y-6 rounded-3xl border p-6 shadow-xl sm:p-10">
          {/* Input Box Visual */}
          <div className="border-border-light bg-surface flex items-center gap-3 rounded-2xl border p-4 shadow-2xs">
            <MitraMascot pose="curious" size={40} />
            <div className="flex-1">
              <span className="text-text-tertiary text-[10px] font-bold uppercase">
                Business Intent:
              </span>
              <p className="text-text-primary text-xs font-bold sm:text-sm">{current.prompt}</p>
            </div>
            <span className="bg-brand-100 text-brand-800 shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold">
              Mitra Understands ✓
            </span>
          </div>

          {/* Generated Outputs Preview Grid */}
          <motion.div
            key={selectedIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            {/* Instagram Card */}
            <div className="border-border-light bg-surface space-y-2 rounded-2xl border p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-600">📸 Instagram Caption</span>
                <span className="text-text-tertiary text-[10px]">Feed Post</span>
              </div>
              <p className="text-text-secondary bg-bg-secondary border-border-light rounded-xl border p-3 text-xs leading-relaxed">
                {current.output.igCaption}
              </p>
            </div>

            {/* WhatsApp Card */}
            <div className="border-border-light bg-surface space-y-2 rounded-2xl border p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600">💬 WhatsApp Broadcast</span>
                <span className="text-text-tertiary text-[10px]">Direct Reach</span>
              </div>
              <p className="text-text-secondary bg-bg-secondary border-border-light rounded-xl border p-3 text-xs leading-relaxed">
                {current.output.whatsapp}
              </p>
            </div>

            {/* Reel Script Card */}
            <div className="border-border-light bg-surface space-y-2 rounded-2xl border p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-600">🎬 Reel Video Script</span>
                <span className="text-text-tertiary text-[10px]">30s Video</span>
              </div>
              <p className="text-text-secondary bg-bg-secondary border-border-light rounded-xl border p-3 text-xs leading-relaxed">
                {current.output.reelScript}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
