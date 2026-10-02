'use client';

import { useState } from 'react';
import { PersistentMitraDrawer } from '@/features/assistant/components/PersistentMitraDrawer';
import { MitraMascot } from '@/components/mascot/MitraMascot';

export function MitraAssistantDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open Mitra AI Assistant"
        className="fixed right-6 bottom-6 z-40 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3 text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:outline-none"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
          <MitraMascot pose="idea" size="sm" />
        </div>
        <span className="text-xs font-bold tracking-wide">Ask Mitra</span>
        <span className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
      </button>

      {/* Persistent Drawer */}
      <PersistentMitraDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
