'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';

interface VideoGeneratorStudioProps {
  userId: string;
}

export function VideoGeneratorStudio({ userId }: VideoGeneratorStudioProps) {
  const [duration, setDuration] = useState('15');
  const [aspectRatio, setAspectRatio] = useState('16:9');

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 text-slate-900 dark:text-slate-100">
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/creative" className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
          ← Creative Studio
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Video Showcase Studio
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Promotional Video Settings
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs"
              >
                <option value="15">15 Seconds (Short promo)</option>
                <option value="30">30 Seconds (Standard showcase)</option>
                <option value="60">60 Seconds (Full business feature)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs"
              >
                <option value="16:9">16:9 Landscape (YouTube / Web)</option>
                <option value="9:16">9:16 Vertical (Stories / Reels)</option>
                <option value="1:1">1:1 Square (Feed)</option>
              </select>
            </div>

            <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3 rounded-xl">
              Generate Video Motion Showcase
            </Button>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl flex flex-col items-center justify-center min-h-[360px] text-center text-white">
            <span className="text-4xl mb-3">📹</span>
            <h4 className="font-bold text-base">Video Renderer Ready</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Mitra generates dynamic motion previews using AI video templates and your uploaded product catalog images.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
