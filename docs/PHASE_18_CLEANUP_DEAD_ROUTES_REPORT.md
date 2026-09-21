# PHASE 18 — CLEANUP / DEAD ROUTES REPORT

**Priority:** 🟡 P2
**Verdict: PHASE 18 IMPLEMENTED BUT PARTIALLY VERIFIED**

## 1. Executive Summary

This phase audited every route in the application's Next.js App Router structure (14 real routes, confirmed by filesystem inspection, not assumption) and every navigation reference to them across the frontend. **Zero routes were removed** — every real route proved to have a legitimate, current reason to exist. What the audit did find and fix:

1. **A genuine broken destination, referenced from three separate live pages**: `dashboard/page.tsx`, `campaigns/page.tsx`, and `brand/page.tsx` all link their "no business yet" empty-state CTA to `/onboarding/business` — a route that has never existed as a page (only `/onboarding` exists). Fixed by pointing all three at the real `/onboarding` route, which is confirmed (by reading its implementation) to be the actual business-creation flow these links were always meant to reach.
2. **Three stray, empty, git-untracked directories** on disk that were never real routes (no `page.tsx`/`route.ts` inside any of them) but that made the filesystem misleadingly suggest routes existed where they didn't: `src/app/onboarding/business/` and two malformed campaign-detail directories, `src/app/campaigns/[campaignId` (missing closing bracket) and `src/app/campaigns/[campaignId/]`. Removed — they were empty, untracked by git, and produced no route.
3. **A systemic routing/authorization gap affecting five real, live routes**: `/products`, `/products/new`, `/brand`, `/billing`, and `/usage` had no `ProtectedRoute` wrapper and no `Sidebar` — unlike `/dashboard` and `/campaigns`, which both already use this exact pattern via their own `layout.tsx`. The practical effect: an unauthenticated visitor navigating directly to any of these five URLs got stuck on a **permanent loading spinner** (each page's `loading` state starts `true` and is never set back to `false` when there's no authenticated user) instead of being redirected to `/login`, and a logged-in user who reached these pages via the Sidebar's own links lost the Sidebar entirely once there. Fixed by adding four new `layout.tsx` files (`products`, `brand`, `billing`, `usage` — `/products/new` inherits `products/layout.tsx` automatically) that are byte-for-byte the same pattern as the already-working `campaigns/layout.tsx`.

No unrelated refactoring, no route renames beyond the one proven-broken link, no new features, no route architecture changes.

## 2. Source-of-Truth Documents Checked

`docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/MVP_SCOPE.md`, `docs/DESIGN_SYSTEM.md`, `docs/SECURITY.md`, `docs/TEST_PLAN.md` — **all missing** from this repository, consistent with every prior phase this session. In their absence, the actual filesystem and the previously-written Phase reports (10–17) were treated as the authoritative record of intended routes, per this phase's own instruction that the current implementation is the source of truth for what exists.

## 3. Actual Route Inventory

