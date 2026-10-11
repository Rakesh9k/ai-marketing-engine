'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface VideoGeneratorStudioProps {
  userId: string;
}

export function VideoGeneratorStudio({ userId: _userId }: VideoGeneratorStudioProps) {
  const [duration, setDuration] = useState('15');
  const [aspectRatio, setAspectRatio] = useState('16:9');

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
          Video Showcase Studio
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900 dark:border-slate-800 dark:text-white">
              Promotional Video Settings
            </h3>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="15">15 Seconds (Short promo)</option>
                <option value="30">30 Seconds (Standard showcase)</option>
                <option value="60">60 Seconds (Full business feature)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="16:9">16:9 Landscape (YouTube / Web)</option>
                <option value="9:16">9:16 Vertical (Stories / Reels)</option>
                <option value="1:1">1:1 Square (Feed)</option>
              </select>
            </div>

            <Button className="w-full rounded-xl bg-red-600 py-3 text-xs font-bold text-white hover:bg-red-700">
              Generate Video Motion Showcase
            </Button>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-7">
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-950 p-6 text-center text-white shadow-xl">
            <span className="mb-3 text-4xl">📹</span>
            <h4 className="text-base font-bold">Video Renderer Ready</h4>
            <p className="mt-1 max-w-sm text-xs text-slate-400">
              Mitra generates dynamic motion previews using AI video templates and your uploaded
              product catalog images.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
