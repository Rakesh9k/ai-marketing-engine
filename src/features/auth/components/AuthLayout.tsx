'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { MitraMark } from '@/components/ui/MitraMark';
import { MitraLogo } from '@/components/ui/MitraLogo';

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
      <header className="border-border-light bg-bg-primary border-b">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <Link href="/" aria-label="AI Marketing Engine Home">
            <MitraMark size="lg" decorative />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <MitraLogo size="md" className="mb-8" />
          <div className="mb-8 text-center">
            <h1 className="text-h2 text-text-primary font-bold">{title}</h1>
            <p className="text-body text-text-secondary mt-2">{description}</p>
          </div>

          <div className="border-border-light bg-surface rounded-2xl border p-8 shadow-sm">
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

      <footer className="border-border-light bg-bg-primary border-t">
        <div className="text-caption text-text-tertiary mx-auto max-w-md px-4 py-4 text-center">
          © {new Date().getFullYear()} AI Marketing Engine. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
