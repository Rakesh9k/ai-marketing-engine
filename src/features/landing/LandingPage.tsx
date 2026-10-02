'use client';

import { useRouter } from 'next/navigation';
import { LandingNav } from './components/LandingNav';
import { HeroSection } from './components/HeroSection';
import { LiveImpactSection } from './components/LiveImpactSection';
import { LiveMitraDemo } from './components/LiveMitraDemo';
import { WhatMitraDoes } from './components/WhatMitraDoes';
import { CreateContentSection } from './components/CreateContentSection';
import { LanguageSection } from './components/LanguageSection';
import { TransformationSection } from './components/TransformationSection';
import { PublishingSection } from './components/PublishingSection';
import { AnalyticsSection } from './components/AnalyticsSection';
import { JournalResourceSection } from './components/JournalResourceSection';
import { PersonalitySection } from './components/PersonalitySection';
import { FinalCTASection } from './components/FinalCTASection';
import { LandingFooter } from './components/LandingFooter';
import { AmbientBackground } from './components/AmbientBackground';

export function LandingPage() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/signup');
  };

  return (
    <div
      id="top"
      className="relative bg-bg-primary text-text-primary selection:bg-brand-100 selection:text-brand-700 min-h-screen font-sans antialiased overflow-x-hidden"
    >
      {/* CONTINUOUS AMBIENT LIQUID FLUID BACKGROUND */}
      <AmbientBackground />

      {/* SECTION 1 — NAVIGATION */}
      <LandingNav />

      <main className="relative z-10">
        {/* SECTION 2 — HERO */}
        <HeroSection onGetStarted={handleGetStarted} />

        {/* SECTION 3 — LIVE MITRA DEMONSTRATION */}
        <LiveMitraDemo onGetStarted={handleGetStarted} />

        {/* SECTION 4 — LIVE IMPACT */}
        <LiveImpactSection />

        {/* SECTION 4 — WHAT MITRA DOES (INTERACTIVE STEP-BY-STEP GRID + 3D DEVICE MOCKUP) */}
        <WhatMitraDoes />

        {/* SECTION 5 — CREATE CONTENT (ONE INPUT -> MULTIPLE OUTPUTS) */}
        <CreateContentSection />

        {/* SECTION 6 — LOCAL + MULTI-LANGUAGE MARKETING */}
        <LanguageSection />

        {/* SECTION 7 — CAMPAIGN TRANSFORMATION & STYLE INTELLIGENCE */}
        <TransformationSection />

        {/* SECTION 8 — PUBLISHING / SOCIAL CONNECTIONS */}
        <PublishingSection />

        {/* SECTION 9 — BUSINESS INTELLIGENCE / ANALYTICS */}
        <AnalyticsSection />

        {/* SECTION 10 — DYNAMIC JOURNAL & RESOURCE SECTION (TAG FILTERS + MINI AI CHAT) */}
        <JournalResourceSection />

        {/* SECTION 11 — MASCOT / PERSONALITY MOMENT */}
        <PersonalitySection />

        {/* SECTION 12 — FINAL CTA */}
        <FinalCTASection onGetStarted={handleGetStarted} />
      </main>

      {/* SECTION 13 — FOOTER */}
      <LandingFooter />
    </div>
  );
}
