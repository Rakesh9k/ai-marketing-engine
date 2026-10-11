'use client';

import { motion } from 'motion/react';

interface BrainNode {
  id: string;
  label: string;
  value: string;
  icon: string;
  completed: boolean;
}

const DEFAULT_NODES: BrainNode[] = [
  {
    id: '1',
    label: 'Business Type',
    value: 'Restaurant & Cloud Kitchen',
    icon: '🍽️',
    completed: true,
  },
  { id: '2', label: 'Primary Location', value: 'Kondapur, Hyderabad', icon: '📍', completed: true },
  {
    id: '3',
    label: 'Target Audience',
    value: 'Families & IT Professionals',
    icon: '👥',
    completed: true,
  },
  {
    id: '4',
    label: 'Brand Voice',
    value: 'Warm, Authentic & Festive',
    icon: '🗣️',
    completed: true,
  },
  {
    id: '5',
    label: 'Product Catalog',
    value: '12 Menu Items Uploaded',
    icon: '🍱',
    completed: true,
  },
  {
    id: '6',
    label: 'Marketing Offers',
    value: 'Flat 20% OFF Weekend Special',
    icon: '🏷️',
    completed: false,
  },
];

export function BusinessBrainGraph({ nodes = DEFAULT_NODES }: { nodes?: BrainNode[] }) {
  const completedCount = nodes.filter((n) => n.completed).length;
  const percentage = Math.round((completedCount / nodes.length) * 100);

  return (
    <div className="rounded-3xl border border-neutral-200/80 bg-white/90 p-6 shadow-xl backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-900/90">
      {/* Header & Completeness Bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center dark:border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E84D1A]/10 px-3 py-1 text-xs font-semibold text-[#E84D1A]">
            🧠 Active Business Brain
          </div>
          <h3 className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">
            Mitra Marketing Intelligence
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-2.5 w-36 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#E84D1A]"
            />
          </div>
          <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
            {percentage}%
          </span>
        </div>
      </div>

      {/* Interconnected Visual Nodes */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {nodes.map((node, idx) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            whileHover={{ y: -3, scale: 1.02 }}
            className={`relative rounded-2xl border p-4 transition ${
              node.completed
                ? 'border-neutral-200 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-900'
                : 'border-dashed border-amber-300 bg-amber-50/40 dark:border-amber-700/50 dark:bg-amber-950/20'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-xl">{node.icon}</span>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  node.completed
                    ? 'bg-emerald-500 text-white'
                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}
              >
                {node.completed ? '✓' : '!'}
              </span>
            </div>
            <h4 className="mt-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {node.label}
            </h4>
            <p className="mt-0.5 truncate text-xs font-bold text-neutral-900 dark:text-white">
              {node.value}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
