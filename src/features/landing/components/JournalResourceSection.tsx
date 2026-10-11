'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { SelfDrawingPath } from './KineticEffects';
import { MitraMascot } from '@/components/ui/MitraMascot';

export type JournalCategory =
  'All' | 'Marketing Strategy' | 'AI Copywriting' | 'Local Growth' | 'Reels & Visuals';

export interface Article {
  id: string;
  title: string;
  snippet: string;
  category: JournalCategory;
  readTime: string;
  date: string;
  image: string;
  content: string;
}

const ARTICLES: Article[] = [
  {
    id: 'biryani-marketing',
    title: 'How a Hyderabad Biryani Spot Scaled Orders by 3.4x using WhatsApp Campaigns',
    snippet:
      'Learn how localized Telugu-English copy paired with weekend combos drove 1,200+ direct WhatsApp orders in under 14 days.',
    category: 'Local Growth',
    readTime: '4 min read',
    date: 'Oct 2026',
    image:
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    content:
      'Indian local food businesses thrive on authentic regional language and timely offers. By combining one appetizing photo of Dum Biryani with a limited-time weekend promo, Mitra AI generated 6 distinct assets formatted for Instagram Stories, Reels, and WhatsApp Broadcast lists.',
  },
  {
    id: 'festive-glowup',
    title: 'The Ultimate Festive Marketing Playbook for Beauty Salons & Spas',
    snippet:
      'Step-by-step framework to launch high-converting festival packages (Diwali, Eid, weddings) with zero design budget.',
    category: 'Marketing Strategy',
    readTime: '5 min read',
    date: 'Sep 2026',
    image:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80',
    content:
      'Festive seasons bring immense demand for local beauty salons. Mitra creates glass-skin package promos, pre-booking discount coupons, and WhatsApp booking messages to help keep appointment slots filled.',
  },
  {
    id: 'ai-copywriting-secrets',
    title: '5 Hyderabadi & Hinglish Copywriting Hooks That Beat Generic Ads Every Time',
    snippet:
      'Why corporate marketing copy fails for local customers and how regional language nuances drive double-digit conversion.',
    category: 'AI Copywriting',
    readTime: '3 min read',
    date: 'Sep 2026',
    image:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    content:
      'Generic AI copy sounds robotic. Mitra Business Brain integrates local slang, cultural nuances, and regional dialect expressions like "Craving authentic taste?" or "Sunday family combo clear kaavali ante..." to build instant customer trust.',
  },
  {
    id: 'reels-mastery',
    title: 'Creating 15-Second Instagram Reels Scripts That Convert Viewers to Customers',
    snippet:
      'Viral reel audio hooks, visual timing cues, and call-to-action overlays tailored for local retail & restaurants.',
    category: 'Reels & Visuals',
    readTime: '4 min read',
    date: 'Aug 2026',
    image:
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80',
    content:
      'Reels are the #1 organic growth channel for Indian small businesses. Mitra automatically generates 15-second beat-synced scripts complete with voiceover cues, text overlays, and trending audio suggestions.',
  },
];

