'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { LandingNav } from '@/features/landing/components/LandingNav';
import { LandingFooter } from '@/features/landing/components/LandingFooter';
import { MitraMascot } from '@/components/ui/MitraMascot';

export default function RealEstateSolutionPage() {
  const features = [
    {
      title: 'Property Listings & Site Visit Invites',
      desc: 'Create high-converting property showcase posts for 2BHK/3BHK apartments, villas, and open plots.',
    },
    {
      title: 'Agent Personal Branding',
      desc: 'Build trust with clean, professional real estate advisor branding for your listings.',
    },
    {
      title: 'WhatsApp Property Brochures',
      desc: 'Generate site visit invitations, location highlights, and price breakdowns ready to share with prospective buyers on WhatsApp.',
    },
    {
      title: 'Localized Area Highlights',
      desc: 'Promote properties emphasizing local connectivity, metro access, schools, and investment returns.',
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
              Mitra for Real Estate Agents &amp; Developers
            </span>
            <h1 className="text-text-primary mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Turn Property Photos into Qualified Site Visits
            </h1>
            <p className="text-text-secondary mt-6 text-lg">
              Upload property photos or floor plans → Mitra generates property showcase cards,
              WhatsApp visit invites, and social campaigns.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Free Real Estate Trial
                </Button>
              </Link>
              <Link href="/campaigns/new">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Create Property Campaign
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="border-border-light bg-surface relative space-y-4 rounded-3xl border p-8 text-center shadow-xl">
              <MitraMascot pose="analyst" size={240} className="mx-auto" />
              <div className="bg-bg-primary border-border-light rounded-2xl border p-4 text-left">
                <p className="text-brand-600 text-xs font-semibold">Generated Property Showcase</p>
                <p className="text-text-primary mt-1 text-sm font-bold">
                  🏢 Luxury 3BHK Gated Community @ Gachibowli
                </p>
                <p className="text-text-secondary mt-1 text-xs">
                  &quot;1800 sq.ft | Clubhouse | Swimming Pool | 5 mins from IT Hub. Book a free
                  site visit this weekend!&quot;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-24">
          <h2 className="text-text-primary text-center text-3xl font-bold">
            Engineered for Realtors &amp; Property Consultants
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
          <h2 className="text-3xl font-bold sm:text-4xl">Drive more site visits every weekend</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
            Let Mitra handle property marketing while you close deals with buyers.
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
