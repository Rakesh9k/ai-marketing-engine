'use client';

import React from 'react';
import type { PublishPlatform, PublishContentType } from '@/types';

export type DashboardTab = 'calendar' | 'scheduled' | 'published' | 'failed';

interface PublishingDashboardTabsProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  platformFilter: 'all' | PublishPlatform;
  onPlatformFilterChange: (platform: 'all' | PublishPlatform) => void;
  formatFilter: 'all' | PublishContentType;
  onFormatFilterChange: (format: 'all' | PublishContentType) => void;
  counts: {
    calendar: number;
    scheduled: number;
    published: number;
    failed: number;
  };
}

export function PublishingDashboardTabs({
  activeTab,
  onTabChange,
  platformFilter,
  onPlatformFilterChange,
  formatFilter,
  onFormatFilterChange,
  counts,
}: PublishingDashboardTabsProps) {
  const tabs: Array<{ id: DashboardTab; label: string; count: number }> = [
    { id: 'calendar', label: 'Calendar', count: counts.calendar },
    { id: 'scheduled', label: 'Scheduled', count: counts.scheduled },
    { id: 'published', label: 'Published', count: counts.published },
    { id: 'failed', label: 'Failed', count: counts.failed },
  ];

  return (
    <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
      {/* Tab Navigation */}
      <nav className="flex space-x-2 overflow-x-auto" aria-label="Dashboard views">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Filters (Platform & Content Type) */}
      <div className="flex items-center gap-3">
        <select
          value={platformFilter}
          onChange={(e) => onPlatformFilterChange(e.target.value as 'all' | PublishPlatform)}
          className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          aria-label="Filter by platform"
        >
          <option value="all">All Platforms</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
        </select>

        <select
          value={formatFilter}
          onChange={(e) => onFormatFilterChange(e.target.value as 'all' | PublishContentType)}
          className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          aria-label="Filter by format"
        >
          <option value="all">All Formats</option>
          <option value="post">Feed Post</option>
          <option value="reel">Reel / Video</option>
        </select>
      </div>
    </div>
  );
}
