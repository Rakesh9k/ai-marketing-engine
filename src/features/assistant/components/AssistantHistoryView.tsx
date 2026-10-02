'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AssistantConversation } from '../types';
import { MitraMascot } from '@/components/mascot/MitraMascot';
import { Button } from '@/components/ui/Button';

const INITIAL_CONVERSATIONS: AssistantConversation[] = [
  {
    id: 'conv-101',
    userId: 'u1',
    businessId: 'b1',
    title: 'Diwali Festival Campaign Planning',
    lastMessage: 'Here are 3 festive caption variations tailored for your business...',
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'conv-102',
    userId: 'u1',
    businessId: 'b1',
    title: 'Weekend Biryani Promo & Banner Copy',
    lastMessage: '🚀 Weekend Flash Campaign Plan: Headline: Weekend Feast Deal...',
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
  },
  {
    id: 'conv-103',
    userId: 'u1',
    businessId: 'b1',
    title: 'WhatsApp Customer Retention Script',
    lastMessage: 'Hi {Name}! 👋 We miss seeing you at authentic Hyderabadi Biryani...',
    updatedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 80).toISOString(),
  },
];

export function AssistantHistoryView() {
  const [conversations, setConversations] = useState<AssistantConversation[]>(INITIAL_CONVERSATIONS);
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 border border-brand-200">
            <MitraMascot pose="point" size="md" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Conversation History</h1>
            <p className="text-xs text-neutral-500 font-medium">Revisit past marketing strategies, ad copy, and campaign ideas created with Mitra.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/assistant">
            <Button className="font-bold rounded-xl">＋ Start New Conversation</Button>
          </Link>
        </div>
      </div>

      {/* Sub-Nav & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs font-bold w-fit">
          <Link
            href="/assistant"
            className="rounded-lg px-3 py-1.5 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            💬 Assistant Hub
          </Link>
          <Link
            href="/assistant/history"
            className="rounded-lg bg-white px-3 py-1.5 text-brand-700 shadow-xs transition-all"
          >
            📜 Conversation History
          </Link>
          <Link
            href="/assistant/recommendations"
            className="rounded-lg px-3 py-1.5 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            💡 Recommendations
          </Link>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversation history..."
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Conversations Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center">
          <MitraMascot pose="idle" size="lg" />
          <h3 className="mt-4 text-base font-bold text-neutral-900">No conversations found</h3>
          <p className="mt-1 text-xs text-neutral-500 max-w-sm">
            {search ? 'Try searching for another keyword.' : 'Start chatting with Mitra to save marketing sessions here.'}
          </p>
          <Link href="/assistant" className="mt-4">
            <Button size="sm" className="font-bold">Ask Mitra Now</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {filtered.map((conv) => (
            <div
              key={conv.id}
              className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-neutral-900 hover:text-brand-600 transition-colors">
                    <Link href={`/assistant/${conv.id}`}>{conv.title}</Link>
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-semibold shrink-0">
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                  {conv.lastMessage}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                <Link
                  href={`/assistant/${conv.id}`}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  Continue Chat →
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(conv.id)}
                  className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
