import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { LandingNav } from '@/features/landing/components/LandingNav';
import { LandingFooter } from '@/features/landing/components/LandingFooter';
import { AboutHero } from '@/features/about/components/AboutHero';
import { AboutProblem } from '@/features/about/components/AboutProblem';
import { AboutInsight } from '@/features/about/components/AboutInsight';
import { AboutOrigin } from '@/features/about/components/AboutOrigin';
import { AboutJourney } from '@/features/about/components/AboutJourney';
import { AboutPhilosophy } from '@/features/about/components/AboutPhilosophy';
import { AboutWhyMitra } from '@/features/about/components/AboutWhyMitra';
import { AboutLocalRoots } from '@/features/about/components/AboutLocalRoots';
import { AboutFuture } from '@/features/about/components/AboutFuture';
import { AboutCTA } from '@/features/about/components/AboutCTA';

export const metadata: Metadata = pageMetadata({
  title: 'About Us — Mitra by Brainwise',
  description:
    'The story, philosophy and purpose behind Mitra: the AI marketing partner built specifically for local businesses, restaurants, salons, realtors, and entrepreneurs in India.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <div
      id="top"
      className="bg-bg-primary text-text-primary selection:bg-brand-500 min-h-screen selection:text-white"
    >
      {/* Top Floating Navigation Header */}
      <LandingNav />

      {/* Main Story Flow */}
      <main>
        {/* 1. Hero Section */}
        <AboutHero />

        {/* 2. The Problem */}
        <AboutProblem />

        {/* 3. The Insight & Business Brain Flow */}
        <AboutInsight />

        {/* 4. Origin Story: Enso to Mitra */}
        <AboutOrigin />

        {/* 5. Timeline Journey */}
        <AboutJourney />

        {/* 6. Product Philosophy & Values */}
        <AboutPhilosophy />

        {/* 7. Why "Mitra" */}
        <AboutWhyMitra />

        {/* 8. Local Business Roots & Sectors */}
        <AboutLocalRoots />

        {/* 10. Future Vision & Roadmap */}
        <AboutFuture />

        {/* 11. Final Call to Action */}
        <AboutCTA />
      </main>

      {/* Global Marketing Footer */}
      <LandingFooter />
    </div>
  );
}
