import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

// The page itself is a client component, which cannot export `metadata`.
export const metadata: Metadata = pageMetadata({
  title: 'Restaurant Marketing — Mitra',
  description:
    'Turn one photo of your biryani, thali or special dish into a campaign pack of social posts, WhatsApp promos and offer cards.',
  path: '/solutions/restaurants',
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
