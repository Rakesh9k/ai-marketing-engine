'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usageService, subscriptionService } from '@/services/database';
import { MitraMark } from '@/components/ui/MitraMark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface SidebarProps {
  children: ReactNode;
}

/**
 * The primary creative workflow — kept to five destinations so the floating
 * nav pill stays quiet. Usage/Billing are account-adjacent, not creative
 * work, so they live in the profile menu instead (see PRIMARY_NAV below).
 */
const PRIMARY_NAV = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  { name: 'Create', href: '/campaigns/new', icon: CreateIcon },
  { name: 'Campaigns', href: '/campaigns', icon: CampaignsIcon },
  { name: 'Brand', href: '/brand', icon: BrandIcon },
  { name: 'Products', href: '/products', icon: ProductsIcon },
] as const;

const ACCOUNT_NAV = [
  { name: 'Business Profile', href: '/business-profile' },
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

function BrandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}

function ProductsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5ZM4 8l8 4.5M20 8l-8 4.5v8.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
        // Quiet failure — the credits pill just doesn't render. Never blocks navigation.
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
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const creditsRemaining = useCredits(user?.uid);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const initial = (user?.displayName || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="bg-bg-primary min-h-screen">
      {/* Top bar — brand mark, credits, theme, profile. Quiet, not a toolbar. */}
      <header className="bg-bg-primary/90 fixed inset-x-0 top-0 z-40 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" aria-label="Mitra — Home">
            <MitraMark size="md" decorative />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {creditsRemaining !== null && (
              <Link
                href="/usage"
                className="border-border-light text-text-secondary hover:text-text-primary hover:border-border-medium hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:inline-flex"
              >
                <span className="bg-brand-500 h-1.5 w-1.5 rounded-full" aria-hidden="true" />
                {creditsRemaining} credits
              </Link>
            )}

            <ThemeToggle />

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((open) => !open)}
                className="bg-bg-tertiary text-text-primary hover:bg-border-light flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors"
                aria-label="Account menu"
                aria-expanded={profileOpen}
                aria-haspopup="true"
              >
                {initial}
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="border-border-light bg-surface absolute top-full right-0 z-10 mt-2 w-56 rounded-xl border p-1.5 shadow-lg"
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
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="text-error-600 hover:bg-error-50 mt-1 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-24 pb-28 sm:px-6 lg:px-8 lg:pt-28">
        {children}
      </main>

      {/* Floating navigation pill — the whole workflow, always one tap away. */}
      <nav
        aria-label="Main navigation"
        className="border-border-light bg-surface/95 fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit items-center gap-0.5 rounded-full border p-1.5 shadow-lg backdrop-blur sm:bottom-6 sm:gap-1"
      >
        {PRIMARY_NAV.map((item) => {
          // "/campaigns/new" belongs to Create, not Campaigns, even though
          // it's nested under the campaigns route — checked first so the
          // more specific match wins instead of both pills lighting up.
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
              className={`flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition-colors sm:px-4 ${
                isActive
                  ? 'bg-brand-500 text-white'
                  : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
              }`}
            >
              <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
              <span className="hidden sm:inline">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
