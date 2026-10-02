'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useToast } from '@/hooks/useToast';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { buildWhatsAppShareUrl } from '@/lib/utils/whatsapp';

interface Template {
  id: string;
  category: 'offers' | 'festive' | 'loyalty' | 'followup';
  title: string;
  text: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'tpl-1',
    category: 'offers',
    title: 'Weekend Bestseller Deal',
    text: '🎉 Weekend Special at {Business_Name}! Order your favorite dish today and get 20% OFF. Use code WEEKEND20 at checkout or show this message! Tap to order: https://brain-wise.com',
  },
  {
    id: 'tpl-2',
    category: 'festive',
    title: 'Diwali & Festival Greetings',
    text: '🌟 Wishing you and your family a joyous festive season! Celebrate with us at {Business_Name} and enjoy exclusive festive packages starting at ₹499.',
  },
  {
    id: 'tpl-3',
    category: 'loyalty',
    title: 'VIP Customer Loyalty Voucher',
    text: 'Namaste {Customer_Name}! 👋 As a valued customer, we have reserved a complimentary dessert for you on your next visit to {Business_Name}. Valid till Sunday!',
  },
  {
    id: 'tpl-4',
    category: 'followup',
    title: 'Post-Visit Feedback & Review',
    text: '🙏 Thank you for visiting {Business_Name}! We hope you loved your experience. Could you spare 30 seconds to rate us? Your feedback means the world to us!',
  },
];

export default function WhatsAppHubPage() {
  const [phoneNumber, setPhoneNumber] = useState('919876543210');
  const [message, setMessage] = useState(TEMPLATES[0]!.text);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'composer' | 'templates' | 'contacts'>('composer');

  const { showToast } = useToast();
  const { copyToClipboard } = useCopyToClipboard();

  const filteredTemplates =
    selectedCategory === 'all'
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const url =
      buildWhatsAppShareUrl(phoneNumber, message) ||
      `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Opening WhatsApp share link...', 'info');
  };

  const handleCopy = () => {
    if (!message) return;
    copyToClipboard(message, 'whatsapp_msg');
    showToast('Copied WhatsApp message to clipboard!', 'info');
  };

  return (
    <Sidebar>
      <div className="space-y-8">
        {/* Header */}
        <div className="via-surface rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-50/20 p-6 shadow-xs sm:p-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-text-primary text-2xl font-bold tracking-tight sm:text-3xl">
                  WhatsApp Marketing Hub
                </h1>
                <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Active Gateway
                </span>
              </div>
              <p className="text-text-secondary mt-1 text-sm">
                Create 1-click customer broadcasts, pre-formatted promotional messages, and WhatsApp
                Web click-to-chat links.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('composer')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === 'composer'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-surface border-border-light text-text-secondary hover:bg-bg-secondary border'
                }`}
              >
                💬 Composer
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === 'templates'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-surface border-border-light text-text-secondary hover:bg-bg-secondary border'
                }`}
              >
                📋 Templates
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Body */}
        {activeTab === 'composer' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left: Composer Form */}
            <form
              onSubmit={handleShare}
              className="border-border-light bg-surface space-y-6 rounded-2xl border p-6 shadow-xs lg:col-span-7"
            >
              <h2 className="text-text-primary flex items-center justify-between text-lg font-bold">
                <span>WhatsApp Broadcast Composer</span>
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-normal text-emerald-600">
                  Ready to Dispatch
                </span>
              </h2>

              <div>
                <label className="text-text-secondary mb-2 block text-xs font-semibold uppercase">
                  Target Customer / Group Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 919876543210 (Country code + number)"
                  className="border-border-light bg-bg-secondary text-text-primary focus:bg-surface w-full rounded-xl border p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <p className="text-text-tertiary mt-1 text-[11px]">
                  Include country code without + (e.g. 91 for India).
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-text-secondary block text-xs font-semibold uppercase">
                    Broadcast Message / Offer Copy
                  </label>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-xs font-semibold text-emerald-600 hover:underline"
                  >
                    📋 Copy Text
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your promotional broadcast message or select a template..."
                  className="border-border-light bg-bg-secondary text-text-primary focus:bg-surface w-full rounded-xl border p-3 text-sm leading-relaxed focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  🚀 Dispatch to WhatsApp
                </button>
              </div>
            </form>

            {/* Right: Template Picker */}
            <div className="space-y-4 lg:col-span-5">
              <h2 className="text-text-primary text-lg font-bold">Quick Load Templates</h2>
              <div className="space-y-3">
                {TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="border-border-light bg-surface space-y-2 rounded-xl border p-4 shadow-2xs transition-all hover:border-emerald-300"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-text-primary text-xs font-bold">{tpl.title}</h3>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 uppercase">
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-text-secondary bg-bg-secondary/60 border-border-light line-clamp-3 rounded-lg border p-2.5 text-xs leading-relaxed">
                      {tpl.text}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMessage(tpl.text);
                        showToast(`Loaded "${tpl.title}" into composer!`, 'info');
                      }}
                      className="border-border-light bg-surface text-text-secondary w-full rounded-lg border py-1.5 text-center text-xs font-semibold transition-colors hover:border-emerald-500 hover:text-emerald-600"
                    >
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="flex scrollbar-none items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All Templates' },
                { id: 'offers', label: 'Offers & Discounts' },
                { id: 'festive', label: 'Festive & Holidays' },
                { id: 'loyalty', label: 'VIP & Loyalty' },
                { id: 'followup', label: 'Reviews & Feedback' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-600 text-white'
                      : 'border-border-light bg-surface text-text-secondary hover:bg-bg-secondary border'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {filteredTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="border-border-light bg-surface space-y-4 rounded-2xl border p-6 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-text-primary text-base font-bold">{tpl.title}</h3>
                    <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                      {tpl.category}
                    </span>
                  </div>
                  <p className="text-text-secondary bg-bg-secondary border-border-light rounded-xl border p-4 font-mono text-sm text-xs leading-relaxed">
                    {tpl.text}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setMessage(tpl.text);
                        setActiveTab('composer');
                      }}
                      className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-700"
                    >
                      Use in Composer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sidebar>
  );
}
