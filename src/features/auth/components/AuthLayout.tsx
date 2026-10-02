'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { MitraLogo } from '@/components/ui/MitraLogo';
import { Mascot } from '@/components/mascot/Mascot';

export type AuthViewMode = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'verify-email';

interface AuthLayoutProps {
  children: ReactNode;
  mode?: AuthViewMode;
  title?: string;
  subtitle?: string;
  topRightLink?: { text: string; href: string; label: string };
}

const VIEW_CONFIGS: Record<
  AuthViewMode,
  {
    handwritten: string;
    mascotState: string;
    mascotAlt: string;
    headline: string;
    description: string;
    badges: { icon: string; title: string; sub?: string }[];
    creativeCards: { title: string; tag: string; image: string; color: string }[];
  }
> = {
  login: {
    handwritten: 'Good to see you again!',
    mascotState: 'waving',
    mascotAlt: 'Mitra mascot waving hello',
    headline: 'Your Business. Our AI Marketing Partner.',
    description:
      'Log in to continue creating campaigns, connecting with customers and growing your business.',
    badges: [
      { icon: '⚡', title: 'AI-Powered Campaigns' },
      { icon: '🗣️', title: 'Local Language Support' },
      { icon: '💬', title: 'WhatsApp Integration' },
    ],
    creativeCards: [
      {
        title: 'Glow & Shine Beauty Salon',
        tag: 'Beauty Salon',
        image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=300&q=80',
        color: 'from-pink-500/20 to-purple-500/20',
      },
      {
        title: 'Fresh Biryani Swady',
        tag: 'Flat 20% OFF',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80',
        color: 'from-amber-500/20 to-orange-500/20',
      },
      {
        title: 'Modern Homes',
        tag: 'Real Estate',
        image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80',
        color: 'from-blue-500/20 to-cyan-500/20',
      },
    ],
  },
  signup: {
    handwritten: "Let's get your business growing!",
    mascotState: 'thumbs-up',
    mascotAlt: 'Mitra mascot pointing enthusiastically',
    headline: 'Create Your Account',
    description: 'Start your free journey with Mitra today and transform your local business marketing.',
    badges: [
      { icon: '🎁', title: 'Free Credits', sub: 'Get started instantly' },
      { icon: '💳', title: 'No Credit Card', sub: 'Required' },
      { icon: '🔄', title: 'Cancel Anytime', sub: '(Yes, really!)' },
    ],
    creativeCards: [
      {
        title: 'Special Thali Special',
        tag: 'Restaurant',
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=300&q=80',
        color: 'from-orange-500/20 to-red-500/20',
      },
      {
        title: 'Beauty Self-Care',
        tag: 'Salon & Spa',
        image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=300&q=80',
        color: 'from-rose-500/20 to-pink-500/20',
      },
      {
        title: 'Luxury Homes',
        tag: 'Live The Dream',
        image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=300&q=80',
        color: 'from-emerald-500/20 to-teal-500/20',
      },
    ],
  },
  'forgot-password': {
    handwritten: "Don't worry, it happens!",
    mascotState: 'confused',
    mascotAlt: 'Mitra mascot thinking reassuringly',
    headline: 'Forgot Your Password?',
    description:
      "No worries! Enter your email address and we'll send you a link to recover access to your account.",
    badges: [
      { icon: '🛡️', title: 'Secure & Encrypted' },
      { icon: '⚡', title: 'Quick & Easy' },
    ],
    creativeCards: [
      {
        title: 'Account Recovery',
        tag: 'Instant Link',
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
        color: 'from-amber-500/20 to-brand-500/20',
      },
    ],
  },
  'reset-password': {
    handwritten: 'Almost there! Set your new password.',
    mascotState: 'laptop',
    mascotAlt: 'Mitra mascot working at laptop',
    headline: 'Set New Password',
    description: 'Choose a strong password to keep your account safe and ready for campaigns.',
    badges: [
      { icon: '✓', title: 'At least 8 characters' },
      { icon: '✓', title: 'Include a number' },
      { icon: '✓', title: 'Include a symbol' },
    ],
    creativeCards: [
      {
        title: 'Security Verified',
        tag: 'Strong Password',
        image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=300&q=80',
        color: 'from-emerald-500/20 to-teal-500/20',
      },
    ],
  },
  'verify-email': {
    handwritten: 'Check your inbox!',
    mascotState: 'success',
    mascotAlt: 'Mitra mascot celebrating email verification',
    headline: 'Verify Your Email',
    description:
      "We've sent a verification link to your email address. Click the link to activate your account.",
    badges: [
      { icon: '📬', title: "Didn't receive the email?", sub: 'Check your spam folder or request a new link' },
    ],
    creativeCards: [
      {
        title: 'Email Sent',
        tag: 'Check Inbox',
        image: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&w=300&q=80',
        color: 'from-brand-500/20 to-orange-500/20',
      },
    ],
  },
};

