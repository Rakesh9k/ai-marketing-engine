'use client';

import { useState } from 'react';
import { Mascot } from '@/components/mascot/Mascot';
import { MascotScene } from '@/components/mascot/MascotScene';
import { MASCOT_STATES, type MascotState, type MascotSize } from '@/components/mascot/mascotStates';
import type { MascotAnimationVariant } from '@/components/mascot/mascotAnimations';
import {
  BiryaniBowlIllustration,
  HairStylingIllustration,
  PropertyCardIllustration,
} from '@/components/illustrations/IndustryMotifs';
import { CampaignCard, InsightCard, SocialPostCard } from '@/components/mascot/FloatingCards';

const ALL_STATES: MascotState[] = [
  'idle',
  'curious',
  'proud',
  'confused',
  'creating',
  'designer',
  'analyzing',
  'discovering',
  'directing',
  'publishing',
  'problem-solver',
  'helper',
  'phone',
  'product',
  'thumbs-up',
  'surprised',
  'love',
  'rocket',
  'sleeping',
  'success',
  'sad',
  'laptop',
  'newspaper',
];

export default function MascotDevShowcasePage() {
  const [selectedState, setSelectedState] = useState<MascotState>('creating');
  const [selectedSize, setSelectedSize] = useState<MascotSize>('xl');
  const [selectedVariant, setSelectedVariant] = useState<MascotAnimationVariant>('floating');
  const [animated, setAnimated] = useState(true);
  const [shadow, setShadow] = useState(true);
  const [glow, setGlow] = useState(true);
  const [checkerboard, setCheckerboard] = useState(false);

  const activeMeta = MASCOT_STATES[selectedState];

  return (
    <div className="min-h-screen bg-neutral-950 p-6 font-sans text-white sm:p-10">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-neutral-800 pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#E84D1A]/10 px-3 py-1 text-xs font-semibold text-[#E84D1A]">
              Internal Development Suite
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              Mitra Mascot System & State Showcase
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Inspect PNG alpha transparency, aspect ratios, animation presets, and contextual state
              meanings.
            </p>
          </div>

          {/* Checkerboard toggle */}
          <button
            onClick={() => setCheckerboard(!checkerboard)}
            className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:bg-neutral-700"
          >
            {checkerboard ? '☀️ Solid Dark Bg' : '🏁 Transparency Grid'}
          </button>
        </div>

        {/* Interactive Testing Stage */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Controls Panel */}
          <div className="space-y-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6 lg:col-span-4">
            <h3 className="border-b border-neutral-800 pb-3 text-lg font-bold text-[#E84D1A]">
              Stage Controls
            </h3>

            {/* Size Selector */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-neutral-400">
                Mascot Size Token: <span className="text-white">{selectedSize}</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'hero'] as MascotSize[]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`rounded-lg border py-1.5 text-xs font-bold transition ${
                      selectedSize === sz
                        ? 'border-[#E84D1A] bg-[#E84D1A] text-white'
                        : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Variant Selector */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-neutral-400">
                Motion Preset: <span className="text-white">{selectedVariant}</span>
              </label>
              <select
                value={selectedVariant}
                onChange={(e) => setSelectedVariant(e.target.value as MascotAnimationVariant)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-xs text-white focus:border-[#E84D1A] focus:outline-none"
              >
                <option value="floating">floating (subtle drift)</option>
                <option value="breathing">breathing (subtle pulse)</option>
                <option value="popIn">popIn (spring entrance)</option>
                <option value="celebrate">celebrate (jump & tilt)</option>
                <option value="thinking">thinking (inner contemplation)</option>
                <option value="success">success (pop & scale)</option>
                <option value="error">error (gentle shake)</option>
                <option value="attention">attention (wiggle)</option>
                <option value="static">static (no motion)</option>
              </select>
            </div>

            {/* Toggle Switches */}
            <div className="space-y-3 pt-2">
              <label className="flex cursor-pointer items-center justify-between text-xs font-semibold text-neutral-300">
                <span>Animated</span>
                <input
                  type="checkbox"
                  checked={animated}
                  onChange={(e) => setAnimated(e.target.checked)}
                  className="h-4 w-4 accent-[#E84D1A]"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between text-xs font-semibold text-neutral-300">
                <span>Ground Shadow</span>
                <input
                  type="checkbox"
                  checked={shadow}
                  onChange={(e) => setShadow(e.target.checked)}
                  className="h-4 w-4 accent-[#E84D1A]"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between text-xs font-semibold text-neutral-300">
                <span>Ambient Orange Glow</span>
                <input
                  type="checkbox"
                  checked={glow}
                  onChange={(e) => setGlow(e.target.checked)}
                  className="h-4 w-4 accent-[#E84D1A]"
                />
              </label>
            </div>

            {/* Active State Metadata Card */}
            <div className="space-y-2 rounded-2xl border border-neutral-800/80 bg-neutral-950 p-4 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>State Key:</span>
                <span className="font-mono font-bold text-[#E84D1A]">{selectedState}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Raw Asset:</span>
                <span className="font-mono text-neutral-200">{activeMeta.src}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Native Resolution:</span>
                <span className="font-mono text-neutral-200">
                  {activeMeta.width} × {activeMeta.height} px
                </span>
              </div>
              <div className="border-t border-neutral-800 pt-2 text-neutral-300">
                <span className="mb-0.5 block text-neutral-500">Product Meaning:</span>
                <p className="leading-snug text-neutral-300">{activeMeta.meaning}</p>
              </div>
            </div>
          </div>

          {/* Main Stage Output */}
          <div className="space-y-6 lg:col-span-8">
            <div
              className={`relative flex min-h-[360px] items-center justify-center rounded-3xl border border-neutral-800 p-12 transition-all ${
                checkerboard
                  ? 'bg-neutral-900 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px]'
                  : 'bg-neutral-900'
              }`}
            >
              <Mascot
                state={selectedState}
                size={selectedSize}
                variant={selectedVariant}
                animated={animated}
                shadow={shadow}
                glow={glow}
                interactive
              />
            </div>

            {/* Composed MascotScene Preview */}
            <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
              <h4 className="mb-4 text-xs font-bold tracking-wider text-neutral-400 uppercase">
                Composed MascotScene Context
              </h4>
              <MascotScene
                state={selectedState}
                size="md"
                message={`Mitra is in "${selectedState}" state`}
                supporting={activeMeta.meaning}
                glow={glow}
                shadow={shadow}
              />
            </div>
          </div>
        </div>

        {/* All States Grid Inspection */}
        <div className="space-y-4 border-t border-neutral-800 pt-6">
          <h3 className="text-xl font-bold">All 23 Official Mascot States</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {ALL_STATES.map((st) => {
              const m = MASCOT_STATES[st];
              const isSelected = st === selectedState;
              return (
                <button
                  key={st}
                  onClick={() => setSelectedState(st)}
                  className={`relative flex flex-col items-center justify-between rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-[#E84D1A] bg-[#E84D1A]/10 ring-2 ring-[#E84D1A]/30'
                      : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex h-28 items-center justify-center py-2">
                    <Mascot state={st} size={90} animated={isSelected} shadow={false} />
                  </div>
                  <div className="w-full border-t border-neutral-800 pt-2 text-center">
                    <span className="block text-xs font-bold text-white capitalize">{st}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-neutral-400">
                      {m.width}x{m.height}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Floating Cards & Vertical Motifs Showcase */}
        <div className="space-y-6 border-t border-neutral-800 pt-6">
          <h3 className="text-xl font-bold">3D Floating Cards & Vertical Motifs</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <CampaignCard />
            <InsightCard />
            <SocialPostCard />
          </div>

          <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center gap-3">
              <BiryaniBowlIllustration size={40} />
              <span className="text-xs font-semibold text-neutral-300">Restaurant Motif</span>
            </div>
            <div className="flex items-center gap-3">
              <HairStylingIllustration size={40} />
              <span className="text-xs font-semibold text-neutral-300">Salon Motif</span>
            </div>
            <div className="flex items-center gap-3">
              <PropertyCardIllustration size={40} />
              <span className="text-xs font-semibold text-neutral-300">Real Estate Motif</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
