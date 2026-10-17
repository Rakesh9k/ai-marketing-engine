'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { LandingNav } from '@/features/landing/components/LandingNav';
import { LandingFooter } from '@/features/landing/components/LandingFooter';
import { MitraMascot } from '@/components/ui/MitraMascot';

export default function SalonSolutionPage() {
  const features = [
    {
      title: 'Festive & Bridal Glow Promos',
      desc: 'Create captivating promotions for wedding makeovers, festive glow packages, and seasonal skincare deals.',
    },
    {
      title: 'Service Menu Packages & Combos',
      desc: 'Highlight hair spa, facial, pedicure, and styling packages with clear pricing in ₹ and instant booking CTAs.',
    },
    {
      title: 'WhatsApp Booking Invites',
      desc: 'Send pre-written appointment booking messages and exclusive VIP discounts straight to your clients on WhatsApp.',
    },
    {
      title: 'Elegant & Aesthetic Visuals',
      desc: 'Mitra automatically formats post templates to reflect modern, clean, premium beauty studio branding.',
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
              Mitra for Salons &amp; Beauty Studios
            </span>
            <h1 className="text-text-primary mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Fill Your Salon Chair Every Day of the Month
            </h1>
            <p className="text-text-secondary mt-6 text-lg">
              Upload service photos or salon interiors → Mitra generates beauty offer posters,
              appointment reminders, and festive campaigns.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Free
                </Button>
              </Link>
              <Link href="/campaigns/new">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Create Glow Campaign
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="border-border-light bg-surface relative space-y-4 rounded-3xl border p-8 text-center shadow-xl">
              <MitraMascot pose="designer" size={240} className="mx-auto" />
              <div className="bg-bg-primary border-border-light rounded-2xl border p-4 text-left">
                <p className="text-brand-600 text-xs font-semibold">Generated Beauty Campaign</p>
                <p className="text-text-primary mt-1 text-sm font-bold">
                  ✨ Festive Glow Package — Hair &amp; Skin Care @ ₹999
                </p>
                <p className="text-text-secondary mt-1 text-xs">
                  &quot;Get wedding-ready with our Premium HydraFacial + Hair Spa combo. Book your
                  slot today!&quot;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-24">
          <h2 className="text-text-primary text-center text-3xl font-bold">
            Designed for Salons, Spas &amp; Makeup Artists
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
          <h2 className="text-3xl font-bold sm:text-4xl">Transform your salon marketing today</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
            Get consistent appointments without spending hours on social media.
          </p>
          <div className="mt-8">
            <Link href="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="text-brand-700 bg-white hover:bg-neutral-100"
              >
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
