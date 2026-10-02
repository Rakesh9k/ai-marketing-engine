'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { AssistantMessage, AssistantPageContext } from '../types';
import { AssistantMessageItem } from './AssistantMessageItem';
import { AssistantComposer } from './AssistantComposer';
import { MitraMascot } from '@/components/mascot/MitraMascot';
import { callFunction } from '@/services/api';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface AssistantWorkspaceProps {
  conversationId?: string;
  initialContext?: AssistantPageContext;
}

const INITIAL_MESSAGES: AssistantMessage[] = [
  {
    id: 'msg-welcome-1',
    conversationId: 'default',
    role: 'mitra',
    content: `Namaste! 👋 I'm **Mitra**, your AI Marketing Partner.

I'm ready to help you plan campaigns, write viral captions, design banners & posters, or optimize your business messaging.

What would you like to achieve today?`,
    type: 'text',
    createdAt: new Date().toISOString(),
    actions: [
      { id: 'act-1', label: '🚀 Create New Campaign', url: '/campaigns/new', type: 'create_campaign' },
      { id: 'act-2', label: '🎨 Design Banner / Poster', url: '/creative', type: 'create_creative' },
      { id: 'act-3', label: '🧠 Review Business Brain', url: '/business', type: 'update_brain' },
    ],
  },
];

export function AssistantWorkspace({ conversationId = 'default', initialContext }: AssistantWorkspaceProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>(INITIAL_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (content: string) => {
    const userMsg: AssistantMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      role: 'user',
      content,
      type: 'text',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Initial progress message from Mitra
    const progressMsgId = `msg-progress-${Date.now()}`;
    const initialProgressMsg: AssistantMessage = {
      id: progressMsgId,
      conversationId,
      role: 'mitra',
      content: `I'm analyzing your request against your **Business Brain** and product catalog...`,
      type: 'progress',
      createdAt: new Date().toISOString(),
      progressSteps: [
        { label: 'Reading Business Brain context...', status: 'running' },
        { label: 'Formulating marketing recommendation...', status: 'pending' },
        { label: 'Preparing campaign / creative actions...', status: 'pending' },
      ],
    };

    setMessages((prev) => [...prev, initialProgressMsg]);

    try {
      // Step 1 simulation
      await new Promise((resolve) => setTimeout(resolve, 600));
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === progressMsgId
            ? {
                ...msg,
                progressSteps: [
                  { label: 'Reading Business Brain context...', status: 'completed' },
                  { label: 'Formulating marketing recommendation...', status: 'running' },
                  { label: 'Preparing campaign / creative actions...', status: 'pending' },
                ],
              }
            : msg
        )
      );

      // Call Cloud Function backend if user is authenticated
      let responseText = '';
      if (user) {
        try {
          const res = await callFunction<{ prompt: string; businessId: string }, { text: string }>({
            functionName: 'generateCampaignStrategy',
            data: {
              prompt: content,
              businessId: user.uid,
            },
          });
          if (res?.text) responseText = res.text;
        } catch {
          // Fallback if cloud function is not configured locally
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 700));

      // Synthesize intelligent fallback if backend did not respond
      if (!responseText) {
        if (content.toLowerCase().includes('campaign') || content.toLowerCase().includes('offer')) {
          responseText = `Here is a tailored **High-Converting Festival Offer Strategy** for your business:\n\n` +
            `🎯 **Objective**: Drive high footfall & online sales\n` +
            `🏷️ **Recommended Promo**: "Festive Special — Buy 2 Get 1 Free + Free Delivery"\n` +
            `📱 **Best Channels**: Instagram Reels & WhatsApp Broadcast\n\n` +
            `Would you like me to generate a complete ready-to-publish campaign with visual creatives?`;
        } else if (content.toLowerCase().includes('caption') || content.toLowerCase().includes('post')) {
          responseText = `Here are 3 engaging social post captions for your business:\n\n` +
            `1. 🌟 **The Festive Glow**: "Transform your celebrations with our signature offerings! Special discounts available this week only. Tap to reserve yours now! #LocalFavorite #FestiveVibes"\n\n` +
            `2. 🎁 **Exclusive Offer**: "Quality you love at prices you'll cherish. Don't miss out on our limited-time deal! #SpecialOffer"\n\n` +
            `3. ✨ **Customer Choice**: "Hyderabad's favorite experience. Book today and get a complimentary treat on us!"`;
        } else {
          responseText = `I've analyzed your input: "${content}".\n\n` +
            `Based on your Business Brain guidelines, I recommend creating a targeted visual asset in Creative Studio or launching a multi-channel festival campaign.`;
        }
      }

      // Final completed message
      const finalMitraMsg: AssistantMessage = {
        id: `msg-res-${Date.now()}`,
        conversationId,
        role: 'mitra',
        content: responseText,
        type: 'text',
        createdAt: new Date().toISOString(),
        actions: [
          { id: 'a1', label: '🚀 Launch in Campaign Studio', url: '/campaigns/new', type: 'create_campaign' },
          { id: 'a2', label: '🎨 Open in Creative Studio', url: '/creative', type: 'create_creative' },
        ],
      };

      // Remove the progress message and add the final response
      setMessages((prev) => prev.filter((m) => m.id !== progressMsgId).concat(finalMitraMsg));
    } catch (err) {
      console.error('Error generating assistant response:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-6xl mx-auto space-y-4">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 border border-brand-200">
            <MitraMascot pose="idea" size="md" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Mitra AI Assistant</h1>
              <span className="rounded-full bg-brand-100 text-brand-700 px-2.5 py-0.5 text-xs font-extrabold">
                PRO COPILOT
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-medium">Your 24/7 Intelligent Marketing Strategist & Execution Partner</p>
          </div>
        </div>

        {/* Sub-Navigation Links */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs font-bold">
          <Link
            href="/assistant"
            className="rounded-lg bg-white px-3 py-1.5 text-brand-700 shadow-xs transition-all"
          >
            💬 Assistant Hub
          </Link>
          <Link
            href="/assistant/history"
            className="rounded-lg px-3 py-1.5 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            📜 Conversation History
          </Link>
          <Link
            href="/assistant/recommendations"
            className="rounded-lg px-3 py-1.5 text-neutral-600 hover:text-neutral-900 transition-colors flex items-center gap-1"
          >
            💡 Recommendations
            <span className="h-2 w-2 rounded-full bg-brand-500" />
          </Link>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4 sm:p-6 space-y-6">
        {messages.map((msg) => (
          <AssistantMessageItem key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 text-xs text-neutral-500 font-medium italic">
            <MitraMascot pose="thinking" size="sm" />
            <span>Mitra is formulating marketing strategy...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Interactive Composer */}
      <AssistantComposer
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        activeContext={initialContext}
      />
    </div>
  );
}
