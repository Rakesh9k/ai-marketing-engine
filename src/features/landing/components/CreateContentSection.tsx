'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

export function CreateContentSection() {
  const reduceMotion = useReducedMotion();
  const [selectedOutput, setSelectedOutput] = useState<number>(0);

  const outputs = [
    {
      id: 0,
      type: '📸 Instagram Post',
      title: 'Feed Poster',
      preview: 'Special Biryani Combo @ ₹299',
      desc: '✨ Savor the authentic spices of Hyderabadi Dum Biryani! Special weekend combo package available for dine-in & delivery.',
      tag: 'Square 1:1',
      bg: 'from-orange-500/10 to-amber-500/10',
    },
    {
      id: 1,
      type: '🎥 Instagram Reel',
      title: '15s Video Concept',
      preview: 'Hook: "Weekend craving solved in 5 seconds!"',
      desc: 'Scene 1: Sizzling biryani handi open -> Scene 2: Slow-mo steam rise -> Scene 3: Order CTA button overlay.',
      tag: 'Vertical 9:16',
      bg: 'from-rose-500/10 to-purple-500/10',
    },
    {
      id: 2,
      type: '💬 WhatsApp Campaign',
      title: 'Broadcast Promo',
      preview: 'Sent to 1,248 VIP customers',
      desc: '👋 Hi [Name]! Planning family lunch? Enjoy 20% OFF our Sunday Biryani Special. Tap to view menu & order wa.me/919876543210',
      tag: 'Direct Chat',
      bg: 'from-emerald-500/10 to-teal-500/10',
    },
    {
      id: 3,
      type: '📱 Story Layout',
      title: 'Daily Story',
      preview: 'Limited Time Deal • Tap Link',
      desc: '🔥 Flat 20% OFF Biryani Combos today! Tap link below to order before slots fill up.',
      tag: 'Story 9:16',
      bg: 'from-pink-500/10 to-orange-500/10',
    },
    {
      id: 4,
      type: '✍️ Localized Copy',
      title: 'Telugu + English Copy',
      preview: 'ఈ వీకెండ్ బిర్యానీ స్పెషల్!',
      desc: 'మంచి బిర్యానీ అంటే మన హైదరాబాద్ దావత్! Order now and get instant 20% cashback on all orders.',
      tag: 'Bilingual',
      bg: 'from-blue-500/10 to-indigo-500/10',
    },
    {
      id: 5,
      type: '🏷️ Offer Coupon',
      title: 'Promo Banner',
      preview: 'CODE: BIRYANI20',
      desc: 'Present this digital voucher at checkout for flat ₹100 discount on family biryani meals.',
      tag: 'Discount Voucher',
      bg: 'from-amber-500/10 to-yellow-500/10',
    },
  ];

  return (
    <section className="bg-bg-primary py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="bg-brand-50 text-brand-700 border-brand-100 rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase">
            One Input → Infinite Outputs
          </span>
          <h2 className="text-text-primary mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            Give Mitra one photo. Get a full campaign.
          </h2>
          <p className="text-text-secondary mx-auto mt-4 max-w-2xl text-base sm:text-lg">
            From a single food or product photo, Mitra automatically generates social posts, reels,
            WhatsApp messages, and offer banners.
          </p>
        </div>

        {/* Input -> Core -> Output Transformation Layout */}
        <div className="mt-16 grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* LEFT: INPUT CARD */}
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="border-border-light bg-surface rounded-3xl border p-6 shadow-lg lg:col-span-4"
          >
            <div className="flex items-center justify-between">
              <span className="bg-brand-50 text-brand-700 rounded-full px-3 py-1 text-xs font-bold">
                1. Your Input
              </span>
              <span className="text-text-tertiary text-xs">Just 30 Seconds</span>
            </div>

            <div className="border-border-light mt-4 overflow-hidden rounded-2xl border bg-neutral-900">
              <img
                src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80"
                alt="Product Photo Input"
                className="h-48 w-full object-cover"
              />
            </div>

            <div className="mt-4 space-y-2">
              <div className="bg-bg-secondary rounded-xl p-3 text-xs">
                <span className="text-text-primary font-bold">Business:</span> Bawarchi Biryani
                House
              </div>
              <div className="bg-bg-secondary rounded-xl p-3 text-xs">
                <span className="text-text-primary font-bold">Offer:</span> Flat 20% off weekend
                orders
              </div>
            </div>

            <div className="bg-brand-500 mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-md">
              <span>🚀 Generating Campaign Assets</span>
            </div>
          </motion.div>

          {/* CENTER: PROCESSING CORE INDICATOR */}
          <div className="flex justify-center py-4 lg:col-span-1 lg:py-0">
            <motion.div
              animate={reduceMotion ? {} : { scale: [1, 1.15, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="bg-brand-500 shadow-brand-500/30 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </motion.div>
          </div>

          {/* RIGHT: OUTPUT CARDS GRID */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {outputs.map((out) => (
              <motion.div
                key={out.id}
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: out.id * 0.08 }}
                onClick={() => setSelectedOutput(out.id)}
                className={`cursor-pointer rounded-2xl border p-5 transition-all duration-300 ${
                  selectedOutput === out.id
                    ? 'border-brand-500 bg-surface ring-brand-500/20 -translate-y-1 shadow-xl ring-2'
                    : 'border-border-light bg-surface hover:border-border-medium hover:-translate-y-0.5 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-text-primary text-xs font-bold">{out.type}</span>
                  <span className="bg-bg-secondary text-text-secondary rounded-md px-2 py-0.5 text-[10px] font-semibold">
                    {out.tag}
                  </span>
                </div>

                <h4 className="text-text-primary mt-2 text-sm font-bold">{out.title}</h4>
                <p className="text-brand-600 mt-1 truncate text-xs font-semibold">{out.preview}</p>
                <p className="text-text-secondary mt-2 line-clamp-2 text-xs leading-relaxed">
                  {out.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