export function AuthLayout({
  children,
  mode = 'login',
  title,
  subtitle,
  topRightLink,
}: AuthLayoutProps) {
  const reduceMotion = useReducedMotion();
  const config = VIEW_CONFIGS[mode] || VIEW_CONFIGS.login;

  // Subtle cursor parallax
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (reduceMotion) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 12,
        y: (e.clientY / window.innerHeight - 0.5) * 12,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [reduceMotion]);

  // Fallback link if not explicitly provided
  const defaultTopRight =
    mode === 'login'
      ? { text: "Don't have an account?", href: '/signup', label: 'Sign up' }
      : mode === 'signup'
      ? { text: 'Already have an account?', href: '/login', label: 'Log in' }
      : { text: 'Remember your password?', href: '/login', label: 'Log in' };

  const linkInfo = topRightLink || defaultTopRight;

  return (
    <div className="relative min-h-screen w-full bg-[#FDFBF8] text-[#1A1A1E] font-sans antialiased overflow-x-hidden selection:bg-brand-500/20 selection:text-brand-600 flex flex-col justify-between">
      {/* Background Grid & Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `radial-gradient(#E84D1A 0.75px, transparent 0.75px)`,
            backgroundSize: '24px 24px',
          }}
        />
        {/* Soft orange radial glows */}
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute right-10 top-1/3 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-96 w-96 rounded-full bg-orange-400/10 blur-3xl" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-6 lg:px-8 py-6 lg:py-10 justify-center">
        {/* Header bar with Brand Logo and Auth Mode Switcher */}
        <header className="mb-6 lg:mb-10 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg">
            <MitraLogo size="md" />
          </Link>
          <div className="text-xs sm:text-sm text-[#5C5C66]">
            <span>{linkInfo.text}</span>{' '}
            <Link
              href={linkInfo.href}
              className="font-semibold text-[#E84D1A] hover:underline hover:text-brand-700 transition-colors"
            >
              {linkInfo.label}
            </Link>
          </div>
        </header>

        {/* Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Hero Storytelling Panel (Desktop) / Header Accent (Mobile) */}
          <motion.div
            className="lg:col-span-6 flex flex-col justify-center relative"
            initial={reduceMotion ? false : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Handwritten Cursive Callout Accent */}
            <div className="relative mb-3 inline-block">
              <motion.span
                className="inline-flex items-center gap-2 font-serif italic text-lg sm:text-xl text-[#E84D1A] font-semibold tracking-wide"
                animate={reduceMotion ? {} : { y: [0, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span>✨ {config.handwritten}</span>
                <svg className="h-4 w-12 text-[#E84D1A]/40" viewBox="0 0 100 20" fill="none">
                  <path d="M0 10 Q 25 0, 50 10 T 100 10" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </motion.span>
            </div>

            {/* Visual Mascot & Creative Cards Stack */}
            <div className="relative my-4 sm:my-6 min-h-[260px] sm:min-h-[340px] w-full flex items-center justify-center">
              {/* Parallax Container */}
              <motion.div
                className="relative w-full max-w-lg flex items-center justify-center"
                style={{
                  transform: reduceMotion
                    ? undefined
                    : `translate3d(${mousePos.x}px, ${mousePos.y}px, 0)`,
                }}
              >
                {/* Background Card Shapes */}
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-orange-100/40 via-amber-50/50 to-white/60 backdrop-blur-sm border border-orange-200/30 shadow-inner -rotate-1" />

                {/* Floating Creative Cards */}
                {config.creativeCards[0] && (
                  <motion.div
                    className="absolute -top-4 -left-2 sm:left-2 z-10 w-44 sm:w-52 rounded-2xl bg-white p-2.5 shadow-lg border border-neutral-100/80 -rotate-6"
                    animate={reduceMotion ? {} : { y: [0, -6, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                        <Image
                          src={config.creativeCards[0].image}
                          alt={config.creativeCards[0].title}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                      <div className="overflow-hidden">
                        <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                          {config.creativeCards[0].tag}
                        </span>
                        <p className="truncate text-xs font-semibold text-neutral-800">
                          {config.creativeCards[0].title}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {config.creativeCards[1] && (
                  <motion.div
                    className="absolute top-12 -right-2 sm:right-0 z-10 w-40 sm:w-48 rounded-2xl bg-white p-2.5 shadow-lg border border-neutral-100/80 rotate-6"
                    animate={reduceMotion ? {} : { y: [0, 6, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                        <Image
                          src={config.creativeCards[1].image}
                          alt={config.creativeCards[1].title}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                      <div className="overflow-hidden">
                        <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          {config.creativeCards[1].tag}
                        </span>
                        <p className="truncate text-xs font-semibold text-neutral-800">
                          {config.creativeCards[1].title}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Floating WhatsApp Bubble */}
                <motion.div
                  className="absolute bottom-4 left-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md"
                  animate={reduceMotion ? {} : { scale: [1, 1.08, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.705 1.754zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.15 4.2 4.293-1.125z" />
                  </svg>
                </motion.div>

                {/* Main 3D Mascot Image */}
                <div className="relative z-15 flex items-center justify-center">
                  <Mascot
                    state={config.mascotState}
                    alt={config.mascotAlt}
                    size="2xl"
                    shadow
                    glow
                    animated
                    priority
                  />
                </div>
              </motion.div>
            </div>

            {/* Left Headline & Subtitle */}
            <div className="mt-2 text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#1A1A1E]">
                {config.headline}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-[#5C5C66] max-w-md mx-auto lg:mx-0 leading-relaxed">
                {config.description}
              </p>

              {/* Feature/Trust Badges */}
              <div className="mt-5 flex flex-wrap gap-2.5 justify-center lg:justify-start">
                {config.badges.map((b, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#1A1A1E] border border-orange-100 shadow-2xs"
                  >
                    <span>{b.icon}</span>
                    <span className="font-semibold">{b.title}</span>
                    {b.sub && <span className="text-[#757580]">({b.sub})</span>}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Authentication Panel */}
          <motion.div
            className="lg:col-span-6 w-full max-w-md mx-auto"
            initial={reduceMotion ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          >
            {/* Card Container */}
            <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-xl shadow-orange-950/5 border border-[#F0EBE1] relative">
              {/* Top Card Title if supplied */}
              {(title || subtitle) && (
                <div className="mb-6">
                  {title && <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1E]">{title}</h2>}
                  {subtitle && <p className="mt-1 text-sm text-[#5C5C66]">{subtitle}</p>}
                </div>
              )}

              {/* Form Component Children */}
              {children}
            </div>

            {/* Legal Trust Links */}
            <p className="mt-6 text-center text-xs text-[#757580]">
              By continuing, you agree to Mitra&apos;s{' '}
              <Link href="/terms" className="font-medium text-[#E84D1A] hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="font-medium text-[#E84D1A] hover:underline">
                Privacy Policy
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#F0EBE1]/60 py-4 text-center text-xs text-[#757580]">
        <div className="mx-auto max-w-7xl px-4">
          © {new Date().getFullYear()} Mitra by Brainwise. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
