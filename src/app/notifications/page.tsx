'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'ai' | 'campaign' | 'publishing' | 'business' | 'system';
  time: string;
  read: boolean;
  actionHref: string;
  actionLabel: string;
}

const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'Your Instagram reel is ready to review',
    message: 'Mitra generated a 15-second reel video for your Monsoon Biryani campaign.',
    category: 'ai',
    time: '15m ago',
    read: false,
    actionHref: '/reels/new',
    actionLabel: 'Review Reel',
  },
  {
    id: 'n-2',
    title: 'Campaign scheduled for tomorrow',
    message: 'Weekend Offer campaign is set to publish on Saturday at 12:30 PM.',
    category: 'publishing',
    time: '2h ago',
    read: false,
    actionHref: '/calendar',
    actionLabel: 'View Calendar',
  },
  {
    id: 'n-3',
    title: 'Business Profile is 85% complete',
    message: 'Add brand style preferences to help Mitra craft more personalized content.',
    category: 'business',
    time: '1d ago',
    read: true,
    actionHref: '/business',
    actionLabel: 'Update Profile',
  },
  {
    id: 'n-4',
    title: 'New WhatsApp Broadcast responses',
    message: 'You received 42 clicks from your latest WhatsApp promo link.',
    category: 'campaign',
    time: '2d ago',
    read: true,
    actionHref: '/whatsapp',
    actionLabel: 'View Analytics',
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(SAMPLE_NOTIFICATIONS);
  const [filter, setFilter] = useState<string>('all');
  const reduceMotion = useReducedMotion();

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const filteredNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.read)
      : filter === 'all'
        ? notifications
        : notifications.filter((n) => n.category === filter);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-4 sm:px-6 lg:px-8">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 border-b border-[#F0EBE1] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#1A1A1E] sm:text-3xl">Notifications</h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#E84D1A] px-2.5 py-0.5 text-xs font-bold text-white">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-[#5C5C66]">
              Actionable updates from Mitra about your campaigns, AI work, and publishing.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="cursor-pointer text-xs font-semibold text-[#E84D1A] hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All Notifications' },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'ai', label: '🎬 AI Work' },
            { id: 'campaign', label: '🎯 Campaigns' },
            { id: 'publishing', label: '📅 Publishing' },
            { id: 'business', label: '🧠 Business' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                filter === tab.id
                  ? 'bg-[#E84D1A] text-white shadow-xs'
                  : 'border border-[#F0EBE1] bg-white text-[#5C5C66] hover:bg-neutral-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List or Empty State */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-surface rounded-3xl border border-dashed border-orange-200/80 p-10 text-center shadow-2xs">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-[#E84D1A]">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#1A1A1E]">You&apos;re all caught up!</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[#5C5C66]">
              No new notifications right now. Mitra is actively monitoring your campaigns.
            </p>
            <div className="mt-5 flex justify-center">
              <Link href="/dashboard">
                <button className="rounded-xl bg-[#E84D1A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#d04113]">
                  Back to Dashboard
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((n) => (
              <motion.div
                key={n.id}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => markAsRead(n.id)}
                className={`flex flex-col justify-between gap-4 rounded-2xl border p-4 transition-all sm:flex-row sm:items-center sm:p-5 ${
                  !n.read
                    ? 'border-orange-200/80 bg-gradient-to-r from-orange-50/70 to-white shadow-xs'
                    : 'border-[#F0EBE1] bg-white'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                      !n.read
                        ? 'bg-[#E84D1A] text-white shadow-xs'
                        : 'bg-neutral-100 text-[#1A1A1E]'
                    }`}
                  >
                    {n.category === 'ai'
                      ? '🎬'
                      : n.category === 'campaign'
                        ? '🎯'
                        : n.category === 'publishing'
                          ? '📅'
                          : '🧠'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm font-bold ${!n.read ? 'text-[#1A1A1E]' : 'text-[#5C5C66]'}`}
                      >
                        {n.title}
                      </h3>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-[#E84D1A]" />}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#5C5C66]">{n.message}</p>
                    <p className="mt-1 text-[10px] font-medium text-[#757580]">{n.time}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link href={n.actionHref}>
                    <button className="bg-surface border-border-medium rounded-xl border px-3.5 py-1.5 text-xs font-semibold text-[#1A1A1E] transition-colors hover:bg-neutral-100">
                      {n.actionLabel} &rarr;
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
