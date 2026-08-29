'use client';

import type { Business } from '@/types';

export function BusinessSelector({
  businesses,
  selectedBusinessId,
  onSelect,
}: {
  businesses: Business[];
  selectedBusinessId: string | null;
  onSelect: (id: string) => void;
}) {
  if (businesses.length <= 1) {
    return businesses[0] ? (
      <div className="bg-brand-50 text-brand-700 flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2z"
          />
        </svg>
        <span className="font-medium">{businesses[0].name}</span>
      </div>
    ) : null;
  }

  return (
    <select
      value={selectedBusinessId || ''}
      onChange={(e) => onSelect(e.target.value)}
      className="focus:ring-brand-500 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
      aria-label="Select business"
    >
      <option value="">Select a business</option>
      {businesses.map((business) => (
        <option key={business.businessId} value={business.businessId}>
          {business.name}
        </option>
      ))}
    </select>
  );
}
