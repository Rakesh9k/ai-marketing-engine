'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { businessService, productService } from '@/services/database';
import { Button } from '@/components/ui/Button';
import { MitraMark } from '@/components/ui/MitraMark';
import { Mascot } from '@/components/mascot/Mascot';
import type { Business, Product } from '@/types';
import { CREATIVE_FORMATS } from '../constants';
import type { CreativeFormat } from '../types';

interface ImageGeneratorStudioProps {
  userId: string;
}

export function ImageGeneratorStudio({ userId }: ImageGeneratorStudioProps) {
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();

  const initialPrompt = searchParams.get('prompt') || '';

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [prompt, setPrompt] = useState(initialPrompt || 'Weekend family combo biryani offer');
  const [format, setFormat] = useState<CreativeFormat>('instagram_post');
  const [language, setLanguage] = useState('te_en');
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
    () => products.find((p) => p.productId === selectedProductId) || null,
    [products, selectedProductId]
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
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGenerationStep(1);

    const timer1 = setTimeout(() => setGenerationStep(2), 1200);
    const timer2 = setTimeout(() => setGenerationStep(3), 2400);
    const timer3 = setTimeout(() => {
      setGenerationStep(4);
      setIsGenerating(false);
      // Sample alternative image URL
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
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 text-slate-900 dark:text-slate-100">
      {/* Studio Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/creative" className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
            ← Creative Studio
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Image Generator Studio
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500">Format:</span>
          <span className="font-semibold text-amber-500 uppercase">
            {CREATIVE_FORMATS.find((f) => f.value === format)?.label || format}
          </span>
        </div>
      </div>

      {/* 3-Column Studio Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ============================================================ */}
        {/* LEFT COLUMN: Controls & Prompt Input (4 cols)                */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                1. Creative Brief & Intent
              </h2>
              <MitraMark size="sm" decorative />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                What are you creating today?
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. Weekend family biryani combo discount with festive decor..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as CreativeFormat)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:outline-none"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Featured Product (Catalog)
              </label>
              <select
                value={selectedProductId || ''}
                onChange={(e) => setSelectedProductId(e.target.value || null)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:outline-none"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Language & Dialect
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="te_en">Telugu + English (Hyderabadi Style)</option>
                <option value="en">English (Professional)</option>
                <option value="te">Telugu (Pure Local)</option>
              </select>
            </div>

            <Button
              onClick={handleGenerate}
              loading={isGenerating}
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-xs py-3 rounded-xl shadow-md"
            >
              {isGenerating ? 'Mitra is Designing...' : 'Create Image with Mitra'}
            </Button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CENTER COLUMN: Large Visual Canvas Preview (5 cols)           */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-4 shadow-xl flex flex-col justify-between min-h-[500px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
              <span className="font-semibold text-amber-400 uppercase tracking-wider">
                Visual Canvas Preview
              </span>
              <span>1080 × 1080</span>
            </div>

            {/* Generated Image Preview */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 aspect-square flex items-center justify-center border border-slate-800 my-2">
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
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3">
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
            <div className="space-y-2 pt-2 border-t border-slate-800">
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
                  className="bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Refine
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Mitra Business Context & Actions (3 cols)      */}
        {/* ============================================================ */}
        <div className="lg:col-span-3 space-y-4">
          {/* Mitra Context Card */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider">
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
                <strong className="text-slate-900 dark:text-white">Brand Voice:</strong> Friendly / Local / Playful
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Selected Product:</strong>{' '}
                {selectedProduct?.name || 'Special Family Biryani'}
              </p>
            </div>
          </div>

          {/* Mascot Guidance */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 flex items-center gap-3">
            <Mascot state="designer" size="sm" animated />
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              &quot;I&apos;ve aligned this visual with your Kondapur audience preferences!&quot;
            </p>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 pt-2">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl">
              ✓ Approve & Use in Campaign
            </Button>
            <Button variant="outline" className="w-full text-xs py-2.5 rounded-xl">
              📥 Download High-Res
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
