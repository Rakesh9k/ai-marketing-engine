# Phase 17 — Landing Page

**Priority:** 🟡 P2
**Verdict: PHASE 17 IMPLEMENTED BUT PARTIALLY VERIFIED**

## 1. Executive Summary

Mitra had no public landing page at all — the root route (`src/app/page.tsx`) did nothing but redirect: authenticated visitors to `/dashboard`, unauthenticated visitors straight to `/login`, with a spinner in between. Phase 17 built the actual public-facing entry point: a real landing page communicating "One photo. A month of marketing." within the hero, backed by ten sections (nav, hero, how it works, what Mitra creates, local-business differentiation, before/after, pricing, final CTA, footer), all grounded in the actual implemented product — no fabricated claims, testimonials, customer counts, revenue statistics, or logos anywhere on the page.

The existing authenticated → `/dashboard` redirect is preserved. Login and Signup are wired to the real, existing routes. Pricing is pulled from the same values as `functions/src/config/pricing.ts` (via a newly-extracted shared constant, not a third hand-typed copy). Lint, typecheck, and build all pass; the full existing Jest suite (13 suites / 160 tests) shows no regressions.

**What could not be verified**: real interactive browser testing (clicking through nav/CTAs, visual QA at each breakpoint, keyboard navigation). This environment's Application Control security policy blocks launching any browser binary — the identical, already-documented blocker from `docs/PHASE_16_E2E_MVP_TEST_REPORT.md`. Verification here was done by server-rendering the page and inspecting the actual HTML output (real headline, real CTA text, real `/login`/`/signup` links, real pricing values, zero server-side errors) rather than `npm run build` alone — a meaningfully stronger check than an HTTP 200, but not a substitute for a real browser.

## 2. Source-of-Truth Documents

All of the following are missing from this repository (consistent with every prior phase): `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/MVP_SCOPE.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/FIRST_CUSTOMERS.md`, `docs/SALES_PLAYBOOK.md`, `docs/CUSTOMER_FEEDBACK.md`, `docs/CUSTOMER_BLOCKERS.md`, `docs/OBSERVATION.md`, `docs/OBSERVATION_REPORT.md`. `docs/PHASE_16_E2E_MVP_TEST_REPORT.md` exists and was read — its confirmed Application Control blocker is the reason this phase's browser validation is also incomplete.

In the absence of a design-system doc, `src/app/globals.css`'s actual CSS custom properties (brand orange `#E84D1A`, neutral/semantic color scale, fluid type scale, spacing/radius/shadow tokens) and the existing `Button`/`Link` components were treated as the authoritative design system, per the phase's own instruction to use the actual implementation as ground truth.

## 3. Existing Landing Page Audit

- **Root route** (`src/app/page.tsx`, before this phase): a client component that rendered only a full-screen loading spinner while `useAuthStatus()` resolved, then redirected — no landing content ever existed.
- **Existing public/auth routes** (unchanged, all confirmed real): `/login`, `/signup`, `/onboarding` (`PublicOnlyRoute`-gated), `/dashboard` (protected).
- **Existing reusable UI components** found and reused: `Button` (`src/components/ui/Button.tsx` — variant/size system already supports `primary`/`outline`, `sm`/`lg`), `StyledLink` (`src/components/ui/Link.tsx`). No pre-existing `Hero`/`Navbar`/`Footer`/`Section`/`Card` components existed — these were new to this phase (see §3 in the section list below), built using the existing design tokens rather than inventing a new visual language.
- **Existing pricing display**: `src/app/billing/page.tsx` had its own hand-typed `PLAN_DETAILS` constant, matching `functions/src/config/pricing.ts` exactly at the time of this audit. Confirmed via `src/features/campaign/constants.ts`'s own comment that "no shared package/endpoint exposes [pricing] to the frontend today" — i.e., this hand-kept-in-sync pattern is the established convention, not something to work around.
- **Existing analytics**: `src/lib/analytics/trackEvent.ts` calls the `trackAnalyticsEvent` Cloud Function, which requires authentication (`functions/src/functions/analytics/trackAnalyticsEvent.ts`: `if (!uid) throw new Error('Authentication required...')`). This makes it structurally unusable for logged-out landing-page visitors — see §11.

## 4. Sections Implemented

