'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { LandingNav } from '@/features/landing/components/LandingNav';
import { LandingFooter } from '@/features/landing/components/LandingFooter';
import { Reveal } from '@/components/motion/Reveal';
import { MitraMascot } from '@/components/ui/MitraMascot';

export default function SolutionsOverviewPage() {
  const industries = [
    {
      title: 'Restaurants & Food',
      desc: 'Biryani promos, menu cards, weekend combo discounts, and localized WhatsApp food orders.',
      href: '/solutions/restaurants',
      pose: 'creating' as const,
      badge: 'Popular',
    },
    {
      title: 'Salons & Beauty',
      desc: 'Bridal glow packages, service combo pricing, festive offers, and appointment booking CTAs.',
      href: '/solutions/salons',
      pose: 'designer' as const,
      badge: 'High Conversion',
    },
    {
      title: 'Real Estate & Property',
      desc: 'Property showcases, 2BHK/3BHK site visit invitations, floor plan features, and agent branding.',
      href: '/solutions/real-estate',
      pose: 'analyst' as const,
      badge: 'Lead Gen',
    },
  ];

  return (
    <div className="bg-bg-primary min-h-screen">
      <LandingNav />
      <main className="mx-auto max-w-6xl px-4 pt-14 pb-20 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="bg-brand-50 text-brand-700 rounded-full px-3.5 py-1.5 text-xs font-semibold">
            Tailored AI Marketing Solutions
          </span>
          <h1 className="text-text-primary mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Built Specifically for Local Indian Businesses
          </h1>
          <p className="text-text-secondary mt-6 text-lg">
            Mitra understands the unique marketing dynamics, customer expectations, and regional
            nuances of your specific industry.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {industries.map((ind, idx) => (
            <Reveal key={ind.title} index={idx} className="flex">
              <div className="card-interactive border-border-light bg-surface hover:border-brand-500/50 flex w-full flex-col justify-between rounded-3xl border p-8 shadow-sm">
                <div>
                  <span className="bg-brand-50 text-brand-700 rounded-full px-3 py-1 text-xs font-semibold">
                    {ind.badge}
                  </span>
                  <div className="my-6 flex justify-center">
                    <MitraMascot pose={ind.pose} size={160} />
                  </div>
                  <h2 className="text-text-primary text-2xl font-semibold">{ind.title}</h2>
                  <p className="text-text-secondary mt-3 text-sm leading-relaxed">{ind.desc}</p>
                </div>

                <div className="border-border-light mt-8 border-t pt-4">
                  <Link href={ind.href}>
                    <Button className="w-full">Explore {ind.title} Solutions</Button>
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