| Route | Exists | Auth (before) | Auth (after) | References | Browser Tested | Classification |
|---|---|---|---|---|---|---|
| `/` | yes | n/a (public) | n/a | Nav, footer, redirect targets | Server-rendered, verified | KEEP — REQUIRED |
| `/login` | yes | public only | public only | Multiple | Server-rendered, verified | KEEP — REQUIRED |
| `/signup` | yes | public only | public only | Multiple | Server-rendered, verified | KEEP — REQUIRED |
| `/forgot-password` | yes | public only | public only | `LoginForm.tsx` | Server-rendered, verified | KEEP — REQUIRED |
| `/onboarding` | yes | protected (own check) | unchanged | Now 4 references (was 1) | Server-rendered, verified | KEEP — REQUIRED |
| `/dashboard` | yes | `ProtectedRoute` | unchanged | Sidebar, redirects, tests | Server-rendered, verified | KEEP — REQUIRED |
| `/products` | yes | **none** | `ProtectedRoute` (fixed) | Sidebar, dashboard | Server-rendered, verified | FIX — BROKEN ROUTING → fixed |
| `/products/new` | yes | **none** | `ProtectedRoute` (fixed, inherited) | `products/page.tsx`, `CampaignWizard.tsx` | Server-rendered, verified | FIX — BROKEN ROUTING → fixed |
| `/campaigns` | yes | `ProtectedRoute` | unchanged | Sidebar, dashboard | Server-rendered, verified | KEEP — REQUIRED |
| `/campaigns/new` | yes | `ProtectedRoute` (inherited) | unchanged | Sidebar/dashboard/campaigns CTA | Server-rendered, verified | KEEP — REQUIRED |
| `/campaigns/[campaignId]` | yes | `ProtectedRoute` (inherited) | unchanged | Dynamic, from campaign list/dashboard | Server-rendered, verified | KEEP — REQUIRED |
| `/brand` | yes | **none** | `ProtectedRoute` (fixed) | Sidebar, dashboard | Server-rendered, verified | FIX — BROKEN ROUTING → fixed |
| `/usage` | yes | **none** | `ProtectedRoute` (fixed) | Sidebar | Server-rendered, verified | FIX — BROKEN ROUTING → fixed |
| `/billing` | yes | **none** | `ProtectedRoute` (fixed) | Sidebar, `CampaignWizard.tsx` (credits CTA) | Server-rendered, verified | FIX — BROKEN ROUTING → fixed |
| `/onboarding/business` | **no** (never had a page) | — | — | 3 dead links (now fixed) | n/a | REMOVE — PROVEN OBSOLETE (was never a real route; the 3 links to it were the actual defect) |

No API routes, no Pages Router, no middleware.ts, no `next.config.ts` redirects/rewrites exist in this application — confirmed by direct filesystem/config inspection, not assumption.

## 4. Required Route Audit

### `/`
Public landing page (Phase 17). Renders immediately; redirects an authenticated visitor to `/dashboard` in the background via `useAuthStatus()`. Unchanged this phase.

### `/login`
`PublicOnlyRoute`-gated (redirects an already-authenticated visitor to `/dashboard`). Links from `/`, footer, `SignupForm.tsx`, `ForgotPasswordForm.tsx`, `Sidebar.tsx`'s logout handler (`window.location.href = '/login'`). Unchanged.

### `/signup`
`PublicOnlyRoute`-gated. Linked from `/`, footer, `LoginForm.tsx`. Unchanged.

### `/onboarding`
Not wrapped in `ProtectedRoute`/`PublicOnlyRoute` — it manages its own access logic internally (confirmed by reading `src/app/onboarding/page.tsx`, which calls `createBusiness` directly). This phase did not touch its internal auth handling (out of scope — no proven broken destination *inside* the page), only fixed the three external links that pointed at the nonexistent `/onboarding/business` instead of here.

### `/dashboard`
`ProtectedRoute` + `Sidebar` via `dashboard/layout.tsx`. Central hub; links to `/campaigns`, `/campaigns/new`, `/brand`, `/products`, `/onboarding` (now correct). Unchanged.

### `/products`
**Fixed this phase.** Previously had no layout at all. Now wrapped via new `src/app/products/layout.tsx` (`ProtectedRoute` + `Sidebar`, identical to `campaigns/layout.tsx`). Confirmed via a live dev server: before comparison wasn't preserved, but after the fix, direct unauthenticated access now renders the same `ProtectedRoute` loading-state markup as `/dashboard`/`/campaigns` (byte-identical `role="status" aria-label="Loading"` output), rather than the page's own separate, never-resolving spinner.

### `/products/new`
Nested under `src/app/products/`, so it automatically inherits the new `products/layout.tsx` fix — no separate file needed. Linked from `/products`' empty state and `CampaignWizard.tsx`'s "add a product" CTA.

### `/campaigns`
`ProtectedRoute` + `Sidebar` via `campaigns/layout.tsx` (pre-existing, unchanged). One broken link fixed (see §6).

### `/campaigns/new`
Inherits `campaigns/layout.tsx`. Hosts `CampaignWizard`, which reads a `?generating=<campaignId>` query parameter to resume the generation-progress view after a refresh — confirmed this is read correctly (`useSearchParams()` inside `CampaignWizard.tsx`), so this is a working, intentional query-param-driven state, not a broken/dead parameter.

