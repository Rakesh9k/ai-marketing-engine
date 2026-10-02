'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { MagneticWrap } from '@/components/motion/MagneticWrap';
import { Mascot } from '@/components/mascot/Mascot';

export function PerformanceAndAISuggestions() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Left Column: Performance Overview */}
      <div className="flex flex-col justify-between rounded-2xl border border-[#F0EBE1] bg-white p-5 shadow-2xs lg:col-span-7">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-[#1A1A1E]">
                <span>📈 Performance Overview</span>
              </h3>
              <p className="text-xs text-[#757580]">Your marketing growth at a glance</p>
            </div>
            <select className="border-border-medium bg-surface rounded-lg border px-2.5 py-1 text-xs text-[#5C5C66] focus:outline-none">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
          </div>

          {/* SVG Line Sparkline Chart */}
          <div className="relative my-2 h-28 w-full">
            <svg
              className="h-full w-full overflow-visible"
              viewBox="0 0 400 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E84D1A" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#E84D1A" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Fill Area */}
              <path
                d="M 0 80 Q 50 70, 100 45 T 200 55 T 300 20 T 400 35 L 400 100 L 0 100 Z"
                fill="url(#chartGradient)"
              />
              {/* Stroke Line */}
              <motion.path
                initial={reduceMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                d="M 0 80 Q 50 70, 100 45 T 200 55 T 300 20 T 400 35"
                fill="none"
                stroke="#E84D1A"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Metric Badges Grid */}
          <div className="grid grid-cols-2 gap-3 border-t border-[#F0EBE1] pt-3 sm:grid-cols-4">
            <div className="rounded-xl bg-orange-50/50 p-2.5">
              <p className="text-[11px] font-medium text-[#757580]">Total Reach</p>
              <p className="text-base font-bold text-[#1A1A1E]">7.6K</p>
              <span className="text-[10px] font-semibold text-emerald-600">↑ 24%</span>
            </div>
            <div className="rounded-xl bg-amber-50/50 p-2.5">
              <p className="text-[11px] font-medium text-[#757580]">Total Clicks</p>
              <p className="text-base font-bold text-[#1A1A1E]">1.8K</p>
              <span className="text-[10px] font-semibold text-emerald-600">↑ 32%</span>
            </div>
            <div className="rounded-xl bg-blue-50/50 p-2.5">
              <p className="text-[11px] font-medium text-[#757580]">Total Orders</p>
              <p className="text-base font-bold text-[#1A1A1E]">142</p>
              <span className="text-[10px] font-semibold text-emerald-600">↑ 20%</span>
            </div>
            <div className="rounded-xl bg-emerald-50/50 p-2.5">
              <p className="text-[11px] font-medium text-[#757580]">Est. Revenue</p>
              <p className="text-base font-bold text-[#1A1A1E]">₹12,480</p>
              <span className="text-[10px] font-semibold text-emerald-600">↑ 40%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: AI Suggestions for You */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-orange-200/60 bg-gradient-to-tr from-orange-50/80 to-amber-50/60 p-5 shadow-2xs lg:col-span-5">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">💡</span>
            <h3 className="text-base font-bold text-[#1A1A1E]">AI Suggestions for You</h3>
          </div>

          <div className="my-3 flex items-start gap-3">
            <Mascot state="discovering" size="md" shadow animated />
            <p className="text-xs leading-relaxed text-[#5C5C66] sm:text-sm">
              Your biryani posts get{' '}
              <strong className="text-[#1A1A1E]">2.5x more engagement</strong> on weekends. Want to
              create a weekend campaign with a special offer?
            </p>
          </div>
        </div>

        <div className="mt-4">
          <MagneticWrap className="w-full">
            <Link
              href="/campaigns/new"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E84D1A] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#d04113] sm:text-sm"
            >
              Create Weekend Campaign →
            </Link>
          </MagneticWrap>
        </div>
      </div>
    </div>
  );
}
