'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AssistantRecommendation } from '../types';
import { MitraMascot } from '@/components/mascot/MitraMascot';
import { Button } from '@/components/ui/Button';

const INITIAL_RECOMMENDATIONS: AssistantRecommendation[] = [
  {
    id: 'rec-1',
    category: 'opportunity',
    title: 'Diwali Festive Surge Opportunity',
    description:
      'Festive shopping activity in Hyderabad peaks in 4 days. Launch a 15% discount campaign for your top Biryani & Combo items.',
    actionLabel: '🚀 Create Diwali Campaign',
    actionUrl: '/campaigns/new',
    impactBadge: '+28% Estimated Revenue Surge',
  },
  {
    id: 'rec-2',
    category: 'urgent',
    title: 'Underperforming Item Boost: Mutton Haleem Special',
    description:
      'Catalog insights show "Mutton Haleem Special" had lower customer views this month. Create a poster with offer badge.',
    actionLabel: '🎨 Create Product Poster',
    actionUrl: '/creative/poster',
    impactBadge: 'Catalog Optimization',
  },
  {
    id: 'rec-3',
    category: 'followup',
    title: 'VIP Repeat Customer Re-engagement',
    description:
      'Send a personalized WhatsApp broadcast to 120 repeat customers with a complimentary dessert code.',
    actionLabel: '💬 Draft WhatsApp Broadcast',
    actionUrl: '/assistant',
    impactBadge: 'Customer Retention',
  },
  {
    id: 'rec-4',
    category: 'brain',
    title: 'Complete Brand Tone in Business Brain',
    description:
      'Your Business Brain voice is missing local Telugu / English greeting preference. Completing this unlocks better captions.',
    actionLabel: '🧠 Update Business Brain',
    actionUrl: '/business/voice',
    impactBadge: 'AI Accuracy +15%',
  },
];

export function AssistantRecommendationsView() {
  const [recs, setRecs] = useState<AssistantRecommendation[]>(INITIAL_RECOMMENDATIONS);

  const handleDismiss = (id: string) => {
    setRecs((prev) => prev.map((r) => (r.id === id ? { ...r, dismissed: true } : r)));
  };

  const activeRecs = recs.filter((r) => !r.dismissed);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="bg-brand-100 border-brand-200 flex h-12 w-12 items-center justify-center rounded-2xl border">
            <MitraMascot pose="idea" size="md" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                Proactive Recommendations
              </h1>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                {activeRecs.length} Active Insights
              </span>
            </div>
            <p className="text-xs font-medium text-neutral-500">
              Mitra continuously analyzes your products, Business Brain, and seasonal trends to
              suggest revenue opportunities.
            </p>
          </div>
        </div>

        <Link href="/assistant">
          <Button className="rounded-xl font-bold">Ask Mitra Custom Strategy</Button>
        </Link>
      </div>

      {/* Sub-Nav Bar */}
      <div className="flex w-fit items-center gap-1 rounded-xl bg-neutral-100 p-1 text-xs font-bold">
        <Link
          href="/assistant"
          className="rounded-lg px-3 py-1.5 text-neutral-600 transition-colors hover:text-neutral-900"
        >
          💬 Assistant Hub
        </Link>
        <Link
          href="/assistant/history"
          className="rounded-lg px-3 py-1.5 text-neutral-600 transition-colors hover:text-neutral-900"
        >
          📜 Conversation History
        </Link>
        <Link
          href="/assistant/recommendations"
          className="text-brand-700 flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 shadow-xs transition-all"
        >
          💡 Recommendations
          <span className="bg-brand-500 h-2 w-2 rounded-full" />
        </Link>
      </div>

      {/* Recommendations Cards */}
      {activeRecs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center">
          <MitraMascot pose="cheer" size="lg" />
          <h3 className="mt-4 text-base font-bold text-neutral-900">
            All recommendations completed!
          </h3>
          <p className="mt-1 max-w-sm text-xs text-neutral-500">
            Your marketing workspace is optimized. Mitra will surface new opportunities as customer
            data and holidays approach.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {activeRecs.map((rec) => (
            <div
              key={rec.id}
              className="hover:border-brand-300 flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-md px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      rec.category === 'urgent'
                        ? 'bg-red-100 text-red-700'
                        : rec.category === 'opportunity'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.category === 'followup'
                            ? 'bg-brand-100 text-brand-700'
                            : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {rec.category}
                  </span>
                  {rec.impactBadge && (
                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-500">
                      ⚡ {rec.impactBadge}
                    </span>
                  )}
                </div>

                <h3 className="text-sm leading-snug font-bold text-neutral-900">{rec.title}</h3>
                <p className="text-xs leading-relaxed text-neutral-600">{rec.description}</p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-3">
                <Link href={rec.actionUrl}>
                  <Button size="sm" className="rounded-xl text-xs font-bold">
                    {rec.actionLabel}
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={() => handleDismiss(rec.id)}
                  className="text-xs font-semibold text-neutral-400 transition-colors hover:text-neutral-600"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
