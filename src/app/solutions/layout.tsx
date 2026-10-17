import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

// The page itself is a client component, which cannot export `metadata`.
export const metadata: Metadata = pageMetadata({
  title: 'Local Business Solutions — Mitra',
  description:
    'Marketing built for Indian restaurants, salons and real estate: one photo becomes a campaign pack of posts, WhatsApp promos and offers.',
  path: '/solutions',
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
