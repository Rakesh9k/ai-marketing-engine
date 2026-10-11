import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

// The page itself is a client component, which cannot export `metadata`.
export const metadata: Metadata = pageMetadata({
  title: 'Salon Marketing — Mitra',
  description:
    'Fill your salon chair every day: beauty offer posters, WhatsApp booking messages and festive campaigns from a single photo.',
  path: '/solutions/salons',
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
