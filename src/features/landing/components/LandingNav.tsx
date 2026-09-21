'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StyledLink } from '@/components/ui/Link';
import { Button } from '@/components/ui/Button';
import { MitraLogo } from '@/components/ui/MitraLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const SECTION_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#what-you-get', label: 'What it creates' },
  { href: '#pricing', label: 'Pricing' },
];

export function LandingNav() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-border-light bg-bg-primary/95 sticky top-0 z-50 border-b backdrop-blur">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"
        aria-label="Primary"
      >
        <a href="#top" aria-label="Mitra — Your AI Marketing Partner">
          <MitraLogo size="sm" decorative />
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-text-secondary hover:text-text-primary text-sm font-medium transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <StyledLink href="/login" variant="secondary" size="sm">
            Login
          </StyledLink>
          <Button size="sm" onClick={() => router.push('/signup')}>
            Get Started
          </Button>
        </div>

        <button
          type="button"
          className="text-text-primary inline-flex h-10 w-10 items-center justify-center rounded-md md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? (
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-border-light bg-bg-primary border-t px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {SECTION_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-text-secondary hover:bg-bg-secondary rounded-md px-2 py-3 text-sm font-medium"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex items-center justify-between gap-2 pt-2">
              <span className="text-text-tertiary text-xs">Theme</span>
              <ThemeToggle />
            </div>
            <div className="flex flex-col gap-2">
              <StyledLink href="/login" variant="secondary" size="md" className="text-center">
                Login
              </StyledLink>
              <Button fullWidth onClick={() => router.push('/signup')}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
