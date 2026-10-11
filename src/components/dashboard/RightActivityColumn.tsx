'use client';

import Link from 'next/link';
import { Mascot } from '@/components/mascot/Mascot';
import type { Business } from '@/types';

interface RightActivityColumnProps {
  business: Business | null;
}

export function RightActivityColumn({ business }: RightActivityColumnProps) {
  const businessName = business?.name || 'Hyderabadi Biryani House';
  const category = business?.category || 'Restaurant';
  const city = business?.location?.city || 'Hyderabad';

  return (
    <div className="space-y-5">
      {/* Widget 1: Recent Activity Timeline */}
      <div className="rounded-2xl border border-[#F0EBE1] bg-white p-5 shadow-2xs">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#1A1A1E]">
            <span>⏱️ Recent Activity</span>
          </h3>
          <Link
            href="/dashboard/activity"
            className="text-xs font-semibold text-[#E84D1A] hover:underline"
          >
            View all &rarr;
          </Link>
        </div>

        <div className="space-y-3.5 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="text-brand-600 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100">
              🚀
            </div>
            <div className="overflow-hidden">
              <p className="truncate font-medium text-[#1A1A1E]">
                Campaign &quot;Monsoon Special Biryani&quot; went live
              </p>
              <p className="text-[10px] text-[#757580]">2h ago</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              📊
            </div>
            <div>
              <p className="font-medium text-[#1A1A1E]">You received 42 new clicks</p>
              <p className="text-[10px] text-[#757580]">4h ago</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              💬
            </div>
            <div>
              <p className="font-medium text-[#1A1A1E]">New order from WhatsApp</p>
              <p className="text-[10px] text-[#757580]">5h ago</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              📅
            </div>
            <div>
              <p className="font-medium text-[#1A1A1E]">
                Campaign &quot;Weekend Offer&quot; scheduled
              </p>
              <p className="text-[10px] text-[#757580]">6h ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* Widget 2: Mitra Tips */}
      <div className="relative rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-2xs">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider text-amber-800 uppercase">
            💡 Mitra Tips
          </span>
          <Link href="/help" className="text-[11px] font-semibold text-[#E84D1A] hover:underline">
            View all &rarr;
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Mascot state="helper" size="sm" animated />
          <div>
            <p className="text-xs font-semibold text-[#1A1A1E]">Pro Tip!</p>
            <p className="text-[11px] leading-snug text-[#5C5C66]">
              Use local language (English + Telugu) in your campaigns to get 30% more engagement in{' '}
              {city}.
            </p>
          </div>
        </div>
      </div>

      {/* Widget 3: Your Business Profile */}
      <div className="space-y-3 rounded-2xl border border-[#F0EBE1] bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#1A1A1E] sm:text-sm">🏢 Your Business Profile</h3>
          <Link href="/business" className="text-xs font-semibold text-[#E84D1A] hover:underline">
            Edit
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-brand-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-lg font-bold">
            🏬
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-xs font-bold text-[#1A1A1E]">{businessName}</p>
            <p className="text-[11px] text-[#757580] capitalize">
              {category} • {city}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="mb-1 flex justify-between text-[11px] font-medium">
            <span className="text-[#5C5C66]">Profile Completeness</span>
            <span className="text-brand-600 font-bold">85%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-[#E84D1A]" style={{ width: '85%' }} />
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-1.5 pt-1 text-xs text-[#5C5C66]">
          <div className="flex items-center gap-2 font-medium text-emerald-600">
            <span>✓</span>
            <span>Business details</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-emerald-600">
            <span>✓</span>
            <span>Location &amp; contact</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-emerald-600">
            <span>✓</span>
            <span>Products / menu</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-400">
            <span>○</span>
            <span>Brand style</span>
          </div>
        </div>
      </div>

      {/* Widget 4: Upgrade Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-neutral-900 p-5 text-white shadow-md">
        <div className="pointer-events-none absolute top-0 right-0 h-full w-1/2 bg-gradient-to-bl from-orange-500/20 to-transparent" />
        <div className="relative z-10 max-w-[200px] space-y-2">
          <h4 className="text-sm font-bold text-white">Need more credits?</h4>
          <p className="text-[11px] leading-snug text-neutral-300">
            Subscribe to a plan or buy a credit pack to create more campaigns.
          </p>
          <Link href="/billing" className="inline-block pt-1">
            <button className="rounded-xl bg-[#E84D1A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#d04113]">
              View plans &amp; packs &rarr;
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
