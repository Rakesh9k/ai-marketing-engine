'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AssistantMessage, AssistantPageContext } from '../types';
import { AssistantMessageItem } from './AssistantMessageItem';
import { MitraMascot } from '@/components/mascot/MitraMascot';
import { Button } from '@/components/ui/Button';

interface PersistentMitraDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pageContext?: AssistantPageContext;
}

const DRAWER_QUICK_PROMPTS = [
  {
    icon: '✍️',
    label: 'Festival Caption',
    prompt: 'Write 3 festive captions for my current page offer.',
  },
  {
    icon: '📢',
    label: 'Weekend Ad Idea',
    prompt: 'Give me a weekend promotional campaign for this page context.',
  },
  {
    icon: '💬',
    label: 'WhatsApp Script',
    prompt: 'Draft a polite WhatsApp message to send to repeat clients.',
  },
];

export function PersistentMitraDrawer({
  isOpen,
  onClose,
  pageContext,
}: PersistentMitraDrawerProps) {
  const pathname = usePathname();
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'drawer-1',
      conversationId: 'drawer',
      role: 'mitra',
      content: `Namaste! 👋 I'm Mitra. I'm right here with you while you navigate **${pathname}**. What can I help you build or write right now?`,
      type: 'text',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = (customText?: string) => {
    const text = customText || inputValue;
    if (!text.trim() || isTyping) return;

    const userMsg: AssistantMessage = {
      id: `usr-${Date.now()}`,
      conversationId: 'drawer',
      role: 'user',
      content: text,
      type: 'text',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const responseText =
        `I've processed your query for **${pathname}**:\n\n` +
        `"✨ **Mitra Recommendation**: Focus on high visual appeal & a clear CTA."\n\n` +
        `1. **Instagram Caption**: "Make your celebrations special with our exclusive offers! Tap to order now."\n` +
        `2. **CTA**: "Limited slots available — Book today!"`;

      const mitraMsg: AssistantMessage = {
        id: `mitra-${Date.now()}`,
        conversationId: 'drawer',
        role: 'mitra',
        content: responseText,
        type: 'text',
        createdAt: new Date().toISOString(),
        actions: [
          {
            id: 'act-c1',
            label: '🚀 Open Campaign Studio',
            url: '/campaigns/new',
            type: 'create_campaign',
          },
          {
            id: 'act-c2',
            label: '🎨 Open Creative Studio',
            url: '/creative',
            type: 'create_creative',
          },
        ],
      };

      setMessages((prev) => [...prev, mitraMsg]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="flex w-screen max-w-md flex-col border-l border-neutral-200 bg-white shadow-2xl">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-brand-100 border-brand-200 flex h-10 w-10 items-center justify-center rounded-2xl border">
                <MitraMascot pose="explain" size="sm" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-neutral-900">Mitra Assistant</h2>
                  <span className="bg-brand-100 text-brand-700 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold">
                    PRO
                  </span>
                </div>
                <p className="max-w-[200px] truncate text-xs font-medium text-neutral-500">
                  Context: {pageContext?.pageTitle || pathname}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/assistant">
                <button
                  type="button"
                  title="Expand to Full Assistant Hub"
                  className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700"
                >
                  ↗️
                </button>
              </Link>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Assistant Drawer"
                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-neutral-50/40 p-4">
            {messages.map((msg) => (
              <AssistantMessageItem key={msg.id} message={msg} />
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-neutral-400 italic">
                <MitraMascot pose="thinking" size="sm" />
                <span>Mitra is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="space-y-2 border-t border-neutral-100 bg-white p-3">
            <div className="flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-1">
              {DRAWER_QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(qp.prompt)}
                  className="hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 flex shrink-0 items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 transition-colors"
                >
                  <span>{qp.icon}</span>
                  <span>{qp.label}</span>
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Mitra on this page..."
                className="focus:border-brand-500 flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
              <Button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTyping}
                size="sm"
                className="rounded-xl text-xs font-bold"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