### Campaign Detail (`/campaigns/[campaignId]`)
Inherits `campaigns/layout.tsx`. Already has a proper `'not-found'` load-error state (`src/app/campaigns/[campaignId]/page.tsx`) for a nonexistent/inaccessible campaign ID — confirmed by reading the component, not assumed. Two malformed, empty, untracked sibling directories were found alongside the real one and removed (see §7) — they contained no code and were never a functioning route.

### `/brand`
**Fixed this phase.** Same gap and same fix as `/products` (new `src/app/brand/layout.tsx`). One broken link (its own "no business" empty state pointing at `/onboarding/business`) also fixed.

### `/usage`
**Fixed this phase.** Same gap and same fix (new `src/app/usage/layout.tsx`). Standalone page, not merely a dashboard widget duplicate — retained per this phase's explicit instruction not to remove a dedicated usage page just because the dashboard also shows credit information.

### `/billing`
**Fixed this phase.** Same gap and same fix (new `src/app/billing/layout.tsx`). This is the financially-sensitive route the phase explicitly asked to be handled carefully: the fix adds only the same auth gate every other protected route already has — no payment/credit logic, Razorpay integration, or pricing display was touched.

## 5. Navigation Reference Audit

- **`href=`**: Searched across `src/**/*.tsx`. All results resolve to one of the 14 real routes, an in-page anchor (`#how-it-works`, `#pricing`, `#top`), or an external URL (Google Fonts, Firebase Storage preconnects) — except the three now-fixed `/onboarding/business` occurrences.
- **`router.push` / `router.replace`**: All targets are real routes (`/dashboard`, `/signup`, `/campaigns/${id}`, `/campaigns/new?generating=${id}`, `/products`) or dynamic constructions matching the real `[campaignId]` segment.
- **`redirect(...)` (Next.js server-side)**: None found — this app does not use Next's server `redirect()` function anywhere; all redirects are client-side (`router.push`/`.replace` or `window.location.href`).
- **`Link` (next/link)**: All `href` props resolve as above.
- **`window.location.href`**: Two occurrences — `LoginForm`'s post-login redirect (reads a `?redirect=` query param, defaulting to `/dashboard`) and `Sidebar`'s logout handler (`/login`). Both valid.
- **Middleware**: No `middleware.ts` exists in this repository — all auth gating is component-level (`ProtectedRoute`/`PublicOnlyRoute`), confirmed by filesystem search, not assumed.
- **`next.config.ts`**: No `redirects()`/`rewrites()`/`headers()` reference any app route (the existing `headers()` block only sets security headers on `/:path*`, not route-specific).

## 6. Broken Destinations Found

| Source | Destination | Problem | Resolution |
|---|---|---|---|
| `src/app/dashboard/page.tsx` (empty-state CTA) | `/onboarding/business` | Route never existed (only an empty, untracked directory backed it — no `page.tsx`) | Fixed to `/onboarding`, confirmed to be the real business-creation flow |
| `src/app/campaigns/page.tsx` (empty-state CTA) | `/onboarding/business` | Same | Same fix |
| `src/app/brand/page.tsx` (empty-state CTA) | `/onboarding/business` | Same | Same fix |
| `src/features/auth/components/AuthLayout.tsx` (used by `/login`, `/signup`) | `/terms`, `/privacy` | Routes genuinely do not exist anywhere in this application — not a typo/rename, a missing feature | **NOT FIXED** — per this phase's explicit instruction not to build features or fabricate legal pages to repair a broken link. Reported here as **BROKEN / MISSING FEATURE**, same finding already flagged (undecided) in Phase 17's report. Left as-is; a product/legal decision (build the pages, or remove the disclosure text) is needed, not a routing fix this phase is authorized to make unilaterally. |

## 7. Routes Removed

```text
No routes removed.
```

That is the correct outcome here in the strict sense — every path that ever rendered a real page continues to. What *was* removed were three **empty, git-untracked directories that never contained a route in the first place**:

