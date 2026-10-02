'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { MitraLogo } from '@/components/ui/MitraLogo';

export function LandingNav() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Create Campaign', href: '/signup' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'My Business', href: '/business' },
    { label: 'Templates', href: '/solutions' },
    { label: 'Analytics', href: '/analytics' },
  ];

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 transition-all duration-300 sm:pt-4">
      <nav
        className={`pointer-events-auto flex items-center justify-between transition-all duration-300 ${
          isScrolled
            ? 'bg-surface/90 border-border-medium w-full max-w-5xl rounded-full border px-4 py-2 shadow-lg backdrop-blur-md'
            : 'bg-surface/75 border-border-light w-full max-w-6xl rounded-full border px-5 py-3 shadow-md backdrop-blur-md'
        }`}
        aria-label="Main Navigation"
      >
        {/* LEFT: LOGO LOCKUP */}
        <div className="flex items-center gap-2">
          <a
            href="#top"
            className="group flex items-center gap-2"
            aria-label="Mitra by Brainwise Home"
          >
            <MitraLogo size="sm" decorative />
            <span className="bg-border-medium hidden h-3.5 w-px sm:inline-block" />
            <span className="text-text-tertiary group-hover:text-text-secondary hidden text-xs font-medium transition-colors sm:inline-block">
              by Brainwise
            </span>
          </a>
        </div>

        {/* CENTER: DESKTOP FLOATING PILL MENU */}
        <div className="bg-bg-secondary/60 border-border-light/60 hidden items-center gap-1 rounded-full border px-3 py-1 md:flex">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => router.push(link.href)}
              className="text-text-secondary hover:text-text-primary hover:bg-surface cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* RIGHT: ACTIONS & THEME TOGGLE */}
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <button
            onClick={() => router.push('/login')}
            className="text-text-secondary hover:text-text-primary cursor-pointer px-2 py-1 text-xs font-semibold transition-colors"
          >
            Sign in
          </button>
          <Button
            size="sm"
            onClick={() => router.push('/signup')}
            className="rounded-full shadow-xs hover:shadow-md"
          >
            Get Started
          </Button>
        </div>

        {/* MOBILE MENU BUTTON */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="bg-bg-secondary text-text-primary border-border-light inline-flex h-9 w-9 items-center justify-center rounded-full border"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="border-border-medium bg-surface/98 pointer-events-auto fixed inset-x-4 top-16 z-50 rounded-3xl border p-6 shadow-2xl backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  setMobileOpen(false);
                  router.push(link.href);
                }}
                className="bg-bg-secondary text-text-primary flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold"
              >
                <span>{link.label}</span>
                <span>→</span>
              </button>
            ))}

            <div className="border-border-light mt-2 flex flex-col gap-2 border-t pt-2">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  router.push('/login');
                }}
                className="border-border-medium text-text-primary w-full rounded-xl border py-3 text-center text-sm font-semibold"
              >
                Sign in
              </button>
              <Button
                fullWidth
                onClick={() => {
                  setMobileOpen(false);
                  router.push('/signup');
                }}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
