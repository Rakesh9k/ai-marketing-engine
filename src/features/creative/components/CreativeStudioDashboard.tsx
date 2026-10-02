'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import {
  businessService,
  campaignAssetService,
  subscriptionService,
  usageService,
} from '@/services/database';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/mascot/Mascot';
import type { Business, CampaignAsset } from '@/types';
import { CREATIVE_FORMATS, POPULAR_TEMPLATES } from '../constants';
import { PageSkeleton } from '@/components/motion/PageSkeleton';
import type { CreativeFormat } from '../types';

interface CreativeStudioDashboardProps {
  userId: string;
}

export function CreativeStudioDashboard({ userId }: CreativeStudioDashboardProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [assets, setAssets] = useState<CampaignAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(320);

  const [activeFormat, setActiveFormat] = useState<CreativeFormat | 'all'>('all');
  const [magicPrompt, setMagicPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const business = useMemo(
    () => businesses.find((b) => b.businessId === businessId) || businesses[0] || null,
    [businesses, businessId]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const bList = await businessService.getByUserId(userId);
        if (cancelled) return;
        setBusinesses(bList);
        if (bList.length > 0) {
          const selectedId = bList[0]!.businessId;
          setBusinessId(selectedId);

          const [assetList, subscription, usage] = await Promise.all([
            campaignAssetService.listByBusiness(selectedId).catch(() => []),
            subscriptionService.getByUserId(userId).catch(() => null),
            usageService.getCurrentPeriod(userId).catch(() => null),
          ]);
          if (!cancelled) {
            setAssets(assetList);
            const included = subscription?.creditsIncluded ?? 500;
            const used = usage?.creditsUsed ?? 180;
            setCreditsRemaining(included - used);
          }
        }
      } catch (err) {
        console.error('Failed to load Creative Studio data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleMagicGenerate = () => {
    if (!magicPrompt.trim()) return;
    setIsGenerating(true);
    // Route to image or poster generator with pre-filled prompt query
    setTimeout(() => {
      router.push(`/creative/image?prompt=${encodeURIComponent(magicPrompt)}`);
    }, 600);
  };

  const filteredTemplates = useMemo(() => {
    if (activeFormat === 'all') return POPULAR_TEMPLATES;
    return POPULAR_TEMPLATES.filter((t) => t.format === activeFormat);
  }, [activeFormat]);

  if (loading) {
    return <PageSkeleton variant="cards" />;
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 text-slate-900 sm:p-6 dark:text-slate-100">
      {/* Top Header & Workspace Bar */}
      <div className="flex flex-col gap-4 border-b border-slate-200/60 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-lg font-bold text-amber-600">
            ✨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Creative Studio
              </h1>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                Your AI Creative Department
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create scroll-stopping posts, posters, reels and videos tailored to your business.
            </p>
          </div>
        </div>

        {/* Business Selector & Credits pill */}
        <div className="flex items-center gap-3">
          {businesses.length > 0 && (
            <select
              value={businessId || ''}
              onChange={(e) => setBusinessId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xs focus:border-amber-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              {businesses.map((b) => (
                <option key={b.businessId} value={b.businessId}>
                  {b.name} ({b.location.city})
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-300">
            <span>⚡</span>
            <span>
              {creditsRemaining !== null ? `${creditsRemaining} / 500 Credits` : '320 Credits'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Studio Hub (8 cols) & Right Studio Panel (4 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* HERO BANNER matching reference media_1790864090616.jpg */}
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-950/20 p-6 shadow-sm sm:p-8">
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-12">
              <div className="space-y-4 md:col-span-7">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  📍 Creative Studio
                </span>
                <h2 className="text-2xl leading-tight font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  Turn Your Ideas into <br />
                  <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
                    Stunning Creations
                  </span>
                </h2>
                <p className="text-xs text-slate-600 sm:text-sm dark:text-slate-300">
                  From eye-catching posters to scroll-stopping reels — create professional marketing
                  content in minutes without prompt engineering.
                </p>

                {/* Feature Pill Tags */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/50 bg-white/80 px-2.5 py-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
                    ⚙️ AI-Powered Designs
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/50 bg-white/80 px-2.5 py-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
                    🏛️ Local Language Support
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/50 bg-white/80 px-2.5 py-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80">
                    🍱 Brand Consistent Templates
                  </span>
                </div>
              </div>

              {/* Mascot & Creative Graphic Area */}
              <div className="relative flex min-h-[180px] items-center justify-center md:col-span-5">
                <Mascot state="designer" size="xl" glow shadow animated priority />

                {/* Orbiting creative badge preview */}
                <motion.div
                  initial={reduceMotion ? {} : { scale: 0.9, y: 5 }}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                  className="absolute -top-2 -left-2 rounded-xl border border-amber-500/30 bg-white p-2 text-[10px] font-bold text-amber-600 shadow-lg dark:bg-slate-900 dark:text-amber-400"
                >
                  🔥 20% OFF Special
                </motion.div>
                <motion.div
                  initial={reduceMotion ? {} : { scale: 0.9 }}
                  animate={{ y: [0, 6, 0] }}
                  transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
                  className="absolute -right-2 -bottom-2 rounded-xl border border-slate-800 bg-slate-900 p-2 text-[10px] font-medium text-white shadow-lg"
                >
                  🎬 9:16 Reel Ready
                </motion.div>
              </div>
            </div>
          </div>

          {/* Format Filter Bar */}
          <div className="flex scrollbar-none items-center gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setActiveFormat('all')}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeFormat === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              All Formats
            </button>
            {CREATIVE_FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setActiveFormat(f.value)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  activeFormat === f.value
                    ? 'bg-amber-500 font-semibold text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Create Studio Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 uppercase dark:text-white">
                ⚡ Quick Create
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Jump into popular formats or start from a template
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Image Generator Card */}
              <Link href="/creative/image" className="group">
                <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-lg font-bold text-orange-600">
                        🖼️
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-amber-500 dark:text-white">
                          Image Generator
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Product & lifestyle imagery
                        </p>
                      </div>
                    </div>
                    <div className="relative mt-3 h-28 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80"
                        alt="Image Generator"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Poster Generator Card */}
              <Link href="/creative/poster" className="group">
                <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-lg font-bold text-pink-600">
                        🎨
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-amber-500 dark:text-white">
                          Poster Generator
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Offers, festivals & events
                        </p>
                      </div>
                    </div>
                    <div className="relative mt-3 flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-900 p-3 text-center">
                      <div className="space-y-1">
                        <span className="rounded bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-slate-950 uppercase">
                          WEEKEND SPECIAL
                        </span>
                        <h5 className="text-xs leading-tight font-black text-white">
                          Chicken Biryani 20% OFF
                        </h5>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Social Post Card */}
              <Link href="/creative/image?type=post" className="group">
                <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-lg font-bold text-amber-600">
                        📱
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-amber-500 dark:text-white">
                          Social Post
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Ready-to-post social media
                        </p>
                      </div>
                    </div>
                    <div className="relative mt-3 h-28 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80"
                        alt="Social Post"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Reel Generator Card */}
              <Link href="/creative/reel" className="group">
                <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-lg font-bold text-purple-600">
                        🎬
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-amber-500 dark:text-white">
                          Reel Generator
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Viral short video storyboards
                        </p>
                      </div>
                    </div>
                    <div className="relative mt-3 flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-950">
                      <div className="p-2 text-center">
                        <span className="text-xl">▶️</span>
                        <p className="mt-1 text-[10px] font-medium text-slate-300">
                          &quot;Biryani is always a good idea!&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Video Generator Card */}
              <Link href="/creative/video" className="group">
                <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-lg font-bold text-red-600">
                        📹
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-amber-500 dark:text-white">
                          Video Showcase
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Promotional video motion
                        </p>
                      </div>
                    </div>
                    <div className="relative mt-3 h-28 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80"
                        alt="Video Showcase"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Creative Templates Card */}
              <Link href="/creative/templates" className="group">
                <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-lg font-bold text-emerald-600">
                        📑
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-amber-500 dark:text-white">
                          Creative Templates
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Browse ready-to-use templates
                        </p>
                      </div>
                    </div>
                    <div className="relative mt-3 flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-3 text-center">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                        Explore 50+ Business Templates →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Need Something Else Callout with Cheering Mascot */}
          <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-orange-500/10 p-5 sm:flex-row sm:p-6">
            <div className="flex items-center gap-4">
              <Mascot state="proud" size="md" shadow animated />
              <div>
                <span className="text-[10px] font-bold tracking-wider text-purple-600 uppercase dark:text-purple-400">
                  ✨ Need something else?
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Try our AI Assistant to create custom designs or explore more formats.
                </h4>
              </div>
            </div>
            <Link href="/assistant" className="shrink-0">
              <Button className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:from-amber-600 hover:to-orange-600">
                Chat with Mitra →
              </Button>
            </Link>
          </div>

          {/* Popular Templates Showcase Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  Popular Templates
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Start with a professionally designed template and make it your own.
                </p>
              </div>
              <Link
                href="/creative/templates"
                className="text-xs font-bold text-amber-600 hover:underline dark:text-amber-400"
              >
                View all templates →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filteredTemplates.map((t) => (
                <div
                  key={t.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.previewUrl}
                      alt={t.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {t.badge && (
                      <span className="absolute top-2 left-2 rounded-md bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-slate-950 uppercase shadow-xs">
                        {t.badge}
                      </span>
                    )}

                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 p-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="sm"
                        onClick={() => router.push(`/creative/poster?templateId=${t.id}`)}
                        className="bg-white text-xs font-bold text-slate-950 shadow-lg hover:bg-slate-100"
                      >
                        Adapt to Business
                      </Button>
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {t.name}
                    </p>
                    <span className="text-[10px] text-slate-500 capitalize dark:text-slate-400">
                      {t.format.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR (4 cols) matching reference media_1790864090616.jpg */}
        <div className="space-y-6 lg:col-span-4">
          {/* AI Creative Magic Input Widget */}
          <div className="space-y-4 rounded-3xl border border-amber-500/20 bg-white p-5 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <span className="text-xl">🪄</span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  AI Creative Magic
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Describe what you want, and we&apos;ll create it for you.
                </p>
              </div>
            </div>

            <textarea
              value={magicPrompt}
              onChange={(e) => setMagicPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. Create a poster for weekend biryani offer in Hyderabadi style..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="cursor-pointer hover:text-amber-500">📷</span>
                <span className="cursor-pointer hover:text-amber-500">📎</span>
              </div>
              <Button
                onClick={handleMagicGenerate}
                loading={isGenerating}
                disabled={!magicPrompt.trim() || isGenerating}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-bold text-slate-950 hover:from-amber-600 hover:to-orange-600"
              >
                Generate
              </Button>
            </div>
          </div>

          {/* Recent Creations List */}
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Creations</h3>
              <Link
                href="/campaigns"
                className="text-xs font-bold text-amber-600 hover:underline dark:text-amber-400"
              >
                View all →
              </Link>
            </div>

            <div className="space-y-3">
              {assets.length > 0 ? (
                assets.slice(0, 4).map((a) => (
                  <div
                    key={a.assetId}
                    onClick={() => router.push(`/creative/${a.assetId}`)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                      {(a.imageUrl || a.thumbnailUrl) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.imageUrl || a.thumbnailUrl}
                          alt={a.type}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        {a.type.toUpperCase()}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  </div>
                ))
              ) : (
                /* Pre-populated sample recent creations matching screenshot */
                <>
                  <div
                    onClick={() => router.push('/creative/image')}
                    className="flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&auto=format&fit=crop&q=80"
                        alt="Weekend Special"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        Weekend Special - Chicken Biryani
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Poster · 2 hours ago
                      </p>
                    </div>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  </div>

                  <div
                    onClick={() => router.push('/creative/image')}
                    className="flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80"
                        alt="New Branch Opening"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        New Branch Opening Announcement
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Social Post · 5 hours ago
                      </p>
                    </div>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  </div>

                  <div
                    onClick={() => router.push('/creative/reel')}
                    className="flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&auto=format&fit=crop&q=80"
                        alt="Monsoon Special Reel"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        Monsoon Special Biryani Reel
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Reel · 1 day ago
                      </p>
                    </div>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Unlock More Creativity Upgrade Card */}
          <div className="space-y-3 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/15 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
              👑 Unlock More Creativity
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Get access to premium templates, advanced AI models, and exclusive video formats.
            </p>
            <Link href="/billing" className="block">
              <Button className="w-full rounded-xl bg-amber-500 py-2 text-xs font-bold text-slate-950 hover:bg-amber-600">
                View Plans →
              </Button>
            </Link>
          </div>

          {/* Mascot Sidebar Footer Card matching reference media_1790864090616.jpg */}
          <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-950/10 p-4 dark:border-slate-800">
            <div className="max-w-[160px] space-y-1">
              <h5 className="text-xs leading-tight font-extrabold text-slate-900 dark:text-white">
                Small input. <br />
                <span className="text-amber-600 dark:text-amber-400">Big results.</span>
              </h5>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">— Mitra by Brainwise</p>
            </div>
            <Mascot state="curious" size="sm" animated />
          </div>
        </div>
      </div>
    </div>
  );
}
