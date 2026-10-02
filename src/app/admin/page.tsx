'use client';

import { useState } from 'react';
import Link from 'next/link';

interface SaaSMetric {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  subtitle: string;
}

const METRICS: SaaSMetric[] = [
  {
    title: 'Total Active Businesses',
    value: '1,428',
    change: '+18.4%',
    trend: 'up',
    icon: '🏪',
    subtitle: '124 new onboarded this month',
  },
  {
    title: 'Monthly Recurring Revenue (MRR)',
    value: '₹4,85,000',
    change: '+24.2%',
    trend: 'up',
    icon: '💳',
    subtitle: 'Avg ARR per account: ₹4,070',
  },
  {
    title: 'Total Credit Consumption',
    value: '68,400',
    change: '+31.0%',
    trend: 'up',
    icon: '⚡',
    subtitle: 'Gemini & Imagen API calls',
  },
  {
    title: 'Active Social Connections',
    value: '912',
    change: '+12.5%',
    trend: 'up',
    icon: '📲',
    subtitle: 'Instagram, Meta & WhatsApp',
  },
];

export default function AdminDashboardPage() {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);

  return (
    <div className="bg-bg-primary text-text-primary min-h-screen p-6 font-sans sm:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="border-border-light flex flex-col items-start justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-text-primary text-2xl font-bold tracking-tight sm:text-3xl">
                Mitra SaaS Admin Portal
              </h1>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                System Healthy
              </span>
            </div>
            <p className="text-text-secondary mt-1 text-sm">
              Global operational metrics, AI consumption telemetry, and subscription health.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/eval-suite"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <span>🧪</span> AI Eval Suite
            </Link>
            <Link
              href="/admin/ai-traces"
              className="flex items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-100"
            >
              <span>🔍</span> AI Debug Traces
            </Link>
            <Link
              href="/admin/beta"
              className="border-brand-300 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors"
            >
              🧪 Beta Friction Logs
            </Link>
            <Link
              href="/dashboard"
              className="border-border-light bg-surface text-text-secondary hover:bg-bg-secondary rounded-xl border px-4 py-2 text-sm font-semibold transition-colors"
            >
              Exit to Workspace
            </Link>
          </div>
        </div>

        {/* Top Operational Status Bar */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: 'Gemini 1.5 Pro', status: 'Operational', latency: '410 ms', icon: '🧠' },
            { name: 'Imagen 3 Generator', status: 'Operational', latency: '1.9 s', icon: '🎨' },
            { name: 'WhatsApp Gateway', status: 'Operational', latency: '180 ms', icon: '💬' },
            { name: 'Meta Graph API', status: 'Operational', latency: '240 ms', icon: '🌐' },
          ].map((sys, idx) => (
            <div
              key={idx}
              className="border-border-light bg-surface flex items-center justify-between rounded-xl border p-4 shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{sys.icon}</span>
                <div>
                  <h4 className="text-text-primary text-xs font-bold">{sys.name}</h4>
                  <p className="text-text-tertiary text-[11px]">Latency: {sys.latency}</p>
                </div>
              </div>
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
          ))}
        </div>

        {/* Timeframe Controls */}
        <div className="flex items-center justify-between">
          <h2 className="text-text-primary text-lg font-bold">Key SaaS Performance Indicators</h2>
          <div className="border-border-light bg-surface flex items-center rounded-xl border p-1 shadow-2xs">
            {[
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
              { id: 'all', label: 'All Time' },
            ].map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id as typeof timeframe)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  timeframe === tf.id
                    ? 'bg-brand-500 text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((m, idx) => (
            <div
              key={idx}
              className="border-border-light bg-surface rounded-2xl border p-6 shadow-xs transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="bg-bg-secondary flex h-10 w-10 items-center justify-center rounded-xl text-xl">
                  {m.icon}
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
                  {m.change}
                </span>
              </div>
              <h3 className="text-text-primary text-2xl font-bold tracking-tight">{m.value}</h3>
              <p className="text-text-secondary mt-1 text-sm font-semibold">{m.title}</p>
              <p className="text-text-tertiary mt-2 text-xs">{m.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Analytics Breakdown Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Industry Distribution */}
          <div className="border-border-light bg-surface rounded-2xl border p-6 shadow-xs lg:col-span-6">
            <h3 className="text-text-primary mb-4 text-base font-bold">
              Business Category Distribution
            </h3>
            <div className="space-y-4">
              {[
                {
                  name: 'Restaurants & Food',
                  pct: 42,
                  count: '600 accounts',
                  color: 'bg-brand-500',
                },
                {
                  name: 'Salons & Beauty Parlors',
                  pct: 28,
                  count: '400 accounts',
                  color: 'bg-amber-500',
                },
                {
                  name: 'Real Estate & Builders',
                  pct: 18,
                  count: '257 accounts',
                  color: 'bg-indigo-500',
                },
                {
                  name: 'Retail & Boutique',
                  pct: 12,
                  count: '171 accounts',
                  color: 'bg-emerald-500',
                },
              ].map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-text-primary">{cat.name}</span>
                    <span className="text-text-tertiary">
                      {cat.pct}% ({cat.count})
                    </span>
                  </div>
                  <div className="bg-bg-secondary h-2 w-full overflow-hidden rounded-full">
                    <div
                      className={`h-full ${cat.color} rounded-full`}
                      style={{ width: `${cat.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Credit Usage Telemetry */}
          <div className="border-border-light bg-surface rounded-2xl border p-6 shadow-xs lg:col-span-6">
            <h3 className="text-text-primary mb-4 text-base font-bold">
              AI Generation Consumption Telemetry
            </h3>
            <div className="space-y-4">
              {[
                { type: 'Imagen 3 Visual Creatives', credits: '41,040 credits', share: '60%' },
                { type: 'Gemini Copy & Captions', credits: '17,100 credits', share: '25%' },
                { type: 'Video / Reel Studio', credits: '10,260 credits', share: '15%' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="border-border-light bg-bg-secondary/40 flex items-center justify-between rounded-xl border p-3"
                >
                  <div>
                    <h4 className="text-text-primary text-sm font-bold">{item.type}</h4>
                    <p className="text-text-tertiary text-xs">{item.credits}</p>
                  </div>
                  <span className="text-brand-600 bg-brand-50 border-brand-200 rounded-lg border px-3 py-1 text-sm font-bold">
                    {item.share}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Super-Admin System Controls */}
        <div className="border-border-light bg-surface rounded-2xl border p-6 shadow-xs">
          <h3 className="text-text-primary mb-4 text-base font-bold">
            Super-Admin System Controls
          </h3>
          <div className="border-border-light bg-bg-secondary/30 flex flex-col items-start justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
            <div>
              <h4 className="text-text-primary text-sm font-bold">Global Maintenance Mode</h4>
              <p className="text-text-tertiary text-xs">
                Temporarily pause AI generation routes for routine database migrations or
                maintenance.
              </p>
            </div>
            <button
              onClick={() => setMaintenanceMode((prev) => !prev)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                maintenanceMode
                  ? 'bg-rose-600 text-white'
                  : 'bg-surface text-text-secondary border-border-light hover:bg-bg-secondary border'
              }`}
            >
              {maintenanceMode ? '🚨 Maintenance Active' : 'System Active (Normal)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
