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
    <section className="bg-bg-secondary border-border-light relative overflow-hidden border-t py-20">
      <div className="mx-auto max-w-7xl space-y-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-1 text-xs font-bold text-orange-800">
            <span>🏛️</span>
            <span>Built for Real Indian Businesses</span>
          </div>

          <h2 className="text-text-primary text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Rooted in <span className="text-brand-600">Local Context</span> &amp; Culture
          </h2>

          <p className="text-text-secondary text-base leading-relaxed sm:text-lg">
            Language matters. Festivals matter. Neighborhoods matter. Mitra understands English,
            Telugu, Hindi, Hinglish, and Telglish to speak directly to your local market.
          </p>
        </div>

        {/* Sector Tabs */}
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-2">
          {SECTORS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSector(s.id)}
              className={`flex cursor-pointer items-center gap-2 rounded-2xl px-5 py-3 text-xs font-extrabold transition-all ${
                activeSector === s.id
                  ? 'bg-brand-500 shadow-brand-500/20 text-white shadow-md'
                  : 'bg-surface text-text-secondary border-border-light hover:bg-bg-secondary hover:text-text-primary border'
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
          className="border-border-light bg-surface mx-auto max-w-4xl rounded-3xl border p-8 shadow-xl sm:p-12"
        >
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <span className="text-4xl">{current.icon}</span>
              <h3 className="text-text-primary text-2xl font-bold">{current.name}</h3>
              <p className="text-brand-600 text-sm font-extrabold sm:text-base">
                “{current.tagline}”
              </p>
              <p className="text-text-secondary text-xs leading-relaxed sm:text-sm">
                {current.desc}
              </p>

              <div className="space-y-2 pt-2">
                {current.bulletPoints.map((bp, idx) => (
                  <div
                    key={idx}
                    className="text-text-primary flex items-center gap-2 text-xs font-semibold"
                  >
                    <span className="font-bold text-emerald-600">✓</span>
                    <span>{bp}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-border-light flex flex-col items-center justify-center space-y-4 border-t pt-6 lg:col-span-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <div className="bg-brand-50 border-brand-200 w-full rounded-2xl border p-4 text-center">
                <span className="text-brand-800 text-[11px] font-bold tracking-wide uppercase">
                  Tailored Templates
                </span>
                <p className="text-brand-900 mt-1 text-xs font-semibold">
                  Ready-to-publish campaigns for {current.name}
                </p>
              </div>

              <a href={current.ctaUrl} className="w-full">
                <Button className="w-full rounded-xl py-3 text-xs font-bold">
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