| Path removed | Evidence it was never a route | Why removed |
|---|---|---|
| `src/app/onboarding/business/` | Empty (verified via `find -mindepth 0` and PowerShell `Get-ChildItem -Recurse`); `git status` showed no tracked or untracked content under it | It was the source of the false impression that `/onboarding/business` might be valid; its existence as a bare directory was actively misleading. No `page.tsx` ever existed there. |
| `src/app/campaigns/[campaignId` (missing closing bracket) | Empty, confirmed via PowerShell `Get-ChildItem -Recurse` | Malformed Next.js dynamic-segment name (invalid syntax — no closing bracket), empty, untracked. Not a functioning route by construction. |
| `src/app/campaigns/[campaignId/]` | Empty, confirmed via PowerShell `Get-ChildItem -Recurse` | Same — malformed segment name, empty, untracked. |

None of these three paths appeared in `git status` even as untracked additions before removal (empty directories are invisible to git), confirming they had zero effect on the committed/working application and zero risk in removing them.

## 8. Routes Intentionally Kept

- **`/usage`** — appears only in the Sidebar (no dashboard-level deep link), but is a legitimate standalone credit-history page, not a redundant duplicate of the dashboard's credit widget. Kept per the phase's explicit instruction.
- **`/onboarding`** — not reachable from the Sidebar (by design — it's a one-time setup flow, not ongoing navigation) but required by signup and by the three empty-state CTAs. Kept.
- **`/forgot-password`** — only one inbound link (`LoginForm.tsx`), but a real, necessary part of the auth flow. Kept.
- **`/campaigns/new`'s `?generating=` query parameter** — not obviously "linked" anywhere as a static string, only constructed dynamically by `CampaignWizard.tsx` and read back by the same component. Kept and confirmed working, not removed for looking unreferenced.

## 9. Routes With Insufficient Evidence

None. Every one of the 14 real routes had clear, provable evidence of current use (a live inbound link, a dynamic construction, or direct confirmation of its role in the auth/onboarding/campaign/billing flow). No route was classified `UNKNOWN`.

The one item that remains genuinely unresolved is the `/terms` and `/privacy` dead links (§6) — not because evidence is insufficient, but because the correct resolution (build the pages vs. remove the disclosure) is a product decision outside this phase's charter.

## 10. Browser Verification

**No real browser was available in this environment** — this is the identical, already-documented Application Control (WDAC/AppLocker-class) policy blocker from `docs/PHASE_16_E2E_MVP_TEST_REPORT.md`, re-confirmed as still applicable (not re-tested from scratch this phase, since nothing about the environment changed). In its place, verification was performed against a real running `next dev` server via `curl`:

```
GET / -> 200
GET /login -> 200
GET /signup -> 200
GET /forgot-password -> 200
GET /onboarding -> 200
GET /dashboard -> 200
GET /products -> 200
GET /products/new -> 200
GET /campaigns -> 200
GET /campaigns/new -> 200
GET /brand -> 200
GET /usage -> 200
GET /billing -> 200
```

All 13 real page routes return HTTP 200 with actual rendered markup (not error pages), and the dev server log shows zero server-side errors across all thirteen requests.

**This is not a substitute for real browser interaction** — click-through navigation, the actual client-side auth-redirect firing, and visual confirmation were not observed directly. See §11 for what curl-based evidence *does* establish about the authorization fix specifically.

## 11. Authentication / Authorization Verification

For the five routes this phase changed (`/products`, `/products/new`, `/brand`, `/billing`, `/usage`), the initial server-rendered HTML for each was compared against the two already-known-correct protected routes (`/dashboard`, `/campaigns`):

```
GET /products -> contains  role="status" aria-label="Loading"
GET /brand    -> contains  role="status" aria-label="Loading"
GET /billing  -> contains  role="status" aria-label="Loading"
GET /usage    -> contains  role="status" aria-label="Loading"
GET /dashboard -> contains role="status" aria-label="Loading"   (pre-existing, working)
GET /campaigns -> contains role="status" aria-label="Loading"   (pre-existing, working)
```

All six now emit byte-identical initial markup — the `ProtectedRoute` component's `loading` branch. Since `/dashboard` and `/campaigns` are already confirmed (by this application having been in use across seventeen prior phases) to correctly redirect an unauthenticated visitor to `/login` once `useAuthStatus()` resolves client-side, and the four newly-added `layout.tsx` files are verbatim copies of the same `ProtectedRoute` usage, this is strong construction-based evidence that the fix closes the gap correctly.

**What was not directly observed**: the actual client-side redirect firing in a real browser for the five newly-protected routes specifically (requires JS execution, which `curl` cannot provide). This is a **PARTIAL** verification — very high confidence by construction and by matching a known-working pattern exactly, not a first-hand browser observation.

Authorization was not weakened anywhere to make testing easier — the fix only adds gating that was already the norm elsewhere in the app.

## 12. Tests

```
npm run lint            PASS  (0 errors)
npm run typecheck        PASS
npx jest --silent          PASS — 13 suites, 160 passed, 7 legitimately skipped (unchanged from Phase 17's baseline — no regressions)
npm run build              PASS — 17/17 pages generated, route list unchanged (still exactly 14 app routes + /_not-found)
npm run functions:build     PASS (untouched this phase; run for completeness)
```

No test needed to change: no route this phase touched had an existing test asserting on its specific pre-fix behavior, and no route was removed that any test depended on.

## 13. Git Diff Review

The repository's overall `git status` reflects the accumulated uncommitted work of every phase in this long session (8 through 17), not just this phase — the vast majority of the modified/untracked files listed are pre-existing and untouched by Phase 18. Isolating strictly what this phase changed:

**Modified (1-line change each, verified via `git diff`):**
- `src/app/dashboard/page.tsx` — `/onboarding/business` → `/onboarding`
- `src/app/campaigns/page.tsx` — `/onboarding/business` → `/onboarding`
- `src/app/brand/page.tsx` — `/onboarding/business` → `/onboarding`

**Created:**
- `src/app/products/layout.tsx`
- `src/app/brand/layout.tsx`
- `src/app/billing/layout.tsx`
- `src/app/usage/layout.tsx`

**Removed (empty, untracked, no git record existed):**
- `src/app/onboarding/business/`
- `src/app/campaigns/[campaignId` (malformed)
- `src/app/campaigns/[campaignId/]` (malformed)

No other files were modified by this phase. No unrelated refactoring occurred. Everything else visible in `git status` (functions/ services, prior phases' tests, the Phase 17 landing page, etc.) predates this phase and is explicitly called out here as **not part of Phase 18's diff**.

## 14. Remaining Issues

- **`/terms` and `/privacy` are dead links** on both `/login` and `/signup` (via `AuthLayout.tsx`) — a genuinely missing feature, not a routing bug this phase can safely resolve (see §6). Flagged for product/legal decision.
- **Real browser verification remains blocked** in this environment (§10) — the authorization fix is verified by server-rendered-markup comparison and by exactly matching an already-working pattern, not by direct browser observation of the redirect firing.
- **No `not-found.tsx`/`error.tsx` exists at the app root** — a genuinely nonexistent URL falls back to Next.js's default 404. This is acceptable default behavior, not a defect, and adding custom error pages would be new feature work outside this phase's cleanup charter — noted, not built.

## 15. Final Verdict

**PHASE 18 IMPLEMENTED BUT PARTIALLY VERIFIED**

The full route audit was completed, one proven broken destination was fixed (three dead links + the misleading empty directory backing it), a genuine systemic authorization gap across five live routes was found and fixed using the application's own established pattern, and three inert filesystem artifacts were safely removed. Zero real routes were deleted. Lint, typecheck, build, and the full existing test suite all pass with no regressions. The verdict stops short of FULLY VERIFIED solely because real browser-based click-through/redirect verification could not be performed in this environment — the same, already-documented blocker from Phase 16 — leaving the authorization fix confirmed by strong construction-based and server-rendered-markup evidence rather than first-hand browser observation.
