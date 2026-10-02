'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

export function ReelGeneratorStudio({ userId }: ReelGeneratorStudioProps) {
  const [prompt, setPrompt] = useState('Show biryani preparation from cooking to final family table reveal');
  const [scenes, setScenes] = useState<ReelScene[]>(DEFAULT_STORYBOARD);
  const [activeSceneId, setActiveSceneId] = useState<string>('sc_1');

  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 text-slate-900 dark:text-slate-100">
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/creative" className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
          ← Creative Studio
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Reel Director Studio
        </h1>
        <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400 border border-purple-500/20">
          🎬 AI Director Workspace
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Storyboard Sequence Timeline (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Conceptual Storyboard Timeline
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mitra mapped your idea into a 4-scene high-converting Reel sequence.
                </p>
              </div>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs">
                + Add Scene
              </Button>
            </div>

            <div className="space-y-3">
              {scenes.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setActiveSceneId(s.id)}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                    s.id === activeSceneId
                      ? 'border-purple-500 bg-purple-500/5 shadow-sm ring-1 ring-purple-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                      {s.title} ({s.timing})
                    </span>
                    <span className="text-[10px] rounded-full bg-emerald-500/10 text-emerald-500 px-2 py-0.5 font-bold">
                      ✓ Ready
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                    {s.description}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                    {s.audioScript}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scene Director Details & Mascot Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-purple-500/20 bg-slate-950 p-5 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-purple-400">
                Scene {activeScene?.sceneNumber} Direction
              </h3>
              <span className="text-xs text-slate-400">{activeScene?.timing}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Visual Prompt</label>
                <textarea
                  value={activeScene?.visualPrompt || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScenes((prev) =>
                      prev.map((sc) => (sc.id === activeSceneId ? { ...sc, visualPrompt: val } : sc))
                    );
                  }}
                  rows={2}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Voiceover / Audio Script</label>
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

            <div className="pt-2 flex gap-2">
              <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs">
                Regenerate Scene {activeScene?.sceneNumber}
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-500/10 to-amber-500/10 p-4 flex items-center gap-4">
            <Mascot state="directing" size="sm" animated />
            <div className="text-xs">
              <span className="font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                Director Mitra
              </span>
              <p className="text-slate-700 dark:text-slate-300">
                &quot;This 12-second structure maximizes retention on Instagram Reels and YouTube Shorts!&quot;
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
