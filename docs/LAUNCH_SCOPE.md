# Launch Scope — Phase 1 (fake / not-launch-ready removal)

Customer-facing launch surface: Auth → Business Brain → Product/Offer → Create Campaign → AI copy/image/reel →
Truth Check → Saved campaign → WhatsApp share → Download, plus Billing, Usage/credits, basic campaign history.

## Enforcement

`src/proxy.ts` (Next.js 16 proxy) + `src/lib/config/launchScope.ts` run server-side per request.

| Route | Behaviour |
| --- | --- |
| `/creative/**`, `/assistant/**`, `/analytics`, `/calendar`, `/publishing`, `/settings/social`, `/auth/meta/**`, `/whatsapp`, `/content`, `/notifications`, `/dashboard/activity`, `/create` | redirect to `/dashboard` |
| `/admin/**`, `/dev/**` | **404 in production** (all current admin pages render hardcoded sample data; there is no server session to authorise against) |
| `/api/generate-content` | 404 in every environment (returned canned template text with invented offers/codes — not AI) |

To re-enable a feature: remove its prefix from `launchScope.ts` **and** the matcher in `proxy.ts`, and restore its entry points.

## Deferred, preserved (code kept, not customer-reachable)

Creative/Poster/Video Studio, AI Assistant (UI only simulated), Meta OAuth + Instagram/Facebook publishing,
scheduling, calendar/30-day plan, analytics dashboards, WhatsApp Hub page, admin pages, `/api/generate-content` route.
Backend callables for these remain deployed; they require auth + App Check and a Meta connection, and nothing in the
launch UI calls them.

## Re-enabling admin

Admin needs a real server-side boundary first (verified ID token / session cookie + `role == 'admin'` custom claim,
checked in the route or a server action) and real data instead of the hardcoded metrics. Until then it stays 404.
