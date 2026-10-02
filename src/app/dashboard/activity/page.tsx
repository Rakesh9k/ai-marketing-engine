'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { Mascot } from '@/components/mascot/Mascot';

interface ActivityItem {
  id: string;
  time: string;
  dateGroup: 'TODAY' | 'YESTERDAY' | 'THIS WEEK';
  type: 'campaign' | 'ai' | 'whatsapp' | 'publishing' | 'system';
  title: string;
  description: string;
  icon: string;
  badge: { label: string; color: string };
  actionLink?: { href: string; label: string };
}

const SAMPLE_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    time: '10:32 AM',
    dateGroup: 'TODAY',
    type: 'ai',
    title: 'Mitra generated your Instagram reel draft',
    description: 'Generated 15-second reel video script and background music track for Weekend Offer.',
    icon: '🎬',
    badge: { label: 'AI Generation', color: 'bg-orange-100 text-orange-700' },
    actionLink: { href: '/reels/new', label: 'Review Reel' },
  },
  {
    id: 'act-2',
    time: '09:48 AM',
    dateGroup: 'TODAY',
    type: 'campaign',
    title: 'You approved the Monsoon Biryani campaign',
    description: 'Campaign pack approved with 3 poster variations and 1 WhatsApp promo copy.',
    icon: '🚀',
    badge: { label: 'Campaign Approved', color: 'bg-emerald-100 text-emerald-700' },
    actionLink: { href: '/campaigns', label: 'View Campaign' },
  },
  {
    id: 'act-3',
    time: '09:12 AM',
    dateGroup: 'TODAY',
    type: 'whatsapp',
    title: 'WhatsApp Broadcast sent to 140 customers',
    description: 'Direct WhatsApp message delivered with 42 link clicks recorded in 2 hours.',
    icon: '💬',
    badge: { label: 'WhatsApp', color: 'bg-green-100 text-green-700' },
    actionLink: { href: '/whatsapp', label: 'Analytics' },
  },
  {
    id: 'act-4',
    time: '04:15 PM',
    dateGroup: 'YESTERDAY',
    type: 'publishing',
    title: 'Scheduled post "Weekend Special Thali" for Instagram',
    description: 'Post set to publish automatically on Saturday at 12:30 PM.',
    icon: '📅',
    badge: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
    actionLink: { href: '/calendar', label: 'View Calendar' },
  },
  {
    id: 'act-5',
    time: '02:30 PM',
    dateGroup: 'YESTERDAY',
    type: 'system',
    title: 'You updated product "Royal Special Biryani"',
    description: 'Price updated to ₹349 and added new photo asset to Business Brain.',
    icon: '🛍️',
    badge: { label: 'Business Brain', color: 'bg-purple-100 text-purple-700' },
    actionLink: { href: '/products', label: 'View Products' },
  },
  {
    id: 'act-6',
    time: '11:00 AM',
    dateGroup: 'THIS WEEK',
    type: 'ai',
    title: 'Mitra updated your target audience insights',
    description: 'Identified top 3 localities responding best to lunch combo promotions.',
    icon: '🧠',
    badge: { label: 'AI Insight', color: 'bg-[#FFF5F0] text-[#E84D1A]' },
    actionLink: { href: '/business', label: 'View Insights' },
  },
];

export default function ActivityPage() {
  const [filter, setFilter] = useState<string>('all');
  const reduceMotion = useReducedMotion();

  const filteredItems =
    filter === 'all'
      ? SAMPLE_ACTIVITIES
      : SAMPLE_ACTIVITIES.filter((item) => item.type === filter);

  const groups = ['TODAY', 'YESTERDAY', 'THIS WEEK'] as const;

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 lg:px-8">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-50 via-amber-50 to-white p-6 sm:p-8 border border-orange-200/60 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <span className="font-serif italic text-sm text-[#E84D1A] font-semibold">
              ✨ Everything Mitra has been doing for your business
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1E]">
              Activity &amp; Work Timeline
            </h1>
            <p className="text-sm text-[#5C5C66] max-w-md leading-relaxed">
              Track campaign progress, AI generations, customer actions, and publishing milestones in one live feed.
            </p>
          </div>

          <Mascot state="analyzing" size="lg" shadow animated />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#F0EBE1] pb-3">
          {[
            { id: 'all', label: 'All Activity' },
            { id: 'campaign', label: '🚀 Campaigns' },
            { id: 'ai', label: '🎬 AI Generation' },
            { id: 'whatsapp', label: '💬 WhatsApp' },
            { id: 'publishing', label: '📅 Publishing' },
            { id: 'system', label: '🧠 Business Brain' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                filter === tab.id
                  ? 'bg-[#E84D1A] text-white shadow-xs'
                  : 'bg-white text-[#5C5C66] hover:bg-neutral-100 border border-[#F0EBE1]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Timeline Feed */}
        <div className="space-y-8">
          {groups.map((group) => {
            const itemsInGroup = filteredItems.filter((i) => i.dateGroup === group);
            if (itemsInGroup.length === 0) return null;

            return (
              <div key={group} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#757580] uppercase tracking-wider bg-neutral-100 px-3 py-1 rounded-full">
                    {group}
                  </span>
                  <div className="h-px flex-1 bg-[#F0EBE1]" />
                </div>

                <div className="space-y-3 pl-2 sm:pl-4 border-l-2 border-orange-100">
                  {itemsInGroup.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative pl-6 py-2 group"
                    >
                      {/* Timeline Dot */}
                      <div className="absolute -left-[31px] top-3.5 h-4 w-4 rounded-full border-2 border-white bg-[#E84D1A] shadow-xs" />

                      {/* Card Container */}
                      <div className="rounded-2xl bg-white p-4 border border-[#F0EBE1] shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-50 text-xl border border-neutral-100">
                            {item.icon}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-[#1A1A1E]">{item.title}</h3>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.badge.color}`}>
                                {item.badge.label}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[#5C5C66] leading-relaxed">
                              {item.description}
                            </p>
                            <p className="mt-1.5 text-[10px] text-[#757580] font-medium">{item.time}</p>
                          </div>
                        </div>

                        {item.actionLink && (
                          <Link href={item.actionLink.href} className="shrink-0">
                            <button className="rounded-xl border border-border-medium bg-surface px-3.5 py-1.5 text-xs font-semibold text-[#1A1A1E] hover:bg-neutral-100 transition-colors">
                              {item.actionLink.label} &rarr;
                            </button>
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ProtectedRoute>
  );
}
