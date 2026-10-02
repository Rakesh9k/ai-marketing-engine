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
    previewImage: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
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
    previewImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
    previewTag: 'Instagram Reel',
    previewHeading: 'Beauty Salon Promo Reel',
  },
  {
    id: 'poster',
    title: 'Design Poster',
    subtitle: 'Stunning posters and banners formatted for print and social feeds.',
    icon: '🎨',
    href: '/creative',
    previewImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
    previewTag: 'Digital Poster',
    previewHeading: 'Luxury Living Homes Showcase',
  },
  {
    id: 'copy',
    title: 'Instant Marketing Copy',
    subtitle: 'AI copy generated in local languages (English, Hindi, Telugu, Tamil).',
    icon: '✍️',
    href: '/content',
    previewImage: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
    previewTag: 'Regional Copy',
    previewHeading: 'Special Thali Festival Copy',
  },
];

export default function CreatePage() {
  const [selectedId, setSelectedId] = useState<string>('campaign');
  const reduceMotion = useReducedMotion();

  const selectedOption =
    CREATION_OPTIONS.find((o) => o.id === selectedId) || CREATION_OPTIONS[0]!;

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-4 sm:px-6 lg:px-8">
        {/* Header Title Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="font-serif italic text-base text-[#E84D1A] font-semibold">
            ✨ What would you like Mitra to create today?
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1A1E] tracking-tight">
            Quick Create Launcher
          </h1>
          <p className="text-sm sm:text-base text-[#5C5C66] leading-relaxed">
            Choose what type of content you need, and Mitra will guide you step-by-step.
          </p>
        </div>

        {/* 2-Column Selection & Interactive Live Preview Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Options Selector */}
          <div className="lg:col-span-7 space-y-4">
            {CREATION_OPTIONS.map((option) => {
              const isSelected = option.id === selectedId;

              return (
                <motion.div
                  key={option.id}
                  onMouseEnter={() => setSelectedId(option.id)}
                  onClick={() => setSelectedId(option.id)}
                  whileHover={reduceMotion ? undefined : { scale: 1.01 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                  className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-50/90 to-amber-50/90 border-[#E84D1A] shadow-md'
                      : 'bg-white border-[#F0EBE1] hover:border-orange-200 hover:bg-orange-50/30 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                      isSelected ? 'bg-[#E84D1A] text-white shadow-sm' : 'bg-neutral-100 text-[#1A1A1E]'
                    }`}>
                      <span>{option.icon}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#1A1A1E]">{option.title}</h3>
                        {option.badge && (
                          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-[#5C5C66] leading-relaxed">
                        {option.subtitle}
                      </p>
                    </div>
                  </div>

                  <Link href={option.href} className="shrink-0">
                    <button className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                      isSelected
                        ? 'bg-[#E84D1A] text-white hover:bg-[#d04113]'
                        : 'bg-neutral-100 text-[#1A1A1E] hover:bg-neutral-200'
                    }`}>
                      Create &rarr;
                    </button>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Right Column: Live Visual Preview Card */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="h-full rounded-3xl bg-white p-6 border border-[#F0EBE1] shadow-lg flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#757580] uppercase tracking-wider">
                    Interactive Preview
                  </span>
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-[#E84D1A]">
                    {selectedOption.previewTag}
                  </span>
                </div>

                {/* Preview Image Card */}
                <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-neutral-100 border border-neutral-200">
                  <Image
                    src={selectedOption.previewImage}
                    alt={selectedOption.previewHeading}
                    fill
                    className="object-cover transition-all duration-500"
                    sizes="(max-width: 640px) 100vw, 400px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5 flex flex-col justify-end text-white">
                    <span className="text-xs font-semibold text-orange-300">
                      Sample Result Preview
                    </span>
                    <h4 className="text-lg font-bold text-white mt-1">
                      {selectedOption.previewHeading}
                    </h4>
                  </div>
                </div>

                {/* Mascot Scene Description */}
                <div className="flex items-center gap-3 bg-orange-50/70 p-3.5 rounded-2xl border border-orange-100">
                  <Mascot state="creating" size="sm" animated />
                  <p className="text-xs text-[#5C5C66] leading-snug">
                    <strong className="text-[#1A1A1E]">Mitra is ready!</strong> Click create to start crafting your {selectedOption.title.toLowerCase()}.
                  </p>
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="pt-4">
                <Link href={selectedOption.href} className="block w-full">
                  <button className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#E84D1A] py-3.5 px-6 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-[#d04113] transition-all">
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
