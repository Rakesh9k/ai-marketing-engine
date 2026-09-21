'use client';

import { REEL_GOAL_OPTIONS } from '@/features/reel/constants';
import type { ReelGoal } from '@/types';

interface ReelGoalSelectorProps {
  value: ReelGoal | null;
  onChange: (goal: ReelGoal) => void;
}

export function ReelGoalSelector({ value, onChange }: ReelGoalSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {REEL_GOAL_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={`rounded-lg border p-4 text-left transition-colors ${
              selected
                ? 'border-brand-500 bg-brand-50 ring-brand-500 ring-1'
                : 'border-neutral-200 bg-white hover:border-neutral-300'
            }`}
          >
            <p className="font-medium text-neutral-900">{option.label}</p>
            <p className="mt-1 text-sm text-neutral-500">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}
