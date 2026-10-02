'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { SelfDrawingPath } from './KineticEffects';
import { MitraMascot } from '@/components/ui/MitraMascot';

export type JournalCategory = 'All' | 'Marketing Strategy' | 'AI Copywriting' | 'Local Growth' | 'Reels & Visuals';

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
    snippet: 'Learn how localized Telugu-English copy paired with weekend combos drove 1,200+ direct WhatsApp orders in under 14 days.',
    category: 'Local Growth',
    readTime: '4 min read',
    date: 'Oct 2026',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    content: 'Indian local food businesses thrive on authentic regional language and timely offers. By combining one appetizing photo of Dum Biryani with a limited-time weekend promo, Mitra AI generated 6 distinct assets formatted for Instagram Stories, Reels, and WhatsApp Broadcast lists.',
  },
  {
    id: 'festive-glowup',
    title: 'The Ultimate Festive Marketing Playbook for Beauty Salons & Spas',
    snippet: 'Step-by-step framework to launch high-converting festival packages (Diwali, Eid, weddings) with zero design budget.',
    category: 'Marketing Strategy',
    readTime: '5 min read',
    date: 'Sep 2026',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80',
    content: 'Festive seasons bring immense demand for local beauty salons. Mitra creates glass-skin package promos, pre-booking discount coupons, and automated client reminders that keep appointment slots 100% filled.',
  },
  {
    id: 'ai-copywriting-secrets',
    title: '5 Hyderabadi & Hinglish Copywriting Hooks That Beat Generic Ads Every Time',
    snippet: 'Why corporate marketing copy fails for local customers and how regional language nuances drive double-digit conversion.',
    category: 'AI Copywriting',
    readTime: '3 min read',
    date: 'Sep 2026',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    content: 'Generic AI copy sounds robotic. Mitra Business Brain integrates local slang, cultural nuances, and regional dialect expressions like "Craving authentic taste?" or "Sunday family combo clear kaavali ante..." to build instant customer trust.',
  },
  {
    id: 'reels-mastery',
    title: 'Creating 15-Second Instagram Reels Scripts That Convert Viewers to Customers',
    snippet: 'Viral reel audio hooks, visual timing cues, and call-to-action overlays tailored for local retail & restaurants.',
    category: 'Reels & Visuals',
    readTime: '4 min read',
    date: 'Aug 2026',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80',
    content: 'Reels are the #1 organic growth channel for Indian small businesses. Mitra automatically generates 15-second beat-synced scripts complete with voiceover cues, text overlays, and trending audio suggestions.',
  },
];

export function JournalResourceSection() {
  const reduceMotion = useReducedMotion();
  const [activeCategory, setActiveCategory] = useState<JournalCategory>('All');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Mini Interactive Chat Prompt State
  const [promptQuery, setPromptQuery] = useState('');
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  const categories: JournalCategory[] = [
    'All',
    'Local Growth',
    'Marketing Strategy',
    'AI Copywriting',
    'Reels & Visuals',
  ];

  const filteredArticles =
    activeCategory === 'All'
      ? ARTICLES
      : ARTICLES.filter((art) => art.category === activeCategory);

  const handleAskMitra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptQuery.trim()) return;

    setIsAsking(true);
    setChatAnswer(null);

    // Simulate instant AI advice response
    setTimeout(() => {
      setIsAsking(false);
      setChatAnswer(
        `💡 **Mitra Strategy**: For "${promptQuery.trim()}", start with a festive offer (e.g. Flat 20% OFF combo) + one appetizing photo. Share via WhatsApp Broadcast at 11:30 AM on Friday for peak local engagement!`
      );
    }, 900);
  };

  return (
    <section id="resources" className="relative bg-bg-secondary py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-bold text-brand-700 uppercase tracking-wider">
            <span>📚 Marketing Journal & Guides</span>
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-text-primary sm:text-5xl">
            Knowledge & Insights for Local Business Growth
          </h2>
          <p className="mt-3 text-base text-text-secondary sm:text-lg">
            Proven playbooks, copywriting secrets, and real growth stories from small business owners using Mitra.
          </p>
        </div>

        {/* EMBEDDED MINI INTERACTIVE AI CHAT PROMPT WIDGET */}
        <div className="mx-auto mt-10 max-w-2xl">
          <div className="relative overflow-hidden rounded-3xl border border-brand-200 bg-surface p-5 shadow-lg dark:border-brand-900/40">
            <div className="flex items-center gap-3">
              <MitraMascot pose="thinking" size={42} className="shrink-0" />
              <div>
                <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">Ask Mitra AI Assistant</span>
                <p className="text-xs text-text-secondary">Have a quick marketing question for your business?</p>
              </div>
            </div>

            <form onSubmit={handleAskMitra} className="mt-3 flex gap-2">
              <input
                type="text"
                value={promptQuery}
                onChange={(e) => setPromptQuery(e.target.value)}
                placeholder="e.g. How do I promote a Diwali salon package?"
                className="w-full rounded-full border border-border-medium bg-bg-secondary px-4 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <button
                type="submit"
                disabled={isAsking}
                className="shrink-0 rounded-full bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50 cursor-pointer"
              >
                {isAsking ? 'Thinking...' : 'Ask →'}
              </button>
            </form>

            {chatAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                {chatAnswer}
              </motion.div>
            )}
          </div>
        </div>

        {/* CATEGORY TAG FILTERS */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'border border-border-light bg-surface text-text-secondary hover:border-brand-500/50 hover:text-text-primary'
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
                className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border border-border-light bg-surface p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/50 hover:shadow-xl"
              >
                <div>
                  {/* Article Thumbnail Image */}
                  <div className="relative h-44 w-full overflow-hidden rounded-2xl">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-3 left-3 rounded-full bg-surface/90 border border-border-light px-2.5 py-1 text-[10px] font-bold text-text-primary backdrop-blur-md">
                      {article.category}
                    </span>
                  </div>

                  {/* Meta info */}
                  <div className="mt-4 flex items-center justify-between text-[11px] text-text-tertiary">
                    <span>{article.date}</span>
                    <span>• {article.readTime}</span>
                  </div>

                  <h3 className="mt-2 text-base font-bold leading-snug text-text-primary transition-colors group-hover:text-brand-600">
                    {article.title}
                  </h3>

                  <p className="mt-2 text-xs text-text-secondary leading-relaxed line-clamp-3">
                    {article.snippet}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-1 text-xs font-bold text-brand-600">
                  <span>Read Article</span>
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border-light bg-surface p-6 sm:p-8 shadow-2xl"
              >
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  ✕
                </button>

                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                  {selectedArticle.category}
                </span>

                <h2 className="mt-3 text-xl sm:text-2xl font-bold text-text-primary">
                  {selectedArticle.title}
                </h2>

                <div className="mt-2 text-xs text-text-tertiary">
                  Published {selectedArticle.date} • {selectedArticle.readTime}
                </div>

                <img
                  src={selectedArticle.image}
                  alt={selectedArticle.title}
                  className="mt-4 h-56 w-full rounded-2xl object-cover"
                />

                <div className="mt-6 text-sm leading-relaxed text-text-secondary space-y-4">
                  <p>{selectedArticle.content}</p>
                  <p className="font-semibold text-text-primary">
                    Want to run campaigns like this for your own business?
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="rounded-full border border-border-medium px-5 py-2 text-xs font-semibold text-text-secondary cursor-pointer"
                  >
                    Close
                  </button>
                  <a
                    href="/signup"
                    className="rounded-full bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-brand-500/20"
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
