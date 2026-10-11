'use client';

import { motion, useReducedMotion } from 'motion/react';

export function PublishingSection() {
  const reduceMotion = useReducedMotion();

  const channels = [
    {
      name: 'Instagram',
      type: 'Feed Posts, Reels & Stories',
      status: 'Ready to Publish',
      icon: (
        <svg className="h-6 w-6 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
      action: 'Direct Export & Share',
    },
    {
      name: 'WhatsApp',
      type: 'Customer Broadcast Lists',
      status: 'Ready to Publish',
      icon: (
        <svg className="h-6 w-6 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.299.434 2.503 1.185 3.477l-.775 2.83 2.899-.76c.94.516 2.009.81 3.139.81 3.18 0 5.767-2.587 5.767-5.766.001-3.18-2.585-5.757-5.766-5.757zm0 10.377c-.961 0-1.895-.26-2.704-.752l-.194-.118-2.009.527.536-1.959-.13-.207a4.673 4.673 0 0 1-.715-2.482c.001-2.585 2.105-4.689 4.69-4.689 2.584 0 4.688 2.104 4.689 4.689 0 2.585-2.104 4.691-4.689 4.691z" />
        </svg>
      ),
      action: '1-Click WhatsApp Link',
    },
    {
      name: 'Facebook',
      type: 'Business Page & Groups',
      status: 'Ready to Publish',
      icon: (
        <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      action: 'Copy & Post',
    },
    {
      name: 'Social Media Visuals',
      type: 'Feed Posts & Stories',
      status: 'Ready for Export',
      icon: (
        <svg
          className="h-6 w-6 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      action: 'High-Res PDF / PNG',
    },
  ];

  return (
    <section className="bg-bg-secondary py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="bg-brand-50 text-brand-700 border-brand-100 rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase">
            Publishing Workflow
          </span>
          <h2 className="text-text-primary mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            From creation to customers in 3 steps.
          </h2>
          <p className="text-text-secondary mx-auto mt-4 max-w-2xl text-base sm:text-lg">
            Create your campaign, review with Truth Check, and export or publish directly across
            your business channels.
          </p>
        </div>

        {/* Workflow Progression Pill Header */}
        <div className="mt-12 flex justify-center">
          <div className="border-border-light bg-surface inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold shadow-xs sm:gap-4">
            <span className="text-brand-600">1. CREATE</span>
            <span className="text-text-tertiary">→</span>
            <span className="text-brand-600">2. REVIEW</span>
            <span className="text-text-tertiary">→</span>
            <span className="text-emerald-600">3. PUBLISH</span>
          </div>
        </div>

        {/* Channel Interface Cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map((chan, idx) => (
            <motion.div
              key={chan.name}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="border-border-light bg-surface rounded-3xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="bg-bg-secondary flex h-12 w-12 items-center justify-center rounded-2xl">
                  {chan.icon}
                </div>
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  {chan.status}
                </span>
              </div>

              <h3 className="text-text-primary mt-5 text-lg font-bold">{chan.name}</h3>
              <p className="text-text-secondary mt-1 text-xs">{chan.type}</p>

              <div className="border-border-light text-brand-600 mt-6 flex items-center justify-between border-t pt-3 text-xs font-semibold">
                <span>{chan.action}</span>
                <span>→</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
