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
  const [conversations, setConversations] =
    useState<AssistantConversation[]>(INITIAL_CONVERSATIONS);
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
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="bg-brand-100 border-brand-200 flex h-12 w-12 items-center justify-center rounded-2xl border">
            <MitraMascot pose="point" size="md" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Conversation History
            </h1>
            <p className="text-xs font-medium text-neutral-500">
              Revisit past marketing strategies, ad copy, and campaign ideas created with Mitra.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/assistant">
            <Button className="rounded-xl font-bold">＋ Start New Conversation</Button>
          </Link>
        </div>
      </div>

      {/* Sub-Nav & Search Bar */}
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex w-fit items-center gap-1 rounded-xl bg-neutral-100 p-1 text-xs font-bold">
          <Link
            href="/assistant"
            className="rounded-lg px-3 py-1.5 text-neutral-600 transition-colors hover:text-neutral-900"
          >
            💬 Assistant Hub
          </Link>
          <Link
            href="/assistant/history"
            className="text-brand-700 rounded-lg bg-white px-3 py-1.5 shadow-xs transition-all"
          >
            📜 Conversation History
          </Link>
          <Link
            href="/assistant/recommendations"
            className="rounded-lg px-3 py-1.5 text-neutral-600 transition-colors hover:text-neutral-900"
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
            className="focus:border-brand-500 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Conversations Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center">
          <MitraMascot pose="idle" size="lg" />
          <h3 className="mt-4 text-base font-bold text-neutral-900">No conversations found</h3>
          <p className="mt-1 max-w-sm text-xs text-neutral-500">
            {search
              ? 'Try searching for another keyword.'
              : 'Start chatting with Mitra to save marketing sessions here.'}
          </p>
          <Link href="/assistant" className="mt-4">
            <Button size="sm" className="font-bold">
              Ask Mitra Now
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {filtered.map((conv) => (
            <div
              key={conv.id}
              className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="hover:text-brand-600 text-sm font-bold text-neutral-900 transition-colors">
                    <Link href={`/assistant/${conv.id}`}>{conv.title}</Link>
                  </h3>
                  <span className="shrink-0 text-[10px] font-semibold text-neutral-400">
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-neutral-600">
                  {conv.lastMessage}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                <Link
                  href={`/assistant/${conv.id}`}
                  className="text-brand-600 hover:text-brand-700 flex items-center gap-1 text-xs font-bold"
                >
                  Continue Chat →
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(conv.id)}
                  className="text-[11px] font-semibold text-red-500 transition-colors hover:text-red-700"
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
