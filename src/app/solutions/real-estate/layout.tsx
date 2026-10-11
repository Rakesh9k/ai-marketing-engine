import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

// The page itself is a client component, which cannot export `metadata`.
export const metadata: Metadata = pageMetadata({
  title: 'Real Estate Marketing — Mitra',
  description:
    'Turn property photos into qualified site visits with showcase cards, WhatsApp visit invites and social campaigns.',
  path: '/solutions/real-estate',
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
