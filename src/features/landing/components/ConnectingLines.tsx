'use client';

import { motion, useReducedMotion } from 'motion/react';

export function ConnectingLines() {
  const reduceMotion = useReducedMotion();

  // Curving SVG paths looping gracefully around the mascot and side cards
  const paths = [
    // Top-Left Card -> Mascot Center
    { d: 'M 160 80 C 240 140, 280 180, 360 220', delay: 0 },
    // Mid-Left Card -> Mascot Center
    { d: 'M 180 240 C 260 230, 300 240, 360 240', delay: 0.4 },
    // Lower-Left Card -> Mascot Center
    { d: 'M 170 360 C 240 340, 300 280, 360 260', delay: 0.8 },
    // Top-Right Card -> Mascot Center
    { d: 'M 720 90 C 640 140, 580 180, 520 220', delay: 0.2 },
    // Mid-Right Card -> Mascot Center
    { d: 'M 700 240 C 620 240, 580 240, 520 240', delay: 0.6 },
    // Lower-Right Card -> Mascot Center
    { d: 'M 710 360 C 640 340, 580 280, 520 260', delay: 1.0 },
  ];

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible opacity-70"
      viewBox="0 0 880 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Soft orange stroke gradient */}
        <linearGradient id="orangeLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E84D1A" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#E84D1A" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#E84D1A" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {paths.map((p, idx) => (
        <g key={idx}>
          {/* Static dashed path */}
          <path
            d={p.d}
            stroke="url(#orangeLineGrad)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="opacity-70"
          />

          {/* Animated travelling glow stroke */}
          {!reduceMotion && (
            <motion.path
              d={p.d}
              stroke="#E84D1A"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0.15, pathOffset: 0 }}
              animate={{ pathOffset: [0, 1] }}
              transition={{
                duration: 5.5,
                repeat: Infinity,
                ease: 'linear',
                delay: p.delay,
              }}
              strokeDasharray="0.15 0.85"
            />
          )}
        </g>
      ))}

      {/* Orbiting halo rings behind mascot */}
      <motion.circle
        cx="440"
        cy="230"
        r="140"
        stroke="#E84D1A"
        strokeWidth="1"
        strokeOpacity="0.2"
        strokeDasharray="6 8"
        animate={reduceMotion ? {} : { rotate: 360 }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '440px 230px' }}
      />
      <motion.circle
        cx="440"
        cy="230"
        r="190"
        stroke="#E84D1A"
        strokeWidth="1"
        strokeOpacity="0.12"
        strokeDasharray="8 12"
        animate={reduceMotion ? {} : { rotate: -360 }}
        transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '440px 230px' }}
      />
    </svg>
  );
}
