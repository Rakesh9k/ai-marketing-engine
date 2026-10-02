'use client';

import React, { useState } from 'react';
import type { MarketingGoal, PostingFrequency, Product } from '@/types';
import { calendarService } from '../services/calendarService';

interface PlanWizardModalProps {
  businessId: string;
  products?: Product[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PlanWizardModal({
  businessId,
  products = [],
  isOpen,
  onClose,
  onSuccess,
}: PlanWizardModalProps) {
  const [step, setStep] = useState<number>(1);
  const [goal, setGoal] = useState<MarketingGoal>('get_customers');
  const [frequency, setFrequency] = useState<PostingFrequency>('three_per_week');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      await calendarService.generateMarketingPlan({
        businessId,
        goal,
        frequency,
        specificProductId: selectedProductId || undefined,
        timezone:
          typeof Intl !== 'undefined'
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : 'Asia/Kolkata',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to generate marketing plan:', err);
      setErrorMsg(err.message || "We couldn't generate your 30-day plan. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Create Your 30-Day Marketing Plan
          </h3>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Step {step} of {products.length > 0 ? 3 : 2}
          </span>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        {/* Step 1: Goal */}
        {step === 1 && (
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                What is your primary marketing goal?
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Mitra will structure your 30-day strategy around this objective.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  id: 'get_customers',
                  title: 'Get more customers',
                  desc: 'Drive new footfalls & orders with high-converting offers',
                },
                {
                  id: 'promote_offers',
                  title: 'Promote offers',
                  desc: 'Maximize sales for active discounts and specials',
                },
                {
                  id: 'build_awareness',
                  title: 'Build brand awareness',
                  desc: 'Educate local audience and build brand affinity',
                },
                {
                  id: 'promote_products',
                  title: 'Promote specific products',
                  desc: 'Highlight signature products and high-margin items',
                },
              ].map((item) => (
                <label
                  key={item.id}
                  onClick={() => setGoal(item.id as MarketingGoal)}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                    goal === item.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="goal"
                    checked={goal === item.id}
                    onChange={() => setGoal(item.id as MarketingGoal)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Frequency */}
        {step === 2 && (
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                How often do you want to post?
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose a manageable posting cadence for the next 30 days.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  id: 'three_per_week',
                  title: '3 posts / week',
                  desc: '13 planned entries (~every 2-3 days)',
                },
                {
                  id: 'five_per_week',
                  title: '5 posts / week',
                  desc: '21 planned entries (~every weekday)',
                },
                { id: 'daily', title: 'Daily posting', desc: '30 planned entries (every day)' },
              ].map((item) => (
                <label
                  key={item.id}
                  onClick={() => setFrequency(item.id as PostingFrequency)}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                    frequency === item.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="frequency"
                    checked={frequency === item.id}
                    onChange={() => setFrequency(item.id as PostingFrequency)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                &larr; Back
              </button>

              {products.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Next &rarr;
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isGenerating ? 'Planning Strategy...' : '🚀 Generate 30-Day Plan'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Optional Product Focus */}
        {step === 3 && (
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Anything specific to promote? (Optional)
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select a product or service to feature prominently across the 30 days.
              </p>
            </div>

            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All products / No specific focus</option>
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.name} (₹{p.price})
                </option>
              ))}
            </select>

            <div className="mt-6 flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isGenerating}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                &larr; Back
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isGenerating ? 'Planning Strategy...' : '🚀 Generate 30-Day Plan'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
