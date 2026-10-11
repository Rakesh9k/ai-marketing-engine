'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { Mascot } from '@/components/mascot/Mascot';

interface OptionItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  badge?: string;
  href: string;
  previewImage: string;
  previewTag: string;
  previewHeading: string;
}

const CREATION_OPTIONS: OptionItem[] = [
  {
    id: 'campaign',
    title: 'Full Campaign Pack',
    subtitle: 'One photo + offer → complete campaign pack (Post, Copy, Reel, WhatsApp).',
    icon: '🎯',
    badge: 'Recommended',
    href: '/campaigns/new',
    previewImage:
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    previewTag: 'Full Campaign',
    previewHeading: 'Monsoon Special Biryani Offer',
  },
  {
    id: 'reel',
    title: 'Short Video Reel',
    subtitle: 'Engaging 15-second video reels tailored for Instagram & YouTube.',
    icon: '🎬',
    badge: 'Trending',
    href: '/reels/new',
    previewImage:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
    previewTag: 'Instagram Reel',
    previewHeading: 'Beauty Salon Promo Reel',
  },
];

export default function CreatePage() {
  const [selectedId, setSelectedId] = useState<string>('campaign');
  const reduceMotion = useReducedMotion();

  const selectedOption = CREATION_OPTIONS.find((o) => o.id === selectedId) || CREATION_OPTIONS[0]!;

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-4 sm:px-6 lg:px-8">
        {/* Header Title Banner */}
        <div className="mx-auto max-w-2xl space-y-2 text-center">
          <span className="font-serif text-base font-semibold text-[#E84D1A] italic">
            ✨ What would you like Mitra to create today?
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-[#1A1A1E] sm:text-4xl">
            Quick Create Launcher
          </h1>
          <p className="text-sm leading-relaxed text-[#5C5C66] sm:text-base">
            Choose what type of content you need, and Mitra will guide you step-by-step.
          </p>
        </div>

        {/* 2-Column Selection & Interactive Live Preview Layout */}
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          {/* Left Column: Options Selector */}
          <div className="space-y-4 lg:col-span-7">
            {CREATION_OPTIONS.map((option) => {
              const isSelected = option.id === selectedId;

              return (
                <motion.div
                  key={option.id}
                  onMouseEnter={() => setSelectedId(option.id)}
                  onClick={() => setSelectedId(option.id)}
                  whileHover={reduceMotion ? undefined : { scale: 1.01 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                  className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-5 transition-all duration-200 ${
                    isSelected
                      ? 'border-[#E84D1A] bg-gradient-to-r from-orange-50/90 to-amber-50/90 shadow-md'
                      : 'border-[#F0EBE1] bg-white shadow-2xs hover:border-orange-200 hover:bg-orange-50/30'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                        isSelected
                          ? 'bg-[#E84D1A] text-white shadow-sm'
                          : 'bg-neutral-100 text-[#1A1A1E]'
                      }`}
                    >
                      <span>{option.icon}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#1A1A1E]">{option.title}</h3>
                        {option.badge && (
                          <span className="bg-brand-50 text-brand-600 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[#5C5C66] sm:text-sm">
                        {option.subtitle}
                      </p>
                    </div>
                  </div>

                  <Link href={option.href} className="shrink-0">
                    <button
                      className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                        isSelected
                          ? 'bg-[#E84D1A] text-white hover:bg-[#d04113]'
                          : 'bg-neutral-100 text-[#1A1A1E] hover:bg-neutral-200'
                      }`}
                    >
                      Create &rarr;
                    </button>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Right Column: Live Visual Preview Card */}
          <div className="flex flex-col lg:col-span-5">
            <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-[#F0EBE1] bg-white p-6 shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-[#757580] uppercase">
                    Interactive Preview
                  </span>
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-[#E84D1A]">
                    {selectedOption.previewTag}
                  </span>
                </div>

                {/* Preview Image Card */}
                <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
                  <Image
                    src={selectedOption.previewImage}
                    alt={selectedOption.previewHeading}
                    fill
                    className="object-cover transition-all duration-500"
                    sizes="(max-width: 640px) 100vw, 400px"
                  />
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5 text-white">
                    <span className="text-xs font-semibold text-orange-300">
                      Sample Result Preview
                    </span>
                    <h4 className="mt-1 text-lg font-bold text-white">
                      {selectedOption.previewHeading}
                    </h4>
                  </div>
                </div>

                {/* Mascot Scene Description */}
                <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-3.5">
                  <Mascot state="creating" size="sm" animated />
                  <p className="text-xs leading-snug text-[#5C5C66]">
                    <strong className="text-[#1A1A1E]">Mitra is ready!</strong> Click create to
                    start crafting your {selectedOption.title.toLowerCase()}.
                  </p>
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="pt-4">
                <Link href={selectedOption.href} className="block w-full">
                  <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E84D1A] px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-[#d04113]">
                    <span>Start Creating {selectedOption.title} →</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
