import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Marketing Engine',
  description:
    'One Photo + One Offer → Complete Local Campaign. AI marketing platform for Indian local businesses.',
  keywords: [
    'AI marketing',
    'campaign generator',
    'Hyderabad restaurants',
    'WhatsApp marketing',
    'local business',
  ],
  authors: [{ name: 'AI Marketing Engine' }],
  creator: 'AI Marketing Engine',
  publisher: 'AI Marketing Engine',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://app.aimarketingengine.in',
    siteName: 'AI Marketing Engine',
    title: 'AI Marketing Engine - Campaign Generator for Indian Local Businesses',
    description: 'One Photo + One Offer → Complete Local Campaign',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI Marketing Engine',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Marketing Engine',
    description: 'One Photo + One Offer → Complete Local Campaign',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'google-site-verification-code',
  },
};

export const viewport: Viewport = {
  themeColor: '#E84D1A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
      </head>
      <body className="bg-bg-primary text-text-primary flex min-h-full flex-col">{children}</body>
    </html>
  );
}
