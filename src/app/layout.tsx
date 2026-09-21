import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/hooks/useToast';
import { ThemeProvider } from '@/hooks/useTheme';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

/** Sets [data-theme] before paint so there's no light/dark flash on load. */
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('mitra-theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch (e) {}
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL('https://brain-wise.com'),
  title: 'Mitra — One photo. A month of marketing.',
  description:
    "Give Mitra your business and photos and create a month's worth of marketing content — posts, captions, offers, stories, reels and WhatsApp messages.",
  keywords: [
    'AI marketing',
    'campaign generator',
    'Hyderabad restaurants',
    'WhatsApp marketing',
    'local business',
  ],
  authors: [{ name: 'Mitra by Brainwise' }],
  creator: 'Mitra by Brainwise',
  publisher: 'Mitra by Brainwise',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://brain-wise.com',
    siteName: 'Mitra',
    title: 'Mitra — One photo. A month of marketing.',
    description:
      "Give Mitra your business and photos and create a month's worth of marketing content.",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Mitra',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mitra — One photo. A month of marketing.',
    description:
      "Give Mitra your business and photos and create a month's worth of marketing content.",
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
    <html lang="en" className={`h-full antialiased ${geistSans.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-bg-primary text-text-primary flex min-h-full flex-col">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
