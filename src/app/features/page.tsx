import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { MitraLogo } from '@/components/ui/MitraLogo';
import { LandingNav } from '@/features/landing/components/LandingNav';
import { LandingFooter } from '@/features/landing/components/LandingFooter';
import { Reveal } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = pageMetadata({
  title: 'Features — Mitra by Brainwise',
  description:
    'Explore Mitra AI marketing engine features: campaign generation, Truth Check, regional styles, and WhatsApp messaging.',
  path: '/features',
});

export default function FeaturesPage() {
  const featureList = [
    {
      title: 'One Photo to Full Campaign',
      description:
        'Upload a single photo of your product, dish, or venue. Mitra generates headlines, captions, stories, reel concepts, visual creatives, and WhatsApp messages in seconds.',
      icon: (
        <svg
          className="text-brand-600 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      title: 'Server-Side Truth Check',
      description:
        'Never worry about AI hallucinating prices or fake discounts. Mitra’s Truth Check validates every generated copy against your real business facts and product data before it reaches your dashboard.',
      icon: (
        <svg
          className="text-brand-600 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: 'Regional Languages & Hyderabadi Style',
      description:
        'Market in the language your local customers actually speak. Generate content in English, Telugu, or Hinglish/Telglish with authentic regional tone options.',
      icon: (
        <svg
          className="text-brand-600 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
      ),
    },
    {
      title: 'WhatsApp-First Copy',
      description:
        'Every campaign comes with ready-to-broadcast WhatsApp messages, complete with CTAs, emojis, and clear offer details optimized for customer replies.',
      icon: (
        <svg
          className="text-brand-600 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
    },
    {
      title: 'Brand Kit & Logo Integration',
      description:
        'Store your brand colors, logos, phone numbers, and addresses. Mitra automatically formats visual posters and copy to align with your brand identity.',
      icon: (
        <svg
          className="text-brand-600 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      ),
    },
    {
      title: 'Short-Form Reel Script Concepts',
      description:
        'Get frame-by-frame script ideas and visual directions for Instagram Reels and Shorts, designed specifically for your product offer.',
      icon: (
        <svg
          className="text-brand-600 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-bg-primary text-text-primary min-h-screen">
      <LandingNav />

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <MitraLogo size="sm" />
            <span className="text-text-tertiary text-sm font-semibold tracking-wide uppercase">
              Engine Capabilities
            </span>
          </div>
          <h1 className="text-text-primary text-4xl font-extrabold tracking-tight sm:text-5xl">
            Everything you need for marketing, in one pass
          </h1>
          <p className="text-text-secondary mx-auto mt-4 max-w-2xl text-lg">
            Mitra replaces the daily struggle of manual content creation with structured AI
            generation grounded in real business facts.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {featureList.map((feature, idx) => (
            <Reveal key={feature.title} index={idx % 3} className="flex">
              <div className="card-interactive border-border-light bg-bg-secondary w-full rounded-2xl border p-8">
                <div className="bg-brand-50 mb-4 inline-flex items-center justify-center rounded-xl p-3">
                  {feature.icon}
                </div>
                <h3 className="text-text-primary text-xl font-bold">{feature.title}</h3>
                <p className="text-text-secondary mt-3 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="bg-brand-50 border-brand-200 mt-20 rounded-2xl border p-10 text-center">
          <h2 className="text-text-primary text-3xl font-bold">
            Ready to transform your business marketing?
          </h2>
          <p className="text-text-secondary mx-auto mt-3 max-w-xl">
            Start free today and create your first complete marketing campaign in under two minutes.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/signup">
              <Button size="lg">Start Free</Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
