'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { formatINR } from '@/lib/utils';
import { PLAN_DETAILS } from '@/features/billing/planDetails';
import { LandingNav } from './components/LandingNav';
import { LandingFooter } from './components/LandingFooter';

/**
 * Phase 17 — public marketing landing page.
 *
 * Every capability claim below is grounded in the actual implementation,
 * not aspirational copy:
 *  - Output categories (headline/caption/offer/story/reel/WhatsApp message/
 *    creative) match what CampaignDetailContent.tsx actually renders.
 *  - Languages (English/Telugu/Telugu+English) and regional style
 *    (Neutral/Hyderabadi) match src/features/campaign/constants.ts's
 *    MVP-restricted LANGUAGES/REGIONAL_STYLES lists — the backend accepts
 *    more, but the product does not expose them, so the landing page
 *    doesn't claim them either.
 *  - Truth Check is described as it actually behaves (a server-side pass/
 *    fail check against real business facts), not as a vague "AI quality"
 *    claim.
 *  - No testimonials, customer counts, revenue/engagement statistics, or
 *    logos appear anywhere on this page — there is no verified evidence
 *    to back any of those, and the phase's own rules forbid fabricating
 *    them. See docs/PHASE_17_LANDING_PAGE_REPORT.md §"Fake Social Proof
 *    Check".
 */
export function LandingPage() {
  const router = useRouter();

  return (
    <div id="top">
      <LandingNav />
      <main>
        <Hero onGetStarted={() => router.push('/signup')} />
        <HowItWorks />
        <WhatMitraCreates />
        <Differentiation />
        <BeforeAfter />
        <Pricing onGetStarted={() => router.push('/signup')} />
        <FinalCTA onGetStarted={() => router.push('/signup')} />
      </main>
      <LandingFooter />
    </div>
  );
}

function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h1 className="text-text-primary text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl">
            One photo.
            <br />A month of marketing.
          </h1>
          <p className="text-text-secondary mt-6 text-lg sm:text-xl">
            Give Mitra your business + photos → get a month&rsquo;s worth of marketing content.
          </p>
          <p className="text-text-secondary mt-4 max-w-lg text-base">
            Campaign-ready posts, captions, stories, reel concepts and offers built around your
            business — without starting from a blank page every day.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={onGetStarted}>
              Create My First Campaign
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              See How It Works
            </Button>
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

/**
 * The product outcome, not generic AI imagery: one photo goes in, a set of
 * real campaign-content types come out. Built from the existing design
 * system's tokens/components rather than a fabricated screenshot of
 * functionality that doesn't exist.
 */
