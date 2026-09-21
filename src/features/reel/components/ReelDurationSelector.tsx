'use client';

import { REEL_DURATION_OPTIONS } from '@/features/reel/constants';
import type { ReelDurationSeconds } from '@/types';

interface ReelDurationSelectorProps {
  value: ReelDurationSeconds;
  onChange: (duration: ReelDurationSeconds) => void;
}

export function ReelDurationSelector({ value, onChange }: ReelDurationSelectorProps) {
  return (
    <div className="flex gap-3">
      {REEL_DURATION_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={`flex-1 rounded-lg border px-4 py-3 text-center font-medium transition-colors ${
              selected
                ? 'border-brand-500 bg-brand-50 text-brand-700 ring-brand-500 ring-1'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
