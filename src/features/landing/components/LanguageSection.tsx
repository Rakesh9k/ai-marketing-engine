'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

interface CopyContent {
  title: string;
  headline: string;
  whatsapp: string;
  reel: string;
}

const DEFAULT_COPY: CopyContent = {
  title: 'Weekend Biryani Special',
  headline:
    '✨ Savor the Authentic Hyderabadi Taste! Get 20% OFF on all family biryani combos this Sunday.',
  whatsapp:
    '👋 Hi [Customer Name]! Planning Sunday family lunch? Order our famous Biryani Feast online & get 20% OFF!',
  reel: 'Hook: "Still thinking where to eat this Sunday?" -> Cut to sizzling biryani handi -> CTA: Order now!',
};

const copyExamples: Record<string, CopyContent> = {
  en: DEFAULT_COPY,
  te: {
    title: 'ఈ వీకెండ్ బిర్యానీ స్పెషల్',
    headline:
      '✨ నిజమైన హైదరాబాదీ బిర్యానీ రుచి! ఈ ఆదివారం మీ ఫ్యామిలీ ఆర్డర్‌పై ఫ్లాట్ 20% డిస్కౌంట్ పొందండి.',
    whatsapp:
      '👋 నమస్తే! ఈ సండే ఫ్యామిలీ లంచ్ కోసం బిర్యానీ ఆర్డర్ చేస్తున్నారా? ఈ రోజే బుక్ చేయండి, 20% ఆఫర్ పొందండి!',
    reel: 'హుక్: "ఈ సండే మంచి బిర్యానీ తినాలని ఉందా?" -> వేడి వేడి బిర్యానీ సీన్ -> ఆర్డర్ చేయండి!',
  },
  hi: {
    title: 'वीकेंड बिरयानी स्पेशल',
    headline:
      '✨ असली हैदराबादी जायका! इस रविवार फैमिली बिरयानी कॉम्बो पर पाएं फ्लैट 20% की भारी छूट।',
    whatsapp:
      '👋 नमस्ते! क्या इस संडे फैमिली के साथ स्वादिष्ट बिरयानी प्लान कर रहे हैं? अभी ऑर्डर करें और 20% छूट पाएं!',
    reel: 'हुक: "इस संडे असली हैदराबादी बिरयानी कहां मिलेगी?" -> गरमा-गरम बिरयानी सीन -> अभी ऑर्डर करें!',
  },
  hinglish: {
    title: 'Weekend Biryani Special',
    headline:
      '✨ Sunday ko biryani toh banti hai! Get authentic Hyderabadi taste with flat 20% OFF on family combos.',
    whatsapp:
      '👋 Hi! Sunday family lunch ka kya plan hai? Order Bawarchi Biryani online and claim flat 20% OFF!',
    reel: 'Hook: "Sunday lunch dull lag raha hai?" -> Cut to steaming handi biryani -> CTA: Abhi order karo!',
  },
  tenglish: {
    title: 'Weekend Biryani Feast',
    headline:
      '✨ Real Hyderabadi Dum Biryani taste ikkada matrame! Order Sunday combo and get 20% OFF instantly.',
    whatsapp:
      '👋 Hi [Name]! Sunday family lunch ki biryani order chestunnara? Tap wa.me link for 20% discount coupon.',
    reel: 'Hook: "Best biryani in town try chesara?" -> Handi opening shot -> CTA: Click to order!',
  },
};

export function LanguageSection() {
  const reduceMotion = useReducedMotion();
  const [selectedLang, setSelectedLang] = useState<string>('te');

  const languages = [
    { id: 'en', code: 'EN', name: 'English', label: 'Standard English' },
    { id: 'te', code: 'తెలుగు', name: 'Telugu', label: 'Hyderabadi Telugu' },
    { id: 'hi', code: 'हिंदी', name: 'Hindi', label: 'Pure Hindi' },
    { id: 'hinglish', code: 'Hinglish', name: 'Hinglish', label: 'Hindi + English' },
    { id: 'tenglish', code: 'Tel + Eng', name: 'Tenglish', label: 'Telugu + English' },
  ];

  const currentCopy: CopyContent = copyExamples[selectedLang] ?? DEFAULT_COPY;

  return (
    <section className="bg-bg-secondary py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="bg-brand-50 text-brand-700 border-brand-100 rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase">
            Regional Dialects & Localization
          </span>
          <h2 className="text-text-primary mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            Speak to customers the way they speak.
          </h2>
          <p className="text-text-secondary mx-auto mt-4 max-w-2xl text-base sm:text-lg">
            Mitra writes for local customers in English and Hinglish, with Telugu, Hindi and
            Tenglish in beta. The examples below are samples of the style, not guaranteed output;
            always read your campaign before you share it.
          </p>
        </div>

        {/* Language Selection Chips */}
        <div className="mt-10 flex flex-wrap justify-center gap-2 sm:gap-3">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setSelectedLang(lang.id)}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
                selectedLang === lang.id
                  ? 'bg-brand-600 shadow-brand-500/20 scale-105 text-white shadow-md'
                  : 'bg-surface border-border-light text-text-secondary hover:border-brand-500 hover:text-text-primary border'
              }`}
            >
              {lang.code}{' '}
              <span className="ml-1 text-xs font-normal opacity-80">({lang.label})</span>
            </button>
          ))}
        </div>

        {/* Live Preview Display Box */}
        <div className="border-border-light bg-surface mx-auto mt-10 max-w-4xl rounded-3xl border p-6 shadow-xl sm:p-8">
          <div className="border-border-light flex items-center justify-between border-b pb-4">
            <div>
              <span className="text-brand-600 text-xs font-bold tracking-wider uppercase">
                Selected Language: {languages.find((l) => l.id === selectedLang)?.label}
              </span>
              <h3 className="text-text-primary mt-1 text-xl font-bold">{currentCopy.title}</h3>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              ✓ Culturally Verified
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedLang}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mt-6 grid gap-6 md:grid-cols-3"
            >
              <div className="border-border-light bg-bg-primary space-y-2 rounded-2xl border p-5">
                <span className="text-brand-600 text-xs font-bold tracking-wider uppercase">
                  📸 Social Caption
                </span>
                <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
                  {currentCopy.headline}
                </p>
              </div>

              <div className="border-border-light bg-bg-primary space-y-2 rounded-2xl border p-5">
                <span className="text-xs font-bold tracking-wider text-emerald-600 uppercase">
                  💬 WhatsApp Message
                </span>
                <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
                  {currentCopy.whatsapp}
                </p>
              </div>

              <div className="border-border-light bg-bg-primary space-y-2 rounded-2xl border p-5">
                <span className="text-xs font-bold tracking-wider text-purple-600 uppercase">
                  🎥 Reel Script
                </span>
                <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
                  {currentCopy.reel}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
