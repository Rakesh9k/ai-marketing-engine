'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/mascot/Mascot';
import type { ReelScene } from '../types';

interface ReelGeneratorStudioProps {
  userId: string;
}

const DEFAULT_STORYBOARD: ReelScene[] = [
  {
    id: 'sc_1',
    sceneNumber: 1,
    title: '01 HOOK',
    timing: '0–3 sec',
    description: 'Extreme close-up of steaming hot Dum Biryani coming out of the handi.',
    visualPrompt: 'Cinematic steam rising, saffron rice textures, gold lighting.',
    audioScript: '"Craving authentic Hyderabad Biryani this weekend?"',
    status: 'ready',
  },
  {
    id: 'sc_2',
    sceneNumber: 2,
    title: '02 BUILD-UP',
    timing: '3–6 sec',
    description: 'Slow motion pouring of rich mirchi ka salan and spicy gravy.',
    visualPrompt: 'Slow-motion splash, rich spices, warm dining ambience.',
    audioScript: '"Prepared fresh with traditional spices and tender meat."',
    status: 'ready',
  },
  {
    id: 'sc_3',
    sceneNumber: 3,
    title: '03 REVEAL',
    timing: '6–10 sec',
    description: 'Full family combo spread reveal with raita, drinks, and gulab jamun.',
    visualPrompt: 'Top-down hero table spread, vibrant colors, appetizing setup.',
    audioScript: '"Get the complete Family Combo at 20% OFF!"',
    status: 'ready',
  },
  {
    id: 'sc_4',
    sceneNumber: 4,
    title: '04 CALL TO ACTION',
    timing: '10–12 sec',
    description: 'WhatsApp order button animation & phone tap call to action.',
    visualPrompt: 'WhatsApp green badge overlay, Kondapur location text.',
    audioScript: '"Tap below to order directly on WhatsApp now!"',
    status: 'ready',
  },
];

export function ReelGeneratorStudio({ userId: _userId }: ReelGeneratorStudioProps) {
  const [_prompt, _setPrompt] = useState(
    'Show biryani preparation from cooking to final family table reveal'
  );
  const [scenes, setScenes] = useState<ReelScene[]>(DEFAULT_STORYBOARD);
  const [activeSceneId, setActiveSceneId] = useState<string>('sc_1');

  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];

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
          Reel Director Studio
        </h1>
        <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
          🎬 AI Director Workspace
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Storyboard Sequence Timeline (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Conceptual Storyboard Timeline
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mitra mapped your idea into a 4-scene high-converting Reel sequence.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-purple-600 text-xs font-bold text-white hover:bg-purple-700"
              >
                + Add Scene
              </Button>
            </div>

            <div className="space-y-3">
              {scenes.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setActiveSceneId(s.id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    s.id === activeSceneId
                      ? 'border-purple-500 bg-purple-500/5 shadow-sm ring-1 ring-purple-500/30'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-purple-600 uppercase dark:text-purple-400">
                      {s.title} ({s.timing})
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                      ✓ Ready
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                    {s.description}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 italic dark:text-slate-400">
                    {s.audioScript}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scene Director Details & Mascot Panel (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="space-y-4 rounded-3xl border border-purple-500/20 bg-slate-950 p-5 text-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-purple-400">
                Scene {activeScene?.sceneNumber} Direction
              </h3>
              <span className="text-xs text-slate-400">{activeScene?.timing}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-400">Visual Prompt</label>
                <textarea
                  value={activeScene?.visualPrompt || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScenes((prev) =>
                      prev.map((sc) =>
                        sc.id === activeSceneId ? { ...sc, visualPrompt: val } : sc
                      )
                    );
                  }}
                  rows={2}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-400">
                  Voiceover / Audio Script
                </label>
                <textarea
                  value={activeScene?.audioScript || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScenes((prev) =>
                      prev.map((sc) => (sc.id === activeSceneId ? { ...sc, audioScript: val } : sc))
                    );
                  }}
                  rows={2}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="flex-1 bg-brand-600 text-xs font-bold text-white hover:bg-brand-700"
              >
                Regenerate Scene {activeScene?.sceneNumber}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-3xl border border-amber-200/60 bg-gradient-to-r from-amber-50/60 via-orange-50/40 to-amber-50/60 p-4 dark:border-slate-800">
            <Mascot state="directing" size="sm" animated />
            <div className="text-xs">
              <span className="block font-bold tracking-wider text-brand-600 uppercase dark:text-brand-400">
                Director Mitra
              </span>
              <p className="text-slate-700 dark:text-slate-300">
                &quot;This 12-second structure maximizes retention on Instagram Reels and YouTube
                Shorts!&quot;
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