| Section | File | Notes |
|---|---|---|
| Navigation | `src/features/landing/components/LandingNav.tsx` | Sticky header, section anchor links (How it works / What it creates / Pricing), Login + Get Started, mobile hamburger menu |
| Hero | `src/features/landing/LandingPage.tsx` (`Hero`) | Headline "One photo. A month of marketing.", supporting line, primary + secondary CTA, product-outcome visual (`HeroVisual`) |
| How It Works | `LandingPage.tsx` (`HowItWorks`) | 4 steps: business info → photos → choose objective/offer/audience/language/style → get content |
| What Mitra Creates | `LandingPage.tsx` (`WhatMitraCreates`) | Campaign copy, Offers, Stories, Reels, WhatsApp message, Creative — plus a Truth Check mention |
| Local-Business Differentiation | `LandingPage.tsx` (`Differentiation`) | Built around your business, local language/style, real offers checked, WhatsApp-first; one clearly-labeled example (not a case study) |
| Before/After | `LandingPage.tsx` (`BeforeAfter`) | Workflow-effort transformation only — no business-performance numbers |
| Pricing | `LandingPage.tsx` (`Pricing`) | Free/Starter/Business cards from the shared `PLAN_DETAILS` constant |
| Final CTA | `LandingPage.tsx` (`FinalCTA`) | Closing CTA to `/signup` |
| Footer | `src/features/landing/components/LandingFooter.tsx` | Brand, section links, Login/Signup — no Privacy/Terms links (see §11) |
| Login / Signup | Reused existing `/login`, `/signup` routes | No new auth routes created |

## 5. Routes

- `/` — rewritten (`src/app/page.tsx`) to render the new `LandingPage` for everyone, then redirect authenticated visitors to `/dashboard` in the background once auth status resolves (was: full-screen spinner immediately gating everyone, then bare redirect).
- `/login`, `/signup`, `/onboarding`, `/dashboard`, `/billing` — unchanged, all confirmed live (see §13's curl results). No new routes were created; all landing-page links point to these existing routes.

## 6. Product Claims Audit

| Claim area | Copy | Status |
|---|---|---|
| Primary headline | "One photo. A month of marketing." | Positioning, not a factual claim |
| Workflow | "Give Mitra your business + photos → get a month's worth of marketing content" | SUPPORTED — matches the actual campaign-creation flow |
| Output types | Campaign copy, Offers, Stories, Reels, WhatsApp message, Creative | SUPPORTED — matches `CampaignDetailContent.tsx`'s actual rendered fields (headline/caption/offer/story/reel concept/WhatsApp message/creative image) |
| Languages | English, Telugu, Telugu + English | SUPPORTED — exact match to `src/features/campaign/constants.ts`'s `LANGUAGES` (MVP-restricted; Hindi/Hindi+English intentionally excluded because the product UI doesn't expose them even though the backend schema technically accepts them) |
| Regional style | Hyderabadi | SUPPORTED — exact match to `REGIONAL_STYLES` |
| Truth Check | "a server-side check that your generated content matches your real price, offer and business details before you see it" | SUPPORTED — matches the actual deterministic Truth Check behavior (Phase 6/13 reports) |
| Verticals | Restaurants/cloud kitchens (primary), salons and real estate (supported) | SUPPORTED — `category` enum in `createBusiness.ts` includes `restaurant`/`salon`/`real_estate`; campaign-wizard copy (`src/features/campaign/constants.ts`) is itself restaurant-flavored, so restaurants are presented as the lead vertical rather than claiming equal depth across all three |
| Pricing | Free / ₹499 / ₹999, credits per plan | SUPPORTED — pulled from the same values as `functions/src/config/pricing.ts` (see §7) |
| Example | "a restaurant in Kondapur uploads a photo..." | Explicitly labeled "Example:" — not presented as a real customer |

