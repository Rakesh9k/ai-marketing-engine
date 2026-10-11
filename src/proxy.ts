import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decideLaunchScope } from '@/lib/config/launchScope';

/**
 * Launch-scope enforcement (Next.js 16 "proxy", formerly middleware).
 * Runs on the server for every matched request, so deferred/internal routes
 * cannot be reached by typing a URL, deep link, or bookmark.
 */
export function proxy(request: NextRequest) {
  const decision = decideLaunchScope(
    request.nextUrl.pathname,
    process.env.NODE_ENV === 'production'
  );

  if (decision === 'not-found') {
    return new NextResponse('Not found', { status: 404 });
  }
  if (decision === 'redirect-dashboard') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/creative/:path*',
    '/assistant/:path*',
    '/analytics/:path*',
    '/calendar/:path*',
    '/publishing/:path*',
    '/settings/social/:path*',
    '/auth/meta/:path*',
    '/whatsapp/:path*',
    '/content/:path*',
    '/notifications/:path*',
    '/dashboard/activity/:path*',
    '/create/:path*',
    '/admin/:path*',
    '/dev/:path*',
    '/api/generate-content/:path*',
  ],
};
