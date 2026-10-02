'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MitraLogo } from '@/components/ui/MitraLogo';
import { CAMPAIGN_GENERATION_COST, CREDIT_COSTS } from '@/lib/config/pricing';

interface FAQItem {
  id: string;
  category: 'onboarding' | 'campaigns' | 'social' | 'billing';
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: '1',
    category: 'onboarding',
    question: "How does the 'One photo, 30 days of marketing' concept work?",
    answer:
      "Mitra's AI analyzes a single photo of your product or storefront, reads your Business Brain profile (name, industry, location, tone), and generates a complete 30-day marketing calendar with ready-to-publish images, captions, hashtags, and WhatsApp messages.",
  },
  {
    id: '2',
    category: 'onboarding',
    question: 'How do I set up my Business Brain?',
    answer:
      'Navigate to Business Brain (/business). Fill in your business basic details, upload your logo, define your primary offerings, select your preferred tone of voice (e.g., Warm & Local, Premium Professional), and set language preferences.',
  },
  {
    id: '3',
    category: 'campaigns',
    question: 'How are credits consumed for different generations?',
    answer: `A social creative or poster image costs ${CREDIT_COSTS.IMAGE_GENERATION} credits. An AI reel costs ${CREDIT_COSTS.REEL_GENERATION} credits. A full campaign costs ${CAMPAIGN_GENERATION_COST} credits (the campaign plus up to two AI images). Regenerating an asset costs ${CREDIT_COSTS.REGENERATION} credits.`,
  },
  {
    id: '4',
    category: 'campaigns',
    question: 'Can I edit generated images and captions before publishing?',
    answer:
      'Yes! Every generated creative can be edited in the Creative Studio (/creative) or Content workspace (/content). You can modify text, change background styles, adjust hashtags, or regenerate alternative variations.',
  },
  {
    id: '5',
    category: 'social',
    question: 'How do I connect my Instagram and Facebook business pages?',
    answer:
      "Go to Settings → Social Connections (/settings/social). Click 'Connect Meta Account' and follow the OAuth prompt to grant page management permissions. Once linked, you can schedule and publish directly from Mitra.",
  },
  {
    id: '6',
    category: 'billing',
    question: 'What happens when I run out of credits?',
    answer:
      'You can buy a credit top-up pack anytime from the Billing & Plans page (/billing), or wait for your credits to refresh at the start of the next calendar month. Credits are valid only through the current calendar month: unused plan credits do not roll over into the next month, and top-up pack credits are likewise valid only for the month you buy them in.',
  },
  {
    id: '7',
    category: 'billing',
    question: 'Do paid plans renew automatically, and how do I cancel?',
    answer:
      'Yes. Paid plans renew automatically at the end of each billing period until you cancel, and there is no free trial. You can cancel from the Billing & Plans page (/billing). Cancelling stops the next renewal; you keep your plan until the end of the period you have already paid for, then your account moves to the Free plan. See our Cancellation Policy (/cancellation) for details.',
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openFaq, setOpenFaq] = useState<string | null>('1');

  const filteredFaqs = FAQS.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-bg-primary text-text-primary min-h-screen">
      {/* Header */}
      <header className="border-border-light bg-surface border-b px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" aria-label="Mitra — Home">
            <MitraLogo size="md" />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/assistant"
              className="border-brand-300 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors"
            >
              💬 Ask AI Assistant
            </Link>
            <Link
              href="/dashboard"
              className="bg-brand-500 hover:bg-brand-600 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              Go to Workspace
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Search Section */}
      <section className="border-border-light from-brand-50/50 via-surface to-bg-primary border-b bg-gradient-to-b px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <span className="bg-brand-100 text-brand-600 inline-block rounded-full px-3 py-1 text-xs font-semibold">
            Documentation & Support
          </span>
          <h1 className="text-text-primary text-3xl font-extrabold tracking-tight sm:text-4xl">
            How can we help your business succeed with Mitra?
          </h1>
          <p className="text-text-secondary text-base">
            Search our knowledge base or browse step-by-step guides below.
          </p>

          <div className="relative pt-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guides, credit rules, Instagram setup..."
              className="border-border-light bg-surface text-text-primary placeholder:text-text-tertiary focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-2xl border px-5 py-4 pl-12 text-base shadow-sm focus:ring-2 focus:outline-none"
            />
            <svg
              className="text-text-tertiary absolute top-6 left-4 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl space-y-12 px-4 py-12 sm:px-6">
        {/* Topic Cards */}
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: '🚀',
              title: 'Getting Started',
              desc: 'Onboarding, 1-photo setup, Business Brain setup',
              link: '/onboarding',
            },
            {
              icon: '🎨',
              title: 'Creative Studio',
              desc: 'Generating images, reels, posters & copy',
              link: '/creative',
            },
            {
              icon: '📲',
              title: 'Social & WhatsApp',
              desc: 'Connecting Instagram, Meta pages & WhatsApp broadcasts',
              link: '/whatsapp',
            },
            {
              icon: '💳',
              title: 'Billing & Credits',
              desc: 'Managing plans, credit calculation, invoices',
              link: '/billing',
            },
          ].map((topic, idx) => (
            <Link
              key={idx}
              href={topic.link}
              className="group border-border-light bg-surface hover:border-brand-300 rounded-2xl border p-6 shadow-2xs transition-all hover:shadow-md"
            >
              <span className="bg-bg-secondary mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-transform group-hover:scale-105">
                {topic.icon}
              </span>
              <h3 className="text-text-primary group-hover:text-brand-600 text-base font-bold transition-colors">
                {topic.title}
              </h3>
              <p className="text-text-secondary mt-1 text-xs leading-relaxed">{topic.desc}</p>
            </Link>
          ))}
        </section>

        {/* FAQ Section */}
        <section className="space-y-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-text-primary text-2xl font-bold">Frequently Asked Questions</h2>
              <p className="text-text-secondary text-sm">Instant answers to common queries.</p>
            </div>

            {/* Category Filter */}
            <div className="flex scrollbar-none items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All FAQs' },
                { id: 'onboarding', label: 'Onboarding' },
                { id: 'campaigns', label: 'Campaigns' },
                { id: 'social', label: 'Social & WA' },
                { id: 'billing', label: 'Billing' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-brand-500 text-white'
                      : 'border-border-light bg-surface text-text-secondary hover:bg-bg-secondary hover:text-text-primary border'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accordion List */}
          <div className="space-y-3">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq) => {
                const isOpen = openFaq === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="border-border-light bg-surface overflow-hidden rounded-2xl border shadow-2xs transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                      className="text-text-primary hover:bg-bg-secondary/40 flex w-full items-center justify-between p-5 text-left text-sm font-bold transition-colors"
                    >
                      <span>{faq.question}</span>
                      <svg
                        className={`text-text-tertiary h-5 w-5 transition-transform ${
                          isOpen ? 'text-brand-600 rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="border-border-light/60 bg-bg-secondary/20 text-text-secondary border-t p-5 text-sm leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="border-border-light text-text-secondary rounded-2xl border border-dashed p-8 text-center text-sm">
                No matching help articles found for "{searchQuery}".
              </div>
            )}
          </div>
        </section>

        {/* Contact Support Banner */}
        <section className="border-brand-200 from-brand-500 to-brand-600 rounded-2xl border bg-gradient-to-r p-8 text-white shadow-md">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div>
              <h3 className="text-xl font-bold">Still need help?</h3>
              <p className="mt-1 text-sm opacity-90">
                Our support team is available to assist you with custom setups, billing inquiries,
                or technical issues.
              </p>
            </div>
            <Link
              href="/support"
              className="text-brand-600 hover:bg-brand-50 flex-shrink-0 rounded-xl bg-white px-6 py-3 text-sm font-bold shadow-sm transition-colors"
            >
              Contact Support Team
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
