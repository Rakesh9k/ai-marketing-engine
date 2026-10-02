'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { LandingNav } from '@/features/landing/components/LandingNav';
import { LandingFooter } from '@/features/landing/components/LandingFooter';
import { MitraMascot } from '@/components/ui/MitraMascot';

export default function RestaurantSolutionPage() {
  const features = [
    {
      title: 'Biryani & Signature Dish Promos',
      desc: 'Turn dish photos into mouth-watering social posts, weekend festival discounts, and special offers in seconds.',
    },
    {
      title: 'Digital Menu Cards & Offers',
      desc: 'Create beautiful promotional offer cards for combo meals, family feasts, and seasonal specials.',
    },
    {
      title: 'WhatsApp Ordering Messages',
      desc: 'Generate localized WhatsApp promotional messages pre-formatted with price in ₹ and direct ordering links.',
    },
    {
      title: 'Hyderabadi & Regional Tone',
      desc: 'Promote your restaurant in authentic regional styles (Hyderabadi English, Telugu, or Hinglish) that resonate locally.',
    },
  ];

  return (
    <div className="bg-bg-primary min-h-screen">
      <LandingNav />
      <main className="mx-auto max-w-6xl px-4 pt-14 pb-20 sm:px-6 sm:pt-20">
        {/* Hero */}
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="bg-brand-50 text-brand-700 rounded-full px-3.5 py-1.5 text-xs font-semibold">
              Mitra for Restaurants &amp; Food Businesses
            </span>
            <h1 className="text-text-primary mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Turn Food Photos into Full Dining Campaigns
            </h1>
            <p className="text-text-secondary mt-6 text-lg">
              Upload one photo of your Biryani, Thali, or Special Dish → Mitra generates a month of
              social posts, WhatsApp promos, and offer cards.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Free Restaurant Trial
                </Button>
              </Link>
              <Link href="/campaigns/new">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Create Biryani Campaign
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="border-border-light bg-surface relative space-y-4 rounded-3xl border p-8 text-center shadow-xl">
              <MitraMascot pose="creating" size={240} className="mx-auto" />
              <div className="bg-bg-primary border-border-light rounded-2xl border p-4 text-left">
                <p className="text-brand-600 text-xs font-semibold">Generated Campaign Preview</p>
                <p className="text-text-primary mt-1 text-sm font-bold">
                  🔥 Sunday Biryani Special — 20% OFF Combo
                </p>
                <p className="text-text-secondary mt-1 text-xs">
                  &quot;Authentic Hyderabadi Chicken Dum Biryani served with spicy Mirchi Ka Salan
                  &amp; Raita! Order now at ₹299!&quot;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-24">
          <h2 className="text-text-primary text-center text-3xl font-bold">
            Built for Local Dining &amp; Food Brands
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="border-border-light bg-surface rounded-2xl border p-6 shadow-sm"
              >
                <h3 className="text-text-primary text-xl font-semibold">{feat.title}</h3>
                <p className="text-text-secondary mt-2 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-brand-600 mt-24 rounded-3xl p-8 text-center text-white shadow-xl sm:p-12">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to boost restaurant orders?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
            Join hundreds of local food brands using Mitra to market their dishes effortlesly.
          </p>
          <div className="mt-8">
            <Link href="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="text-brand-700 bg-white hover:bg-neutral-100"
              >
                Get Started with Mitra
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
