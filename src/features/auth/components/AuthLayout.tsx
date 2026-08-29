'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function AuthLayout({
  children,
  title = 'AI Marketing Engine',
  description = 'One Photo + One Offer → Complete Local Campaign',
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <Link
            href="/"
            className="text-brand-600 flex items-center gap-2 text-xl font-bold"
            aria-label="AI Marketing Engine Home"
          >
            <svg
              className="h-8 w-8"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect width="32" height="32" rx="8" fill="currentColor" />
              <path
                d="M8 16L14 22L24 10"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="hidden sm:block">AI Marketing Engine</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-h2 text-text-primary font-bold">{title}</h1>
            <p className="text-body text-text-secondary mt-2">{description}</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
            {children}
          </div>

          <p className="text-caption text-text-tertiary mt-6 text-center">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-brand-600 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-brand-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="text-caption text-text-tertiary mx-auto max-w-md px-4 py-4 text-center">
          © {new Date().getFullYear()} AI Marketing Engine. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
