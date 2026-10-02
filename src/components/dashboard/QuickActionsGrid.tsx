'use client';

import Link from 'next/link';
import { InteractiveCard } from '@/components/motion/InteractiveCard';

const ACTIONS = [
  {
    title: 'Create Campaign',
    subtitle: 'AI-powered campaigns in minutes',
    icon: '🎯',
    href: '/campaigns/new',
    badge: 'Popular',
    color: 'bg-orange-50 text-orange-600 border-orange-200/60',
  },
  {
    title: 'Use Templates',
    subtitle: 'Ready-to-edit templates for your business',
    icon: '📋',
    href: '/creative',
    color: 'bg-amber-50 text-amber-600 border-amber-200/60',
  },
  {
    title: 'Generate Reel',
    subtitle: 'Short videos for social media',
    icon: '🎬',
    href: '/reels/new',
    color: 'bg-[#FFF5F0] text-[#E84D1A] border-orange-200/60',
  },
  {
    title: 'Design Poster',
    subtitle: 'Stunning posters for print & digital',
    icon: '🎨',
    href: '/create',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
  },
  {
    title: 'Business Brain',
    subtitle: 'Understand your business better with AI',
    icon: '🧠',
    href: '/business',
    badge: 'Beta',
    color: 'bg-purple-50 text-purple-600 border-purple-200/60',
  },
];

export function QuickActionsGrid() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#1A1A1E]">
          <span>⚡ Quick Actions</span>
        </h2>
        <Link
          href="/create"
          className="text-xs font-semibold text-[#E84D1A] hover:underline sm:text-sm"
        >
          View all tools &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {ACTIONS.map((action, idx) => (
          <Link key={idx} href={action.href} className="group focus:outline-none">
            <InteractiveCard
              bare
              maxTilt={5}
              className="flex h-full flex-col justify-between rounded-2xl border border-[#F0EBE1] bg-white p-4 shadow-2xs transition-shadow duration-200 hover:shadow-md"
            >
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl ${action.color}`}
                  >
                    <span>{action.icon}</span>
                  </div>
                  {action.badge && (
                    <span className="bg-brand-50 text-brand-600 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                      {action.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-[#1A1A1E] transition-colors group-hover:text-[#E84D1A]">
                  {action.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#757580]">
                  {action.subtitle}
                </p>
              </div>
            </InteractiveCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
