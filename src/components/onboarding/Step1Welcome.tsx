'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/mascot/Mascot';

interface Step1WelcomeProps {
  onNext: () => void;
  mousePos?: { x: number; y: number };
}

export function Step1Welcome({ onNext, mousePos = { x: 0, y: 0 } }: Step1WelcomeProps) {
  const reduceMotion = useReducedMotion();

  // Floating campaign cards data
  const floatingCards = [
    {
      id: 'card_restaurant',
      title: 'Biryani Special Offer',
      category: 'Restaurant',
      accent: 'border-amber-200 bg-amber-50/90 text-amber-900',
      tag: '🔥 20% OFF',
      top: '5%',
      left: '-15%',
      rotation: -6,
      depth: 1.2,
      icon: '🍲',
    },
    {
      id: 'card_salon',
      title: 'Hydra Facial Package',
      category: 'Salon & Spa',
      accent: 'border-pink-200 bg-pink-50/90 text-pink-900',
      tag: '✨ Trending',
      top: '12%',
      right: '-18%',
      rotation: 8,
      depth: 1.4,
      icon: '💅',
    },
    {
      id: 'card_realestate',
      title: 'Luxury 3BHK Villa',
      category: 'Real Estate',
      accent: 'border-emerald-200 bg-emerald-50/90 text-emerald-900',
      tag: '🏡 Verified',
      bottom: '22%',
      left: '-18%',
      rotation: 5,
      depth: 1.3,
      icon: '🔑',
    },
    {
      id: 'card_whatsapp',
      title: 'WhatsApp Automation',
      category: 'Direct Booking',
      accent: 'border-green-200 bg-green-50/90 text-green-900',
      tag: '💬 Active',
      bottom: '15%',
      right: '-15%',
      rotation: -7,
      depth: 1.5,
      icon: '📱',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[75vh]">
      {/* Left Column: Headlines & Story intro */}
      <div className="lg:col-span-6 flex flex-col justify-center gap-5 z-20">
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-[#E84D1A] text-xs font-extrabold tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-[#E84D1A] animate-ping" />
            <span>CHAPTER 1 — Let&apos;s Meet</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1A1A1E] tracking-tight leading-[1.15]">
            Hi there! <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E84D1A] via-orange-600 to-amber-600">
              Let&apos;s get your business on the map.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-lg">
            In just a few steps, we&apos;ll set up your business and create personalized marketing
            campaigns that bring real customers, real orders and real growth.
          </p>
        </motion.div>

        {/* Hand-drawn styled annotation tip */}
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="relative inline-flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-50/90 border border-amber-200/70 px-4 py-2.5 rounded-2xl shadow-xs max-w-md"
        >
          <span className="text-base">✨</span>
          <span>
            <strong>Small setup. Big results!</strong> Mitra learns your business identity in
            under 2 minutes.
          </span>
          <svg
            className="absolute -bottom-4 left-6 w-8 h-5 text-amber-300 pointer-events-none"
            viewBox="0 0 40 20"
            fill="none"
          >
            <path d="M 5 2 Q 20 18 35 15" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
          </svg>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="pt-4 flex items-center gap-4"
        >
          <Button
            type="button"
            onClick={onNext}
            size="lg"
            className="group relative px-9 py-4 rounded-2xl bg-[#E84D1A] hover:bg-[#d03f10] text-white text-base font-bold shadow-xl shadow-orange-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-3 cursor-pointer"
          >
            <span>Let&apos;s Go</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Button>
        </motion.div>
      </div>

      {/* Right Column: Character Waving Scene with Floating Cards */}
      <div className="lg:col-span-6 relative flex items-center justify-center py-6 min-h-[420px]">
        {/* Ambient Glow behind mascot */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-100/50 via-orange-100/40 to-transparent rounded-full blur-3xl -z-10" />

        {/* Floating Campaign Cards */}
        {floatingCards.map((card, idx) => {
          const offsetX = reduceMotion ? 0 : mousePos.x * card.depth * 0.4;
          const offsetY = reduceMotion ? 0 : mousePos.y * card.depth * 0.4;

          return (
            <motion.div
              key={card.id}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1, duration: 0.5, ease: 'easeOut' }}
              style={{
                top: card.top,
                bottom: card.bottom,
                left: card.left,
                right: card.right,
                transform: `translate3d(${offsetX}px, ${offsetY}px, 0) rotate(${card.rotation}deg)`,
              }}
              whileHover={reduceMotion ? undefined : { scale: 1.06, y: -6, zIndex: 40 }}
              className={`hidden md:flex absolute z-10 items-center gap-3 px-3.5 py-2.5 rounded-2xl border shadow-lg backdrop-blur-md transition-all cursor-pointer ${card.accent}`}
            >
              <span className="text-xl">{card.icon}</span>
              <div className="text-left">
                <span className="block text-[10px] uppercase font-extrabold tracking-wider opacity-75">
                  {card.category}
                </span>
                <span className="block text-xs font-bold whitespace-nowrap">{card.title}</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 shadow-2xs">
                {card.tag}
              </span>
            </motion.div>
          );
        })}

        {/* Main Mascot Scene */}
        <motion.div
          animate={
            reduceMotion
              ? undefined
              : {
                  y: [0, -8, 0],
                  scale: [1, 1.008, 1],
                }
          }
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative z-20 flex flex-col items-center max-w-[320px] sm:max-w-[380px]"
        >
          <Mascot state="waving" size="hero" glow shadow animated priority />
        </motion.div>
      </div>
    </div>
  );
}
