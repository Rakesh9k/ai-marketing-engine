'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usageService, subscriptionService } from '@/services/database';
import { MitraShortLogo } from '@/components/ui/MitraShortLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { CommandPalette } from '@/components/motion/CommandPalette';

import { MitraAssistantDrawer } from '@/components/ui/MitraAssistantDrawer';

interface SidebarProps {
  children: ReactNode;
}

/**
 * Primary navigation items re-organized per MVP SaaS specification:
 * 1. Home (/dashboard)
 * 2. Create (/campaigns/new)
 * 3. Campaigns (/campaigns)
 * 4. Creative Studio (/creative)
 * 5. Calendar (/calendar)
 * 6. Business Brain (/business)
 * 7. Analytics (/analytics)
 * Plus More dropdown (Products, Content, WhatsApp, Billing, Settings, Assistant, Help)
 */
const PRIMARY_NAV = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  { name: 'Create', href: '/campaigns/new', icon: CreateIcon },
  { name: 'Campaigns', href: '/campaigns', icon: CampaignsIcon },
  { name: 'Creative Studio', href: '/creative', icon: StudioIcon },
  { name: 'Business Brain', href: '/business', icon: BusinessBrainIcon },
  { name: 'Analytics', href: '/analytics', icon: AnalyticsIcon },
] as const;

const MORE_NAV = [
  { name: 'Products Catalog', href: '/products', icon: '🛍️' },
  { name: 'Instant Content', href: '/content', icon: '✍️' },
  { name: 'WhatsApp Hub', href: '/whatsapp', icon: '💬' },
  { name: 'Billing & Plans', href: '/billing', icon: '💳' },
  { name: 'Settings & Accounts', href: '/settings', icon: '⚙️' },
  { name: 'Mitra Assistant', href: '/assistant', icon: '🤖' },
  { name: 'Help & Guides', href: '/help', icon: '❓' },
] as const;