No instance of `%`, `+N`, `Nx`, customer/user/business counts, revenue, sales, engagement, ROI, "trusted by", "leading", "#1", "best", "fastest", "guaranteed", or `★` appears as a marketing claim anywhere on the page. (A grep for these terms across the landing-page source does surface a few incidental matches — Tailwind's `leading-tight`/`leading-none` CSS utility classes, and the words "customers"/"businesses" used descriptively, e.g. "a ready-to-send message for your customers" — none of which are statistical or performance claims; verified line-by-line in §"Fake Social Proof Check" below.)

## 7. Pricing Source

`functions/src/config/pricing.ts`'s `PRICING.subscriptionTiers` was read directly and compared against `src/app/billing/page.tsx`'s pre-existing `PLAN_DETAILS` constant — they matched exactly (free: 100 credits/₹0; starter: 500/₹499; business: 1200/₹999; agency: 3000/₹2499). Rather than typing a third copy for the landing page, `PLAN_DETAILS` was extracted into `src/features/billing/planDetails.ts` and both `billing/page.tsx` and the new landing page's pricing section now import the same constant. No pricing logic, credit-calculation logic, or backend config was touched.

## 8. Fake Social Proof Check

- **Testimonials:** NONE — no testimonial section exists; none were added.
- **Customer counts:** NONE — no "10,000 businesses" or equivalent anywhere.
- **Revenue claims:** NONE.
- **Logos:** NONE — no "trusted by" section.
- **Case studies:** NONE — the one illustrative scenario ("a restaurant in Kondapur uploads a photo...") is explicitly prefixed "Example:" and describes product mechanics, not a real customer or a real outcome.

Per the phase's own "social proof alternative" guidance, real product proof (the actual output categories, actual supported languages, the actual Truth Check behavior) replaces fabricated social proof throughout.

## 9. Responsive Validation

All landing-page layout uses Tailwind's mobile-first responsive utilities (`sm:`/`lg:` breakpoints) and the existing fluid `clamp()`-based type scale from `globals.css` — no fixed pixel widths were introduced (verified via grep: zero `px-[`/`w-[...px]` occurrences in the new files). The hero, section grids, pricing cards, and footer all collapse to single/double-column mobile layouts by construction (`grid-cols-2 lg:grid-cols-4`, `sm:grid-cols-2`, etc.), and the nav collapses to a hamburger menu below the `md` breakpoint.

**What was NOT verified**: actual rendering at 375px/768px/1440px in a real browser, or visual inspection for overflow/clipping — blocked by the same Application Control restriction documented in Phase 16. This is a code-construction guarantee (mobile-first utility classes, no fixed widths), not a visually-confirmed one.

## 10. Accessibility

- Semantic structure: `<header>`/`<nav>`/`<main>`/`<section>`/`<footer>`, one `<h1>` in the hero, `<h2>` per section, `<h3>` per card.
- All interactive elements are real `<button>`/`<a>` elements (no click-only `<div>`s).
- The mobile menu toggle has `aria-label` and `aria-expanded`.
- Decorative elements (`HeroVisual`, arrow/down icons) are marked `aria-hidden="true"`.
- Focus states are inherited from the existing `Button`/`StyledLink` components, which already implement `focus-visible:ring-2` per the existing design system — not re-implemented here.
- Color contrast uses only existing design-system tokens (`text-primary`/`text-secondary` on `bg-primary`/`bg-secondary`), not new ad-hoc colors.

**Not verified**: real keyboard-navigation walkthrough or automated contrast/axe scanning — same browser-environment blocker.

## 11. Performance

- The landing page is a client component (`'use client'` at the top of `page.tsx` and `LandingPage.tsx`) because it needs `useAuthStatus()` for the background authenticated-redirect and the mobile-nav toggle's local state — this necessarily pulls in the Firebase Auth SDK (already loaded app-wide via `useAuthStatus`, not something new to this phase). No Firestore, Storage, Functions, or AI-pipeline code is imported by the landing page or its components.
- Deliberately **not** using `PublicOnlyRoute` (which every other public route uses) for the root page: that component blocks all children behind a full-screen spinner until Firebase Auth resolves — correct for an auth form with nothing to show first, wrong for a marketing page whose entire job is communicating value within the first few seconds. The landing page now renders immediately; an authenticated visitor is redirected to `/dashboard` in the background afterward.
- Production build: `/` is 6.33 kB page-specific JS, 251 kB first load — in the same tier as every other route in this app (e.g. `/login` is also 251 kB), not a bloated outlier.

## 12. Analytics

**Deliberately not wired up.** The existing canonical analytics path (`src/lib/analytics/trackEvent.ts` → the `trackAnalyticsEvent` Cloud Function) requires an authenticated `uid` — confirmed by reading the function itself, which throws `"Authentication required to record an analytics event"` when `request.auth` is absent. A logged-out landing-page visitor has no `uid`, so `landing_view`/`landing_cta_clicked`/etc. could never succeed through this path without a real backend change (making the callable accept unauthenticated calls, and extending `ANALYTICS_EVENTS`) — exactly the "casually modify the canonical schema" the phase explicitly warns against for a P2 presentation-layer change. No second analytics system was introduced either. This is a deliberate, documented decision, not an oversight — flagged here as a legitimate follow-up if landing-page analytics become a priority.

## 13. Tests

```
npm run lint            PASS  (0 errors after auto-fixing prettier formatting in the new files)
npm run typecheck        PASS
npm run build              PASS (17/17 pages, including / at 6.33 kB / 251 kB first load)
npm run functions:build     PASS (untouched this phase; run for completeness)
npx jest --silent            PASS — 13 suites, 160 tests passed, 7 legitimately skipped (same suite validated in Phase 15; no regressions)
```

**Regression check (Phase 16 compatibility):** `/login`, `/signup`, `/onboarding`, `/billing` all still return HTTP 200 from a real running dev server (curl-verified, see §14) after this phase's change to `/`. `src/components/campaign/CampaignDetailContent.test.tsx` and the rest of the existing test suite pass unmodified. Phase 16's E2E spec (`tests/e2e/mvp-golden-path.spec.ts`) was not re-attempted — the same Application Control blocker from that phase still applies in this environment (see `docs/PHASE_16_E2E_MVP_TEST_REPORT.md`); nothing in this phase's changes affects that spec's early steps (open app / signup), which target routes this phase left unchanged.

**E2E (real browser):** NOT EXECUTED — blocked, same reason as Phase 16.

## 14. Screens / Visual QA

No real browser was available (see §9/§10/§16). In its place, the actual server-rendered HTML from a live `next dev` server was inspected directly:

```
curl http://localhost:3000/            -> 200, 56,889 bytes of real HTML
curl http://localhost:3000/login       -> 200
curl http://localhost:3000/signup      -> 200
curl http://localhost:3000/billing     -> 200
curl http://localhost:3000/onboarding  -> 200

Confirmed present in the rendered HTML:
  - "One photo" (hero headline)
  - "month's worth of marketing content" (supporting line)
  - href="/login" and href="/signup" (real nav/footer links, not dead)
  - "Create My First Campaign" / "Get Started" / "Start Creating" (all three CTAs)
  - "How it works" / "What you get" / "Built for businesses" / "Pricing" (all section headings)
  - ₹499 / ₹999 / Free, 100 / 500 / 1,200 credits (pricing, matching pricing.ts exactly)
  - Zero server-side errors in the dev server log for any of these requests
```

This confirms the page server-renders correctly with accurate content and working link targets — a meaningfully stronger check than `npm run build` alone, but explicitly **not** a substitute for real browser interaction (actual click-through, hover/focus states, responsive rendering, JS-driven mobile menu behavior). None of those were verified.

## 15. Remaining Issues

- **No real browser validation was possible** — this environment's Application Control policy blocks all browser binaries (identical to Phase 16's confirmed blocker). Interactive behavior (mobile menu toggle, smooth-scroll CTA, actual click-through on Login/Signup/pricing CTAs) is implemented but unexecuted-and-observed.
- **`/og-image.png` does not exist** — referenced by both the pre-existing and updated `layout.tsx` metadata; this predates Phase 17 (the reference was already there) and was not fabricated or fixed this phase, since creating a real Open Graph image is a design-asset task outside a code-only phase's reach.
- **Brand-name inconsistency**: the landing page and footer now say "Mitra" (per this phase's explicit copy requirements and the name used consistently across every phase of this project so far), but the authenticated app's own chrome (`src/components/layout/Sidebar.tsx`) still displays "AI Marketing Engine". Rebranding the authenticated app was out of scope for a landing-page phase; flagged here as a follow-up rather than silently changed.
- **Landing-page analytics are not wired up** — see §12; a deliberate scope decision, not a gap to silently fix.
- **Privacy Policy / Terms links are intentionally absent from the footer** — no such routes exist in this application; fabricating placeholder legal pages was explicitly disallowed by the phase's own instructions.

## 16. Final Verdict

**PHASE 17 IMPLEMENTED BUT PARTIALLY VERIFIED**

The landing page is fully implemented, grounded entirely in real product capabilities, contains zero fabricated social proof, reuses the existing design system and pricing source of truth, preserves the existing authenticated-redirect behavior, and passes lint/typecheck/build/the full regression suite. It falls short of FULLY VERIFIED only because real browser-based validation (click-through, responsive rendering, visual QA, keyboard navigation) could not be executed in this environment — the same, already-documented Application Control blocker from Phase 16, not a defect in the implementation itself.
