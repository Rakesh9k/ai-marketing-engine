'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/Button';

const SECTORS = [
  {
    id: 'restaurants',
    icon: '🍽️',
    name: 'Restaurants & Cloud Kitchens',
    tagline: 'Turn today’s menu into tomorrow’s viral campaign.',
    desc: 'From Hyderabadi Biryani weekend flash sales to new dish announcements. Mitra understands food visuals, pricing combos, and WhatsApp delivery scripts.',
    bulletPoints: ['Weekend Feast Deals', 'WhatsApp Menu Broadcasts', 'Festival Special Discounts'],
    ctaUrl: '/solutions/restaurants',
  },
  {
    id: 'salons',
    icon: '💇‍♀️',
    name: 'Salons & Beauty Studios',
    tagline: 'Turn services and transformations into content customers notice.',
    desc: 'Showcase bridal packages, festive glow combos, and hair treatments with polished Instagram carousels and local customer booking links.',
    bulletPoints: ['Bridal Package Promos', 'Before & After Reels', 'Appointment Reminders'],
    ctaUrl: '/solutions/salons',
  },
  {
    id: 'realestate',
    icon: '🏠',
    name: 'Real Estate & Realtors',
    tagline: 'Turn properties and site visits into high-converting campaigns.',
    desc: 'Promote luxury apartments in Gachibowli or Kondapur with high-trust headlines, site visit invitations, and multi-channel ad copy.',
    bulletPoints: ['Weekend Site Visit Ads', 'Gated Community Features', 'Zero Booking Fee Promos'],
    ctaUrl: '/solutions/real-estate',
  },
];

export function AboutLocalRoots() {
  const [activeSector, setActiveSector] = useState(SECTORS[0]!.id);
  const current = SECTORS.find((s) => s.id === activeSector) || SECTORS[0]!;

  return (
    <section className="bg-bg-secondary py-20 relative overflow-hidden border-t border-border-light">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-1 text-xs font-bold text-orange-800">
            <span>🏛️</span>
            <span>Built for Real Indian Businesses</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-text-primary tracking-tight">
            Rooted in <span className="text-brand-600">Local Context</span> &amp; Culture
          </h2>

          <p className="text-text-secondary text-base sm:text-lg leading-relaxed">
            Language matters. Festivals matter. Neighborhoods matter. Mitra understands English, Telugu, Hindi, Hinglish, and Telglish to speak directly to your local market.
          </p>
        </div>

        {/* Sector Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
          {SECTORS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSector(s.id)}
              className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-extrabold transition-all cursor-pointer ${
                activeSector === s.id
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'bg-surface text-text-secondary border border-border-light hover:bg-bg-secondary hover:text-text-primary'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.name}</span>
            </button>
          ))}
        </div>

        {/* Selected Sector Card Breakdown */}
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl border border-border-light bg-surface p-8 sm:p-12 shadow-xl max-w-4xl mx-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="space-y-4 lg:col-span-8">
              <span className="text-4xl">{current.icon}</span>
              <h3 className="text-2xl font-bold text-text-primary">{current.name}</h3>
              <p className="text-brand-600 font-extrabold text-sm sm:text-base">
                “{current.tagline}”
              </p>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                {current.desc}
              </p>

              <div className="space-y-2 pt-2">
                {current.bulletPoints.map((bp, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{bp}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center lg:col-span-4 border-t lg:border-t-0 lg:border-l border-border-light pt-6 lg:pt-0 lg:pl-8 space-y-4">
              <div className="rounded-2xl bg-brand-50 p-4 border border-brand-200 text-center w-full">
                <span className="text-[11px] font-bold text-brand-800 uppercase tracking-wide">
                  Tailored Templates
                </span>
                <p className="text-xs text-brand-900 font-semibold mt-1">
                  Ready-to-publish campaigns for {current.name}
                </p>
              </div>

              <a href={current.ctaUrl} className="w-full">
                <Button className="w-full font-bold text-xs rounded-xl py-3">
                  Explore Solutions →
                </Button>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
