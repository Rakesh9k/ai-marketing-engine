'use client';

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
      title: 'WhatsApp Offer Message',
      category: 'Ready to Share',
      accent: 'border-green-200 bg-green-50/90 text-green-900',
      tag: '💬 Share',
      bottom: '15%',
      right: '-15%',
      rotation: -7,
      depth: 1.5,
      icon: '📱',
    },
  ];

  return (
    <div className="grid min-h-[75vh] grid-cols-1 items-center gap-8 lg:grid-cols-12">
      {/* Left Column: Headlines & Story intro */}
      <div className="z-20 flex flex-col justify-center gap-5 lg:col-span-6">
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50 px-3.5 py-1.5 text-xs font-extrabold tracking-wider text-[#E84D1A] uppercase">
            <span className="h-2 w-2 animate-ping rounded-full bg-[#E84D1A]" />
            <span>CHAPTER 1 — Let&apos;s Meet</span>
          </div>

          <h1 className="text-3xl leading-[1.15] font-black tracking-tight text-[#1A1A1E] sm:text-4xl lg:text-5xl">
            Hi there! <br />
            <span className="bg-gradient-to-r from-[#E84D1A] via-orange-600 to-amber-600 bg-clip-text text-transparent">
              Let&apos;s get your business on the map.
            </span>
          </h1>

          <p className="max-w-lg text-base leading-relaxed text-neutral-600 sm:text-lg">
            In just a few steps, we&apos;ll set up your business and create personalized marketing
            campaigns that bring real customers, real orders and real growth.
          </p>
        </motion.div>

        {/* Hand-drawn styled annotation tip */}
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="relative inline-flex max-w-md items-center gap-2 rounded-2xl border border-amber-200/70 bg-amber-50/90 px-4 py-2.5 text-xs font-semibold text-amber-900 shadow-xs"
        >
          <span className="text-base">✨</span>
          <span>
            <strong>Small setup. Big results!</strong> Mitra learns your business identity in under
            2 minutes.
          </span>
          <svg
            className="pointer-events-none absolute -bottom-4 left-6 h-5 w-8 text-amber-300"
            viewBox="0 0 40 20"
            fill="none"
          >
            <path
              d="M 5 2 Q 20 18 35 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
          </svg>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex items-center gap-4 pt-4"
        >
          <Button
            type="button"
            onClick={onNext}
            size="lg"
            className="group relative flex cursor-pointer items-center gap-3 rounded-2xl bg-[#E84D1A] px-9 py-4 text-base font-bold text-white shadow-xl shadow-orange-600/25 transition-all hover:scale-[1.02] hover:bg-[#d03f10] active:scale-[0.98]"
          >
            <span>Let&apos;s Go</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Button>
        </motion.div>
      </div>

      {/* Right Column: Character Waving Scene with Floating Cards */}
      <div className="relative flex min-h-[420px] items-center justify-center py-6 lg:col-span-6">
        {/* Ambient Glow behind mascot */}
        <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-tr from-amber-100/50 via-orange-100/40 to-transparent blur-3xl" />

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
              className={`absolute z-10 hidden cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 shadow-lg backdrop-blur-md transition-all md:flex ${card.accent}`}
            >
              <span className="text-xl">{card.icon}</span>
              <div className="text-left">
                <span className="block text-[10px] font-extrabold tracking-wider uppercase opacity-75">
                  {card.category}
                </span>
                <span className="block text-xs font-bold whitespace-nowrap">{card.title}</span>
              </div>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold shadow-2xs">
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
          className="relative z-20 flex max-w-[320px] flex-col items-center sm:max-w-[380px]"
        >
          <Mascot state="waving" size="hero" glow shadow animated priority />
        </motion.div>
      </div>
    </div>
  );
}