const ACCOUNT_NAV = [
  { name: 'Instant Content', href: '/content' },
  { name: 'Business Brain', href: '/business' },
  { name: 'Analytics', href: '/analytics' },
  { name: 'Usage & credits', href: '/usage' },
  { name: 'Billing', href: '/billing' },
] as const;

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 11.5 12 4l8 7.5M6 9.5V20h12V9.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CreateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function CampaignsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M8 9.5h8M8 14h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function StudioIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M16 2v4M8 2v4M3 10h18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BusinessBrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function AnalyticsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 20V10M12 20V4M6 20v-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="6" cy="12" r="1.5" fill="currentColor" />
      <circle cx="18" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function useCredits(userId: string | undefined) {
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void (async () => {
      try {
        const [usage, subscription] = await Promise.all([
          usageService.getCurrentPeriod(userId),
          subscriptionService.getByUserId(userId),
        ]);
        if (cancelled) return;
        const included = subscription?.creditsIncluded ?? 100;
        const used = usage?.creditsUsed ?? 0;
        setCreditsRemaining(Math.max(0, included - used));
      } catch {
        // Quiet failure — the credits pill just doesn't render.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return creditsRemaining;
}

export function Sidebar({ children }: SidebarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const creditsRemaining = useCredits(user?.uid);
  const profileRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!profileOpen && !moreOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen, moreOpen]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase();

  const isMoreActive = MORE_NAV.some((item) => pathname?.startsWith(item.href));

  return (
    <div className="bg-bg-primary min-h-screen">
      {/* Top bar — brand mark, primary CTA, credits, theme, profile. */}
      <header className="bg-bg-primary/90 fixed inset-x-0 top-0 z-40 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            aria-label="Mitra — Home"
            className="transition-transform hover:scale-105 active:scale-95"
          >
            <MitraShortLogo size="md" decorative />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <CommandPalette />
            <Link
              href="/campaigns/new"
              className="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>＋ Create with Mitra</span>
            </Link>

            {creditsRemaining !== null && (
              <Link
                href="/usage"
                className="border-border-light text-text-secondary hover:text-text-primary hover:border-border-medium hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98] sm:inline-flex"
              >
                <span
                  className="bg-brand-500 h-1.5 w-1.5 animate-pulse rounded-full"
                  aria-hidden="true"
                />
                {creditsRemaining} credits
              </Link>
            )}

            <ThemeToggle />

            <div className="relative" ref={profileRef}>
              <motion.button
                onClick={() => setProfileOpen((open) => !open)}
                whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                className="bg-bg-tertiary text-text-primary hover:bg-border-light flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm font-semibold transition-colors"
                aria-label="Account menu"
                aria-expanded={profileOpen}
                aria-haspopup="true"
              >
                {initial}
              </motion.button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    role="menu"
                    initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="border-border-light bg-surface absolute top-full right-0 z-10 mt-2 w-56 origin-top-right rounded-xl border p-1.5 shadow-lg"
                  >
                    <div className="border-border-light mb-1 border-b px-3 py-2">
                      <p className="text-text-primary truncate text-sm font-medium">
                        {user?.displayName || 'Your account'}
                      </p>
                      <p className="text-text-tertiary truncate text-xs">{user?.email}</p>
                    </div>
                    {ACCOUNT_NAV.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="text-text-secondary hover:bg-bg-secondary hover:text-text-primary block rounded-lg px-3 py-2 text-sm transition-colors"
                      >
                        {item.name}
                      </Link>
                    ))}
                    <a
                      href="mailto:support@brain-wise.com"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="text-text-secondary hover:bg-bg-secondary hover:text-text-primary block rounded-lg px-3 py-2 text-sm transition-colors"
                    >
                      Help &amp; support
                    </a>
                    <button
                      role="menuitem"
                      onClick={handleLogout}
                      className="text-error-600 hover:bg-error-50 mt-1 w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-colors"
                    >
                      Log out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-24 pb-28 sm:px-6 lg:px-8 lg:pt-28">
        {children}
      </main>

      {/* Floating navigation pill — Re-organized main navigation items */}
      <nav
        aria-label="Main navigation"
        className="border-border-light bg-surface/95 fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit items-center gap-0.5 rounded-full border p-1.5 shadow-lg backdrop-blur sm:bottom-6 sm:gap-1"
      >
        {PRIMARY_NAV.map((item) => {
          const isActive =
            item.href === '/campaigns/new'
              ? pathname?.startsWith('/campaigns/new')
              : item.href === '/campaigns'
                ? pathname === '/campaigns' || /^\/campaigns\/(?!new)/.test(pathname || '')
                : item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition-colors sm:px-3.5 ${
                isActive
                  ? 'font-semibold text-white'
                  : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="activeNavPill"
                  className="bg-brand-500 absolute inset-0 rounded-full"
                  transition={
                    reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }
                  }
                />
              )}
              <item.icon className="relative z-10 h-[18px] w-[18px] flex-shrink-0" />
              <span className="relative z-10 hidden md:inline">{item.name}</span>
            </Link>
          );
        })}

        {/* More Dropdown */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            aria-label="More options"
            className={`relative flex items-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-medium transition-colors ${
              isMoreActive || moreOpen
                ? 'bg-brand-500 font-semibold text-white'
                : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
            }`}
          >
            <MoreIcon className="h-[18px] w-[18px] flex-shrink-0" />
            <span className="hidden md:inline">More</span>
          </button>

          <AnimatePresence>
            {moreOpen && (
              <motion.div
                role="menu"
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="border-border-light bg-surface absolute right-0 bottom-full z-50 mb-2 w-52 origin-bottom-right rounded-xl border p-1.5 shadow-xl"
              >
                <div className="border-border-light mb-1 border-b px-3 py-1.5">
                  <p className="text-text-tertiary text-xs font-semibold tracking-wider uppercase">
                    Additional Tools
                  </p>
                </div>
                {MORE_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className="text-text-secondary hover:bg-bg-secondary hover:text-text-primary flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Floating AI Assistant Drawer */}
      <MitraAssistantDrawer />
    </div>
  );
}
