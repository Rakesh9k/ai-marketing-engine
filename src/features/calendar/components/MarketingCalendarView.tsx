'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import type { MarketingPlan, MarketingCalendarItem } from '@/types';
import { EditCalendarItemModal } from './EditCalendarItemModal';
import { calendarService } from '../services/calendarService';

interface MarketingCalendarViewProps {
  plan: MarketingPlan | null;
  items: MarketingCalendarItem[];
  onOpenWizard: () => void;
  onRefresh: () => void;
}

export function MarketingCalendarView({
  plan,
  items,
  onOpenWizard,
  onRefresh,
}: MarketingCalendarViewProps) {
  const router = useRouter();
  const [editingItem, setEditingItem] = useState<MarketingCalendarItem | null>(null);
  const [skippingId, setSkippingId] = useState<string | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  if (!plan || items.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-12 text-center dark:border-gray-800 dark:bg-gray-900/30">
        <div className="text-4xl">📆</div>
        <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
          Your marketing calendar is empty
        </h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
          Mitra can build a 30-day content plan based on your business profile, marketing goals, and
          posting frequency.
        </p>
        <div className="mt-6">
          <button
            onClick={onOpenWizard}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            Create my 30-day plan
          </button>
        </div>
      </div>
    );
  }

  const handleSkip = async (itemId: string) => {
    setSkippingId(itemId);
    try {
      await calendarService.skipCalendarItem(itemId);
      onRefresh();
    } catch (err) {
      console.error('Failed to skip item:', err);
    } finally {
      setSkippingId(null);
    }
  };

  const handleCreateContent = async (itemId: string) => {
    setCreatingId(itemId);
    try {
      const res = await calendarService.createCampaignFromCalendarItem(itemId);
      if (res?.campaignId) {
        router.push(`/campaigns/${res.campaignId}?created=1`);
      }
    } catch (err) {
      console.error('Failed to create content from calendar item:', err);
      alert('Failed to generate campaign. Please check your credits or try again.');
    } finally {
      setCreatingId(null);
    }
  };

  const formattedStartDate = format(parseISO(plan.startDate), 'd MMM');
  const formattedEndDate = format(parseISO(plan.endDate), 'd MMM yyyy');

  const goalLabels: Record<string, string> = {
    get_customers: 'Get more customers',
    promote_offers: 'Promote offers',
    build_awareness: 'Build brand awareness',
    promote_products: 'Promote products',
  };

  const frequencyLabels: Record<string, string> = {
    three_per_week: '3 posts / week',
    five_per_week: '5 posts / week',
    daily: 'Daily posting',
  };

  return (
    <div className="space-y-8">
      {/* 30-Day Plan Summary Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 uppercase dark:bg-indigo-950 dark:text-indigo-300">
                Active 30-Day Plan
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formattedStartDate} – {formattedEndDate}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">
              {goalLabels[plan.goal] || 'Marketing Strategy'}
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Frequency:{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {frequencyLabels[plan.frequency]}
              </span>{' '}
              · Timezone:{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {plan.timezone}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenWizard}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              🔄 Regenerate Plan
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-4 dark:border-gray-800">
          <div>
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Total Ideas
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{plan.totalItems}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Creatives Created
            </div>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {
                items.filter(
                  (i) =>
                    i.status === 'content_created' ||
                    i.status === 'scheduled' ||
                    i.status === 'published'
                ).length
              }
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Pending</div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {items.filter((i) => i.status === 'planned').length}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Skipped</div>
            <div className="text-lg font-bold text-gray-500 dark:text-gray-400">
              {items.filter((i) => i.status === 'skipped').length}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Timeline List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
          Planned Content Timeline ({items.length} Posts)
        </h3>

        <div className="space-y-4">
          {items.map((item) => {
            const itemDateFormatted = format(parseISO(item.scheduledDate), 'EEE, MMM d');
            const isSkipped = item.status === 'skipped';
            const isCreated =
              item.status === 'content_created' ||
              item.status === 'scheduled' ||
              item.status === 'published' ||
              !!item.campaignId;

            return (
              <div
                key={item.itemId}
                className={`flex flex-col justify-between rounded-2xl border p-5 transition-all sm:flex-row sm:items-center ${
                  isSkipped
                    ? 'border-gray-200 bg-gray-50/50 opacity-60 dark:border-gray-800 dark:bg-gray-900/30'
                    : 'border-gray-200 bg-white shadow-sm hover:border-indigo-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      📅 {itemDateFormatted}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ⏰ {item.suggestedTime}
                    </span>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700 uppercase dark:bg-gray-800 dark:text-gray-300">
                      {item.contentType}
                    </span>
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase dark:bg-indigo-950 dark:text-indigo-300">
                      {item.strategy}
                    </span>
                    {isCreated && (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase dark:bg-emerald-950 dark:text-emerald-300">
                        ✓ Content Created
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">
                      {item.topic}
                    </h4>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        Hook:
                      </span>{' '}
                      &ldquo;{item.hook}&rdquo;
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <div>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">CTA:</span>{' '}
                      {item.callToAction}
                    </div>
                    {item.productName && (
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          Product:
                        </span>{' '}
                        {item.productName}
                      </div>
                    )}
                    {item.offerHeadline && (
                      <div>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          Offer:
                        </span>{' '}
                        {item.offerHeadline}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 sm:mt-0 sm:border-0 sm:pt-0 dark:border-gray-800">
                  {isCreated && item.campaignId ? (
                    <Link
                      href={`/campaigns/${item.campaignId}`}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                    >
                      Open Campaign
                    </Link>
                  ) : !isSkipped ? (
                    <button
                      onClick={() => handleCreateContent(item.itemId)}
                      disabled={creatingId === item.itemId}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {creatingId === item.itemId ? 'Creating Content...' : '🚀 Create Content'}
                    </button>
                  ) : null}

                  {!isSkipped && !isCreated && (
                    <button
                      onClick={() => setEditingItem(item)}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      Edit
                    </button>
                  )}

                  {!isSkipped && !isCreated && (
                    <button
                      onClick={() => handleSkip(item.itemId)}
                      disabled={skippingId === item.itemId}
                      className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400"
                    >
                      {skippingId === item.itemId ? 'Skipping...' : 'Skip'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <EditCalendarItemModal
          item={editingItem}
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}
