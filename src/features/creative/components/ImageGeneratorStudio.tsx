'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { businessService, productService } from '@/services/database';
import { Button } from '@/components/ui/Button';
import { MitraMark } from '@/components/ui/MitraMark';
import { Mascot } from '@/components/mascot/Mascot';
import type { Business, Product } from '@/types';
import { CREATIVE_FORMATS } from '../constants';
import type { CreativeFormat } from '../types';
import { useDraftAutoSave } from '@/hooks/useDraftAutoSave';
import { SideBySideHookABGenerator } from './SideBySideHookABGenerator';

interface ImageGeneratorStudioProps {
  userId: string;
}

interface ImageStudioDraftState {
  prompt: string;
  format: CreativeFormat;
  language: string;
  selectedProductId: string | null;
}

const INITIAL_IMAGE_DRAFT: ImageStudioDraftState = {
  prompt: 'Weekend family combo biryani offer',
  format: 'instagram_post',
  language: 'te_en',
  selectedProductId: null,
};

export function ImageGeneratorStudio({ userId }: ImageGeneratorStudioProps) {
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();

  const initialPrompt = searchParams.get('prompt') || '';

  const { draft, updateField, isRestored, clearDraft, dismissRestoredNotice, lastSavedAt } =
    useDraftAutoSave<ImageStudioDraftState>({
      draftKey: 'image-generator-studio',
      initialState: {
        ...INITIAL_IMAGE_DRAFT,
        prompt: initialPrompt || INITIAL_IMAGE_DRAFT.prompt,
      },
    });

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [refinementText, setRefinementText] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<number>(0);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80'
  );
  const [isRefining, setIsRefining] = useState(false);

  const business = useMemo(
    () => businesses.find((b) => b.businessId === businessId) || businesses[0] || null,
    [businesses, businessId]
  );

  const selectedProduct = useMemo(
    () => products.find((p) => p.productId === draft.selectedProductId) || null,
    [products, draft.selectedProductId]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const bList = await businessService.getByUserId(userId);
        if (cancelled) return;
        setBusinesses(bList);
        if (bList.length > 0) {
          const bId = bList[0]!.businessId;
          setBusinessId(bId);
          const pList = await productService.listByBusiness(bId).catch(() => []);
          if (!cancelled) setProducts(pList);
        }
      } catch (err) {
        console.error(err);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleGenerate = () => {
    if (!draft.prompt.trim()) return;
    setIsGenerating(true);
    setGenerationStep(1);

    const timer1 = setTimeout(() => setGenerationStep(2), 1200);
    const timer2 = setTimeout(() => setGenerationStep(3), 2400);
    const timer3 = setTimeout(() => {
      setGenerationStep(4);
      setIsGenerating(false);
      setGeneratedImageUrl(
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80'
      );
    }, 3600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  const handleRefine = () => {
    if (!refinementText.trim()) return;
    setIsRefining(true);
    setTimeout(() => {
      setIsRefining(false);
      setRefinementText('');
      setGeneratedImageUrl(
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80'
      );
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 text-slate-900 sm:p-6 dark:text-slate-100">
      {/* Restored Draft Auto-Save Notification */}
      {isRestored && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <span>💾</span>
            <span>
              <strong>Restored unsaved image studio draft!</strong>
              {lastSavedAt && (
                <span className="ml-1 text-[11px] opacity-75">
                  (Auto-saved at {lastSavedAt.toLocaleTimeString()})
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={dismissRestoredNotice}
              className="rounded-lg px-2.5 py-1 font-semibold hover:bg-amber-100 dark:hover:bg-amber-900"
            >
              Keep Draft
            </button>
            <button
              onClick={clearDraft}
              className="rounded-lg bg-amber-200 px-2.5 py-1 font-bold text-amber-950 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100"
            >
              Discard & Reset
            </button>
          </div>
        </div>
      )}

      {/* Studio Header Bar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/creative"
            className="text-xs font-bold text-amber-600 hover:underline dark:text-amber-400"
          >
            ← Creative Studio
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Image Generator Studio
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {lastSavedAt && (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">✓ Auto-saved</span>
          )}
          <span className="text-slate-500">Format:</span>
          <span className="font-semibold text-amber-500 uppercase">
            {CREATIVE_FORMATS.find((f) => f.value === draft.format)?.label || draft.format}
          </span>
        </div>
      </div>

      {/* Side-by-Side Hook A/B Generator */}
      <SideBySideHookABGenerator
        topicPrompt={draft.prompt}
        currentHeadline={draft.prompt}
        onSelectHook={(newHeadline) => updateField('prompt', newHeadline)}
      />

      {/* 3-Column Studio Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: Controls & Prompt Input */}
        <div className="space-y-5 lg:col-span-4">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                1. Creative Brief & Intent
              </h2>
              <MitraMark size="sm" decorative />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                What are you creating today?
              </label>
              <textarea
                value={draft.prompt}
                onChange={(e) => updateField('prompt', e.target.value)}
                rows={3}
                placeholder="e.g. Weekend family biryani combo discount with festive decor..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Format
              </label>
              <select
                value={draft.format}
                onChange={(e) => updateField('format', e.target.value as CreativeFormat)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                {CREATIVE_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.icon} {f.label} ({f.dimensions})
                  </option>
                ))}
              </select>
            </div>

            {/* Product Catalog Link */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Featured Product (Catalog)
              </label>
              <select
                value={draft.selectedProductId || ''}
                onChange={(e) => updateField('selectedProductId', e.target.value || null)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">Auto-detect from Business Brain</option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.name} (₹{p.price})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Language & Dialect
              </label>
              <select
                value={draft.language}
                onChange={(e) => updateField('language', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="te_en">Telugu + English (Hyderabadi Style)</option>
                <option value="en">English (Professional)</option>
                <option value="te">Telugu (Pure Local)</option>
              </select>
            </div>

            <Button
              onClick={handleGenerate}
              loading={isGenerating}
              disabled={isGenerating || !draft.prompt.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-xs font-bold text-slate-950 shadow-md hover:from-amber-600 hover:to-orange-600"
            >
              {isGenerating ? 'Mitra is Designing...' : 'Create Image with Mitra'}
            </Button>
          </div>
        </div>

        {/* CENTER COLUMN: Large Visual Canvas Preview */}
        <div className="space-y-4 lg:col-span-5">
          <div className="flex min-h-[500px] flex-col justify-between rounded-3xl border border-slate-200 bg-slate-950 p-4 shadow-xl dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs text-slate-400">
              <span className="font-semibold tracking-wider text-amber-400 uppercase">
                Visual Canvas Preview
              </span>
              <span>1080 × 1080</span>
            </div>

            {/* Generated Image Preview */}
            <div className="relative my-2 flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <AnimatePresence mode="wait">
                <motion.img
                  key={generatedImageUrl}
                  src={generatedImageUrl}
                  alt="Generated Creative"
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3 }}
                  className="h-full w-full object-cover"
                />
              </AnimatePresence>

              {isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-slate-950/80 p-6 text-center backdrop-blur-md">
                  <MitraMark size="lg" state="loading" decorative />
                  <p className="text-xs font-bold text-amber-400">
                    {generationStep === 1 && 'Understanding brief & brand rules...'}
                    {generationStep === 2 && 'Crafting layout & composition...'}
                    {generationStep === 3 && 'Rendering high-resolution creative...'}
                    {generationStep === 4 && 'Finalizing image...'}
                  </p>
                </div>
              )}
            </div>

            {/* AI Refinement Input Area */}
            <div className="space-y-2 border-t border-slate-800 pt-2">
              <label className="block text-[11px] font-semibold text-slate-300">
                💬 AI Natural Refinement
              </label>
              <div className="flex gap-2">
                <input
                  value={refinementText}
                  onChange={(e) => setRefinementText(e.target.value)}
                  placeholder="e.g. Make headline shorter, make food warmer..."
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
                <Button
                  onClick={handleRefine}
                  loading={isRefining}
                  disabled={!refinementText.trim() || isRefining}
                  size="sm"
                  className="bg-amber-500 text-xs font-bold text-slate-950"
                >
                  Refine
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Mitra Business Context & Actions */}
        <div className="space-y-4 lg:col-span-3">
          {/* Mitra Context Card */}
          <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
              <span>🧠</span> Mitra Knows Your Business
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p>
                <strong className="text-slate-900 dark:text-white">Business:</strong>{' '}
                {business?.name || 'Hyderabad Biryani House'}
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Location:</strong>{' '}
                {business?.location?.city || 'Hyderabad'}
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Brand Voice:</strong> Friendly /
                Local / Playful
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Selected Product:</strong>{' '}
                {selectedProduct?.name || 'Special Family Biryani'}
              </p>
            </div>
          </div>

          {/* Mascot Guidance */}
          <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 dark:border-slate-800">
            <Mascot state="designer" size="sm" animated />
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              &quot;I&apos;ve aligned this visual with your Kondapur audience preferences!&quot;
            </p>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 pt-2">
            <Button className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">
              ✓ Approve & Use in Campaign
            </Button>
            <Button variant="outline" className="w-full rounded-xl py-2.5 text-xs">
              📥 Download High-Res
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
