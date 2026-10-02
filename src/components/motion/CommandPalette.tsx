'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Mascot } from '../mascot/Mascot';

interface CommandItem {
  id: string;
  title: string;
  category: 'Campaign' | 'Assistant' | 'Settings' | 'Business';
  icon: string;
  href: string;
  description: string;
}

const COMMAND_ITEMS: CommandItem[] = [
  {
    id: 'cmd_1',
    title: 'Create a New Campaign',
    category: 'Campaign',
    icon: '🚀',
    href: '/campaigns/new',
    description: 'Launch AI ad campaign generator for your business',
  },
  {
    id: 'cmd_2',
    title: 'Generate Social Post',
    category: 'Campaign',
    icon: '✨',
    href: '/creative/image',
    description: 'Design brand-consistent visual post with localized copy',
  },
  {
    id: 'cmd_3',
    title: 'Create Marketing Reel',
    category: 'Campaign',
    icon: '🎬',
    href: '/creative/reel',
    description: 'Build short video storyboard and scene direction',
  },
  {
    id: 'cmd_4',
    title: 'Ask Mitra Assistant',
    category: 'Assistant',
    icon: '💬',
    href: '/assistant',
    description: 'Get AI recommendations & marketing strategy advice',
  },
  {
    id: 'cmd_5',
    title: 'Update Business Brain',
    category: 'Business',
    icon: '🧠',
    href: '/business-profile',
    description: 'Refine location, audience, tone, and brand preferences',
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  // Command + K or Ctrl + K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const filtered = COMMAND_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item: CommandItem) => {
    setOpen(false);
    router.push(item.href);
  };

  return (
    <>
      {/* Quick Access Trigger Button for Navbar / Header */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-100/80 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
      >
        <span className="text-sm">⚡</span>
        <span className="hidden sm:inline">Ask Mitra Quick Action</span>
        <kbd className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-mono font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          ⌘K
        </kbd>
      </button>

      {/* Modal Surface */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Command Box Surface */}
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 26 }}
              className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 text-white shadow-2xl z-10"
            >
              {/* Header with Search Input & Mascot */}
              <div className="flex items-center gap-3 border-b border-neutral-800 px-4 py-3.5">
                <Mascot state="helper" size="xs" animated={false} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type a command or ask Mitra..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none font-medium"
                />
                <kbd className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-mono text-neutral-400">
                  ESC
                </kbd>
              </div>

              {/* Items List */}
              <div className="max-h-80 overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    No matching actions found. Try searching &quot;campaign&quot; or &quot;post&quot;.
                  </div>
                ) : (
                  filtered.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left transition ${
                        selectedIndex === idx
                          ? 'bg-[#E84D1A] text-white'
                          : 'text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{item.icon}</span>
                        <div>
                          <p className="text-xs font-bold leading-tight">{item.title}</p>
                          <p
                            className={`text-[11px] leading-tight mt-0.5 ${
                              selectedIndex === idx ? 'text-white/80' : 'text-neutral-400'
                            }`}
                          >
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider rounded px-2 py-0.5 ${
                          selectedIndex === idx
                            ? 'bg-white/20 text-white'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {item.category}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