function HeroVisual() {
  const outputs = ['Post', 'Caption', 'Offer', 'Story', 'Reel', 'WhatsApp message'];

  return (
    <div className="relative" aria-hidden="true">
      <div className="border-border-light bg-bg-secondary mx-auto flex max-w-sm flex-col items-center gap-4 rounded-2xl border p-6 shadow-lg">
        <div className="border-border-medium bg-bg-primary flex h-28 w-28 items-center justify-center rounded-xl border-2 border-dashed">
          <svg
            className="text-text-tertiary h-10 w-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 7.5l-4.5-4.5m0 0L7.5 7.5m4.5-4.5v13.5"
            />
          </svg>
        </div>
        <p className="text-text-tertiary text-xs font-medium tracking-wide uppercase">
          Your product photo
        </p>

        <div className="text-text-tertiary text-2xl leading-none">↓</div>

        <div className="bg-brand-600 rounded-full px-4 py-1.5 text-sm font-semibold text-white">
          Mitra
        </div>

        <div className="text-text-tertiary text-2xl leading-none">↓</div>

        <div className="grid w-full grid-cols-2 gap-2">
          {outputs.map((label) => (
            <div
              key={label}
              className="border-border-light bg-bg-primary rounded-lg border px-3 py-2 text-center text-xs font-medium text-neutral-700"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <p className="text-brand-600 text-sm font-semibold tracking-wide uppercase">{eyebrow}</p>
      )}
      <h2 className="text-text-primary mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {description && <p className="text-text-secondary mt-4 text-lg">{description}</p>}
    </div>
  );
}

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Tell Mitra about your business',
    description: 'Business details, products or services, audience and preferences.',
  },
  {
    step: '02',
    title: 'Add your photos',
    description: 'Upload photos of your products, services or business.',
  },
  {
    step: '03',
    title: 'Choose what to promote',
    description: 'Pick a campaign objective, offer, audience, language and style.',
  },
  {
    step: '04',
    title: 'Get your marketing content',
    description: 'Mitra generates campaign copy and creatives, ready for you to review.',
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-bg-secondary py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="How it works" title="From one photo to a real campaign" />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS_STEPS.map((item) => (
            <div
              key={item.step}
              className="border-border-light bg-bg-primary rounded-xl border p-6"
            >
              <p className="text-brand-600 text-sm font-bold">{item.step}</p>
              <h3 className="text-text-primary mt-2 text-lg font-semibold">{item.title}</h3>
              <p className="text-text-secondary mt-2 text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const WHAT_MITRA_CREATES = [
  { title: 'Campaign copy', description: 'Ready-to-use headlines and captions for your offer.' },
  { title: 'Offers', description: 'Turn a real business offer into campaign-ready messaging.' },
  { title: 'Stories', description: 'Quick story concepts built around the campaign.' },
  { title: 'Reels', description: 'Short-form reel concepts your business can actually use.' },
  { title: 'WhatsApp message', description: 'A ready-to-send message for your customers.' },
  { title: 'Creative', description: 'A campaign visual generated around your product photo.' },
];

function WhatMitraCreates() {
  return (
    <section id="what-you-get" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="What you get"
          title="Everything you need to post, in one pass"
          description="Every campaign includes these, generated around your actual business and offer."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {WHAT_MITRA_CREATES.map((item) => (
            <div key={item.title} className="border-border-light rounded-xl border p-6">
              <h3 className="text-text-primary text-lg font-semibold">{item.title}</h3>
              <p className="text-text-secondary mt-2 text-sm">{item.description}</p>
            </div>
          ))}
        </div>

        <p className="text-text-tertiary mx-auto mt-8 max-w-2xl text-center text-sm">
          Every campaign also goes through Mitra&rsquo;s Truth Check — a server-side check that your
          generated content matches your real price, offer and business details before you see it.
        </p>
      </div>
    </section>
  );
}

const DIFFERENTIATION_ITEMS = [
  {
    title: 'Built around your business',
    description:
      'Mitra uses your actual business details, products and brand preferences — not generic template copy.',
  },
  {
    title: 'Local language and style',
    description:
      'Generate content in English, Telugu, or Telugu + English, with a Hyderabadi style option.',
  },
  {
    title: 'Real offers, checked',
    description:
      'Campaigns are built around your actual offers, and checked against your real business facts before you see them.',
  },
  {
    title: 'WhatsApp-first',
    description: 'Every campaign includes a ready-to-send WhatsApp message for your customers.',
  },
];

function Differentiation() {
  return (
    <section className="bg-bg-secondary py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Built for businesses like yours"
          title="Built around how local businesses actually market"
          description="Starting with restaurants and cloud kitchens — with salons and real estate also supported."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {DIFFERENTIATION_ITEMS.map((item) => (
            <div
              key={item.title}
              className="border-border-light bg-bg-primary rounded-xl border p-6"
            >
              <h3 className="text-text-primary text-lg font-semibold">{item.title}</h3>
              <p className="text-text-secondary mt-2 text-sm">{item.description}</p>
            </div>
          ))}
        </div>

        <p className="text-text-tertiary mx-auto mt-8 max-w-xl text-center text-sm">
          Example: a restaurant in Kondapur uploads a photo of their weekend biryani special and
          gets a full campaign — headline, caption, offer, story, reel concept and a WhatsApp
          message — built around that dish and that offer.
        </p>
      </div>
    </section>
  );
}

const BEFORE_ITEMS = [
  'One photo sitting in your phone',
  'No caption written',
  'No campaign idea',
  'No time to sit down and write one',
  '"I’ll post it later"',
];

const AFTER_ITEMS = [
  'Headline',
  'Caption',
  'Offer',
  'Creative',
  'Story',
  'Reel concept',
  'WhatsApp message',
];

function BeforeAfter() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading
          title="From &ldquo;I should post something&rdquo; to &ldquo;I have something to post&rdquo;"
          description="This is about the marketing effort it takes to get something posted — not a promise about business results."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="border-border-light rounded-xl border p-6">
            <p className="text-text-tertiary text-sm font-semibold tracking-wide uppercase">
              Before
            </p>
            <ul className="mt-4 space-y-3">
              {BEFORE_ITEMS.map((item) => (
                <li key={item} className="text-text-secondary flex items-start gap-2 text-sm">
                  <span aria-hidden="true" className="text-text-tertiary mt-0.5">
                    –
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-brand-200 bg-brand-50 rounded-xl border p-6">
            <p className="text-brand-700 text-sm font-semibold tracking-wide uppercase">
              After — campaign ready
            </p>
            <ul className="mt-4 space-y-3">
              {AFTER_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-neutral-800">
                  <span aria-hidden="true" className="text-success-600 mt-0.5">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing({ onGetStarted }: { onGetStarted: () => void }) {
  const plans: Array<keyof typeof PLAN_DETAILS> = ['free', 'starter', 'business'];

  return (
    <section id="pricing" className="bg-bg-secondary py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Start free. Upgrade when you need more."
          description="Every plan includes monthly credits for generating campaigns. Buy more credits any time you need them."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {plans.map((planKey) => {
            const plan = PLAN_DETAILS[planKey];
            return (
              <div
                key={planKey}
                className={`rounded-xl border p-6 ${
                  planKey === 'business'
                    ? 'border-brand-500 bg-bg-primary shadow-md'
                    : 'border-border-light bg-bg-primary'
                }`}
              >
                <h3 className="text-text-primary text-lg font-semibold">{plan.name}</h3>
                <p className="text-text-primary mt-2 text-3xl font-bold">
                  {plan.price === 0 ? 'Free' : formatINR(plan.price)}
                  {plan.price > 0 && (
                    <span className="text-text-tertiary text-base font-normal">/month</span>
                  )}
                </p>
                <p className="text-text-secondary mt-1 text-sm">
                  {plan.credits.toLocaleString('en-IN')} credits/month
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.slice(0, 3).map((feature) => (
                    <li key={feature} className="text-text-secondary text-sm">
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Button size="lg" onClick={onGetStarted}>
            Start Creating
          </Button>
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
      <h2 className="text-text-primary text-3xl font-bold tracking-tight sm:text-4xl">
        Your next month&rsquo;s marketing can start with one photo.
      </h2>
      <p className="text-text-secondary mx-auto mt-4 max-w-xl text-lg">
        Tell Mitra about your business, add your photos, and create your first campaign.
      </p>
      <div className="mt-8">
        <Button size="lg" onClick={onGetStarted}>
          Get Started
        </Button>
      </div>
    </section>
  );
}
