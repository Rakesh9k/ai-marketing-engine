import { NextResponse } from 'next/server';

/**
 * Public, unauthenticated liveness check for the Next.js frontend (App
 * Hosting service "mitra-web"). Intentionally cheap: no Firestore/Storage/AI
 * provider calls, so it stays reliable and free to poll from an uptime
 * checker (Phase — Monitoring & Observability, §22-25). It answers only
 * "is the process responding", not "are downstream dependencies healthy" —
 * that would make every uptime check dependent on, and potentially billed
 * against, external providers.
 */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'mitra-web',
    timestamp: new Date().toISOString(),
  });
}
