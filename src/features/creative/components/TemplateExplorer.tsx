'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { InteractiveCard } from '@/components/motion/InteractiveCard';
import { POPULAR_TEMPLATES } from '../constants';

interface TemplateExplorerProps {
  userId: string;
}

export function TemplateExplorer({ userId }: TemplateExplorerProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered =
    selectedCategory === 'all'
      ? POPULAR_TEMPLATES
      : POPULAR_TEMPLATES.filter((t) => t.category === selectedCategory);

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
          Creative Templates Library
        </h1>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['all', 'offer', 'festival', 'product', 'menu', 'announcement'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition-all ${
              selectedCategory === cat
                ? 'bg-amber-500 font-bold text-slate-950 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((t) => (
          <InteractiveCard
            key={t.id}
            bare
            maxTilt={5}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.previewUrl}
                alt={t.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {t.badge && (
                <span className="absolute top-2 left-2 rounded-md bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-slate-950 uppercase">
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
              <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{t.name}</p>
              <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-500 dark:text-slate-400">
                {t.description}
              </p>
            </div>
          </InteractiveCard>
        ))}
      </div>
    </div>
  );
}