export function JournalResourceSection() {
  const reduceMotion = useReducedMotion();
  const [activeCategory, setActiveCategory] = useState<JournalCategory>('All');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const categories: JournalCategory[] = [
    'All',
    'Local Growth',
    'Marketing Strategy',
    'AI Copywriting',
    'Reels & Visuals',
  ];

  const filteredArticles =
    activeCategory === 'All' ? ARTICLES : ARTICLES.filter((art) => art.category === activeCategory);

  return (
    <section id="resources" className="bg-bg-secondary relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="border-brand-200 bg-brand-50 text-brand-700 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-bold tracking-wider uppercase">
            <span>📚 Marketing Journal & Guides</span>
          </span>
          <h2 className="text-text-primary mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            Knowledge & Insights for Local Business Growth
          </h2>
          <p className="text-text-secondary mt-3 text-base sm:text-lg">
            Proven playbooks, copywriting secrets, and real growth stories from small business
            owners using Mitra.
          </p>
        </div>

        {/* CAMPAIGN CREATION VALUE PROPOSITION BANNER */}
        <div className="mx-auto mt-10 max-w-2xl">
          <div className="border-brand-200 bg-surface dark:border-brand-900/40 relative flex flex-col items-center justify-between gap-4 overflow-hidden rounded-3xl border p-5 shadow-lg sm:flex-row sm:p-6">
            <div className="flex items-center gap-3.5">
              <MitraMascot pose="creating" size={42} className="shrink-0" />
              <div>
                <span className="text-brand-600 text-xs font-bold tracking-wider uppercase">
                  Campaign Engine
                </span>
                <p className="text-text-primary text-sm font-bold">
                  Tell Mitra what you&apos;re promoting → Mitra creates the campaign.
                </p>
                <p className="text-text-secondary text-xs">
                  One offer + product details → Ad copy, social visual, and video story.
                </p>
              </div>
            </div>
            <a
              href="/campaigns/new"
              className="bg-brand-500 hover:bg-brand-600 shrink-0 rounded-full px-5 py-2.5 text-xs font-bold text-white shadow-sm transition"
            >
              Start Campaign →
            </a>
          </div>
        </div>

        {/* CATEGORY TAG FILTERS */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all ${
                activeCategory === cat
                  ? 'bg-brand-600 shadow-brand-500/20 text-white shadow-md'
                  : 'border-border-light bg-surface text-text-secondary hover:border-brand-500/50 hover:text-text-primary border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ARTICLES GRID */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filteredArticles.map((article) => (
              <motion.article
                key={article.id}
                layout
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                onClick={() => setSelectedArticle(article)}
                className="group border-border-light bg-surface hover:border-brand-500/50 relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div>
                  {/* Article Thumbnail Image */}
                  <div className="relative h-44 w-full overflow-hidden rounded-2xl">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="bg-surface/90 border-border-light text-text-primary absolute top-3 left-3 rounded-full border px-2.5 py-1 text-[10px] font-bold backdrop-blur-md">
                      {article.category}
                    </span>
                  </div>

                  {/* Meta info */}
                  <div className="text-text-tertiary mt-4 flex items-center justify-between text-[11px]">
                    <span>{article.date}</span>
                    <span>• {article.readTime}</span>
                  </div>

                  <h3 className="text-text-primary group-hover:text-brand-600 mt-2 text-base leading-snug font-bold transition-colors">
                    {article.title}
                  </h3>

                  <p className="text-text-secondary mt-2 line-clamp-3 text-xs leading-relaxed">
                    {article.snippet}
                  </p>
                </div>

                <div className="text-brand-600 mt-6 flex items-center gap-1 text-xs font-bold">
                  <span>Read Article</span>
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <SelfDrawingPath d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>

        {/* EXPANDED ARTICLE MODAL */}
        <AnimatePresence>
          {selectedArticle && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="border-border-light bg-surface relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border p-6 shadow-2xl sm:p-8"
              >
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="bg-bg-secondary text-text-secondary hover:text-text-primary absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
                >
                  ✕
                </button>

                <span className="bg-brand-50 text-brand-700 rounded-full px-3 py-1 text-xs font-bold">
                  {selectedArticle.category}
                </span>

                <h2 className="text-text-primary mt-3 text-xl font-bold sm:text-2xl">
                  {selectedArticle.title}
                </h2>

                <div className="text-text-tertiary mt-2 text-xs">
                  Published {selectedArticle.date} • {selectedArticle.readTime}
                </div>

                <img
                  src={selectedArticle.image}
                  alt={selectedArticle.title}
                  className="mt-4 h-56 w-full rounded-2xl object-cover"
                />

                <div className="text-text-secondary mt-6 space-y-4 text-sm leading-relaxed">
                  <p>{selectedArticle.content}</p>
                  <p className="text-text-primary font-semibold">
                    Want to run campaigns like this for your own business?
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="border-border-medium text-text-secondary cursor-pointer rounded-full border px-5 py-2 text-xs font-semibold"
                  >
                    Close
                  </button>
                  <a
                    href="/signup"
                    className="bg-brand-500 shadow-brand-500/20 rounded-full px-5 py-2 text-xs font-bold text-white shadow-md"
                  >
                    Start Creating Free →
                  </a>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
