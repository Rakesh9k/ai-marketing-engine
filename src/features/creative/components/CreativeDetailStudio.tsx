'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface CreativeDetailStudioProps {
  userId: string;
  creativeId: string;
}

export function CreativeDetailStudio({ userId: _userId, creativeId }: CreativeDetailStudioProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'preview' | 'copy' | 'versions'>('preview');
  const [isApproved, setIsApproved] = useState(false);

  const sampleTitle = 'Weekend Special - Chicken Biryani';
  const sampleCopy = {
    headline: 'Weekend Special Chicken Biryani 20% OFF',
    caption:
      'Satisfy your weekend biryani cravings! Enjoy authentic Hyderabadi Dum Biryani with 20% OFF on all family orders at Kondapur Biryani House. Order now on WhatsApp!',
    hashtags: ['#HyderabadBiryani', '#WeekendOffer', '#KondapurEats', '#BiryaniLovers'],
    whatsappCopy:
      'Hi Kondapur Biryani House! I would like to order the Weekend Special Biryani Combo (20% OFF).',
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 text-slate-900 sm:p-6 dark:text-slate-100">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <Link
          href="/creative"
          className="text-xs font-bold text-amber-600 hover:underline dark:text-amber-400"
        >
          ← Creative Studio
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {sampleTitle}
        </h1>
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500">
          {isApproved ? '✓ Approved' : '● Ready for Review'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Visual Preview Hero (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
            <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80"
                alt="Creative Hero Preview"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => setIsApproved(true)}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold shadow-md ${
                  isApproved
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:from-amber-600 hover:to-orange-600'
                }`}
              >
                {isApproved ? '✓ Creative Approved' : 'Approve Creative'}
              </Button>

              <Button
                onClick={() => router.push(`/campaigns/new?creativeId=${creativeId}`)}
                className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-700"
              >
                Use in Campaign →
              </Button>
            </div>
          </div>
        </div>

        {/* Right Details & Copy Tabs (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex gap-4 border-b border-slate-100 text-xs font-bold dark:border-slate-800">
              <button
                onClick={() => setActiveTab('preview')}
                className={`pb-2 ${
                  activeTab === 'preview'
                    ? 'border-b-2 border-amber-500 text-amber-500'
                    : 'text-slate-400'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('copy')}
                className={`pb-2 ${
                  activeTab === 'copy'
                    ? 'border-b-2 border-amber-500 text-amber-500'
                    : 'text-slate-400'
                }`}
              >
                Marketing Copy
              </button>
              <button
                onClick={() => setActiveTab('versions')}
                className={`pb-2 ${
                  activeTab === 'versions'
                    ? 'border-b-2 border-amber-500 text-amber-500'
                    : 'text-slate-400'
                }`}
              >
                Versions (v3)
              </button>
            </div>

            {activeTab === 'preview' && (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p>
                  <strong className="text-slate-900 dark:text-white">Format:</strong> Instagram Post
                  (1080 × 1080)
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-white">Headline:</strong>{' '}
                  {sampleCopy.headline}
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-white">Brand Dialect:</strong> Telugu
                  + English (Hyderabadi Style)
                </p>
              </div>
            )}

            {activeTab === 'copy' && (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="mb-1 block font-semibold text-slate-400">Social Caption:</span>
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    {sampleCopy.caption}
                  </p>
                </div>
                <div>
                  <span className="mb-1 block font-semibold text-slate-400">Hashtags:</span>
                  <p className="font-mono text-[11px] text-amber-500">
                    {sampleCopy.hashtags.join(' ')}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'versions' && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5">
                  <span className="font-bold text-amber-600 dark:text-amber-400">v3 (Current)</span>
                  <span className="text-[10px] text-slate-400">2 hours ago</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 opacity-70 dark:border-slate-800">
                  <span>v2 (Shorter Headline)</span>
                  <span className="text-[10px] text-slate-400">4 hours ago</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 opacity-70 dark:border-slate-800">
                  <span>v1 (Original)</span>
                  <span className="text-[10px] text-slate-400">Yesterday</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
