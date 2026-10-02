'use client';

import { useState, KeyboardEvent } from 'react';
import type { AssistantPageContext } from '../types';
import { Button } from '@/components/ui/Button';
import { MitraMascot } from '@/components/mascot/MitraMascot';

interface AssistantComposerProps {
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  activeContext?: AssistantPageContext;
  quickPrompts?: { label: string; prompt: string; icon?: string }[];
  placeholder?: string;
}

const DEFAULT_QUICK_PROMPTS = [
  { icon: '✨', label: 'Festival Offer Ideas', prompt: 'Give me 3 Diwali festival offer ideas tailored for my business.' },
  { icon: '📢', label: 'WhatsApp Broadcast', prompt: 'Write a high-converting WhatsApp message for repeat customers.' },
  { icon: '🍛', label: 'Promote Best Product', prompt: 'Create a social media campaign to promote my top-selling item this weekend.' },
  { icon: '🧠', label: 'Update Brand Tone', prompt: 'How can I update my brand voice in Business Brain to sound more festive?' },
];

export function AssistantComposer({
  onSendMessage,
  isLoading = false,
  activeContext,
  quickPrompts = DEFAULT_QUICK_PROMPTS,
  placeholder = 'Ask Mitra anything about your marketing, products, campaigns, or strategy...',
}: AssistantComposerProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSendMessage(text.trim());
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      {/* Active Context Banner */}
      {activeContext && (
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2 text-xs">
          <div className="flex items-center gap-2 text-neutral-600 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Context:</span>
            <span className="font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md">
              {activeContext.pageTitle || activeContext.route}
            </span>
            {activeContext.selectedProduct && (
              <span className="text-brand-600 font-semibold">
                ({activeContext.selectedProduct.name})
              </span>
            )}
          </div>
          <span className="text-[11px] text-neutral-400">Mitra knows your business</span>
        </div>
      )}

      {/* Quick Prompt Chips */}
      {quickPrompts.length > 0 && !text && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(qp.prompt)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              <span>{qp.icon || '💬'}</span>
              <span>{qp.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input Field & Submit Button */}
      <div className="relative flex items-end gap-3">
        <div className="relative flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={2}
            className="w-full resize-none rounded-xl border border-neutral-200 p-3 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <div className="absolute right-3 bottom-3 opacity-60">
            <MitraMascot pose={isLoading ? 'thinking' : text ? 'curious' : 'idle'} size="sm" />
          </div>
        </div>

        <Button
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          className="h-11 px-5 font-bold rounded-xl shrink-0"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Thinking...
            </span>
          ) : (
            'Ask Mitra'
          )}
        </Button>
      </div>

      <div className="flex items-center justify-between text-[11px] text-neutral-400 font-medium px-1">
        <span>Press <kbd className="font-sans px-1 bg-neutral-100 rounded border">Enter</kbd> to send, <kbd className="font-sans px-1 bg-neutral-100 rounded border">Shift+Enter</kbd> for new line</span>
        <span>Powered by Mitra AI Architecture</span>
      </div>
    </div>
  );
}
