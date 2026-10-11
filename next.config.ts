import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

// Phase 13 Client Bundle Security audit: NEXT_PUBLIC_* variables are
// inlined verbatim into the client bundle at build time — confirmed by
// directly inspecting a local `next build` output, which did contain
// NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN's value. That specific build was a
// correct one (NEXT_PUBLIC_USE_EMULATORS was also 'true', its documented
// pairing — src/lib/firebase/client.ts never even reads the debug token
// otherwise), but the pairing being *implicit* means a stale debug token
// left in .env.local after flipping USE_EMULATORS back to a non-'true'
// value would silently bake a real App-Check-bypass credential into
// whatever gets built next, with no error and no visible sign in the
// output. apphosting.yaml's real production build never sets this var at
// all, so this can only ever fire on a genuine local misconfiguration —
// it does not affect the documented "real project config + debug token,
// still routed to local emulators" workflow (docs/PHASE_20B_...), since
// that always keeps both set together.
if (
  process.env['NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN'] &&
  process.env['NEXT_PUBLIC_USE_EMULATORS'] !== 'true'
) {
  throw new Error(
    'NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN is set but NEXT_PUBLIC_USE_EMULATORS is not "true". ' +
      'This variable is only ever meaningful for local emulator development (see ' +
      'src/lib/firebase/client.ts) and must never be baked into a real build — remove it from ' +
      '.env.local, or set NEXT_PUBLIC_USE_EMULATORS=true if this is genuinely a local dev build.'
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['firebase'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      // V4 signed URLs (confirmUpload.ts, generatedAssetStorage.ts) are
      // issued on this host, not firebasestorage.googleapis.com — without
      // it, next/image rejects every product photo and generated creative
      // with a 400 in production (and a thrown render error in dev).
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.cashfree.com https://www.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://lh3.googleusercontent.com https://images.unsplash.com https://plus.unsplash.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.cashfree.com https://*.sentry.io wss://*.firebaseio.com; frame-src 'self' https://*.cashfree.com https://*.firebaseapp.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self';",
          },
          {
            // Camera/microphone/geolocation are never used by Mitra; payment stays allowed for
            // the Cashfree redirect checkout (hosted page; no embedded payment sheet is used).
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
          },
        ],
      },
    ];
  },

  // Consolidate duplicate legal routes to their canonical URLs.
  // permanent: true emits HTTP 308 (method-preserving) so any existing
  // links — in emails, third-party sites, or our own footer — are
  // automatically corrected for crawlers and browsers alike.
  async redirects() {
    return [
      {
        source: '/privacy-policy',
        destination: '/privacy',
        permanent: true,
      },
      {
        source: '/refund-policy',
        destination: '/refund',
        permanent: true,
      },
    ];
  },
};

// SENTRY_AUTH_TOKEN is unset in this environment (no Sentry project
// provisioned yet) — withSentryConfig degrades to skipping source-map
// upload with a build-time warning rather than failing the build.
export default withSentryConfig(nextConfig, {
  org: process.env['SENTRY_ORG'],
  project: process.env['SENTRY_PROJECT'],
  silent: true,
  widenClientFileUpload: false,
});
