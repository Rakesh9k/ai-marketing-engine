'use client';

import { useCallback, useState } from 'react';
import { LandingNav } from './components/LandingNav';
import { HeroSection } from './components/HeroSection';
import { WhatMitraDoes } from './components/WhatMitraDoes';
import { CreateContentSection } from './components/CreateContentSection';
import { LanguageSection } from './components/LanguageSection';
import { TransformationSection } from './components/TransformationSection';
import { PersonalitySection } from './components/PersonalitySection';
import { FinalCTASection } from './components/FinalCTASection';
import { LandingFooter } from './components/LandingFooter';
import { AmbientBackground } from './components/AmbientBackground';
import { AuthNudge } from './components/AuthNudge';

export function LandingPage() {
  // "Try Mitra" / "Start for Free" open a value-led nudge instead of bouncing straight to /signup.
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const handleGetStarted = () => setNudgeOpen(true);
  const closeNudge = useCallback(() => setNudgeOpen(false), []);

  return (
    <div
      id="top"
      className="bg-bg-primary text-text-primary selection:bg-brand-100 selection:text-brand-700 relative min-h-screen overflow-x-hidden font-sans antialiased"
    >
      {/* CONTINUOUS AMBIENT LIQUID FLUID BACKGROUND */}
      <AmbientBackground />

      {/* SECTION 1 — NAVIGATION */}
      <LandingNav />

      <main className="relative z-10">
        {/* SECTION 2 — HERO */}
        <HeroSection onGetStarted={handleGetStarted} />

        {/* SECTION 4 — WHAT MITRA DOES (INTERACTIVE STEP-BY-STEP GRID + 3D DEVICE MOCKUP) */}
        <WhatMitraDoes />

        {/* SECTION 5 — CREATE CONTENT (ONE INPUT -> MULTIPLE OUTPUTS) */}
        <CreateContentSection />

        {/* SECTION 6 — LOCAL + MULTI-LANGUAGE MARKETING */}
        <LanguageSection />

        {/* SECTION 7 — CAMPAIGN TRANSFORMATION & STYLE INTELLIGENCE */}
        <TransformationSection />

        {/* The marketing journal section is not shown: its articles and growth statistics were illustrative, not real
            customer results (Phase 10 claims audit). The component is kept for when real stories exist. */}

        {/* SECTION 11 — MASCOT / PERSONALITY MOMENT */}
        <PersonalitySection />

        {/* SECTION 12 — FINAL CTA */}
        <FinalCTASection onGetStarted={handleGetStarted} />
      </main>

      {/* SECTION 13 — FOOTER */}
      <LandingFooter />

      <AuthNudge open={nudgeOpen} onClose={closeNudge} />
    </div>
  );
}
