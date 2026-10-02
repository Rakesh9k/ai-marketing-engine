'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';

interface PosterGeneratorStudioProps {
  userId: string;
}

export function PosterGeneratorStudio({ userId }: PosterGeneratorStudioProps) {
  const [headline, setHeadline] = useState('Weekend Biryani Feast');
  const [discountTag, setDiscountTag] = useState('20% OFF');
  const [price, setPrice] = useState('299');
  const [originalPrice, setOriginalPrice] = useState('349');
  const [terms, setTerms] = useState('Valid on dine-in & takeaway');
  const [ctaText, setCtaText] = useState('Order on WhatsApp 💬');

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 text-slate-900 dark:text-slate-100">
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/creative" className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
          ← Creative Studio
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Poster Generator Studio
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Form Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Poster Details & Copy
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Headline
              </label>
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Discount Tag
                </label>
                <input
                  value={discountTag}
                  onChange={(e) => setDiscountTag(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Offer Price (₹)
                </label>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Original Price (₹)
                </label>
                <input
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CTA Badge
                </label>
                <input
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Terms / Notes
              </label>
              <input
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Center Visual Live Poster Canvas */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl flex flex-col items-center justify-center">
            <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-amber-600/40 via-slate-900 to-black border border-slate-800 p-6 flex flex-col justify-between shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80"
                alt="Poster"
                className="absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-overlay"
              />

              <div className="relative z-10 self-start">
                <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-slate-950 uppercase tracking-wider">
                  {discountTag}
                </span>
              </div>

              <div className="relative z-10 bg-slate-950/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 space-y-2 text-white">
                <h3 className="font-extrabold text-lg leading-tight">{headline}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-extrabold text-xl">₹{price}</span>
                  {originalPrice && (
                    <span className="text-slate-400 line-through text-xs">₹{originalPrice}</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">{terms}</p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-amber-300 font-bold">
                  <span>{ctaText}</span>
                  <span className="text-slate-400 text-[10px]">Hyderabad Biryani House</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl">
                ✓ Approve Poster
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
