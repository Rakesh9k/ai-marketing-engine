'use client';

import { useEffect, useState, useId } from 'react';
import { useReducedMotion } from 'motion/react';

interface ScrollReactiveBackgroundProps {
  children?: React.ReactNode;
  mousePos?: { x: number; y: number };
  scrollVelocity?: number;
}

export function ScrollReactiveBackground({
  children,
  mousePos = { x: 0, y: 0 },
  scrollVelocity = 0,
}: ScrollReactiveBackgroundProps) {
  const reduceMotion = useReducedMotion();
  const patternId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Clamped parallax values
  const bgX = reduceMotion ? 0 : mousePos.x * 0.15;
  const bgY = reduceMotion ? 0 : mousePos.y * 0.15 + scrollVelocity * 0.3;

  const particleX = reduceMotion ? 0 : mousePos.x * 0.45;
  const particleY = reduceMotion ? 0 : mousePos.y * 0.45 + scrollVelocity * 0.7;

  return (
    <div className="relative min-h-screen bg-[#FDFBF8] text-[#1A1A1E] overflow-x-hidden font-sans selection:bg-[#E84D1A]/20 selection:text-[#E84D1A]">
      {/* Dynamic Background Atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-transform duration-300 ease-out"
        style={{
          transform: `translate3d(${bgX}px, ${bgY}px, 0)`,
        }}
      >
        {/* Soft Orange & Warm Amber Radial Glows */}
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-[#E84D1A]/10 via-amber-200/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[550px] h-[550px] bg-gradient-to-bl from-orange-400/10 via-amber-100/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-gradient-to-tr from-[#E84D1A]/8 to-amber-300/10 rounded-full blur-3xl" />

        {/* Subtle Dotted Grid Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.035]" aria-hidden="true">
          <defs>
            <pattern id={patternId} width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="#1A1A1E" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>

        {/* SVG Decorative Hand-drawn Accent Lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-25"
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle curved floating accent path */}
          <path
            d="M -100 200 Q 300 100 600 250 T 1300 200"
            stroke="#E84D1A"
            strokeWidth="1"
            strokeDasharray="4 8"
            opacity="0.5"
          />
          <path
            d="M 200 800 Q 700 900 1200 750"
            stroke="#E84D1A"
            strokeWidth="1"
            strokeDasharray="6 6"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Floating Low-Opacity Particles Layer */}
      {mounted && !reduceMotion && (
        <div
          className="fixed inset-0 pointer-events-none z-0 transition-transform duration-500 ease-out"
          style={{
            transform: `translate3d(${particleX}px, ${particleY}px, 0)`,
          }}
        >
          {/* Drifting decorative particle dots & marks */}
          <div className="absolute top-16 left-[10%] w-2 h-2 rounded-full bg-[#E84D1A]/30 animate-pulse" />
          <div className="absolute top-32 right-[15%] w-3 h-3 rounded-full bg-amber-400/25 animate-ping" />
          <div className="absolute top-2/3 left-[8%] w-2.5 h-2.5 rounded-full bg-[#E84D1A]/20" />
          <div className="absolute top-1/2 right-[8%] w-2 h-2 rounded-full bg-orange-300/30" />
          <div className="absolute bottom-24 left-[20%] w-3 h-3 rounded-full bg-[#E84D1A]/25" />
          <div className="absolute bottom-36 right-[25%] w-1.5 h-1.5 rounded-full bg-amber-500/40" />

          {/* Small Mitra M accents */}
          <span className="absolute top-28 left-[80%] text-xs font-black text-[#E84D1A]/25 select-none rotate-12">
            m
          </span>
          <span className="absolute top-3/4 left-[15%] text-xs font-black text-[#E84D1A]/20 select-none -rotate-12">
            m
          </span>
        </div>
      )}

      {/* Main Content Layer */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
