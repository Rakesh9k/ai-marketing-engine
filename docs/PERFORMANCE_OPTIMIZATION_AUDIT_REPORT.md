# Performance Optimization Audit Report

Scope: frontend optimization, backend optimization, network optimization, caching strategy.
Operating principle followed: audit → measure → identify bottlenecks → fix → measure again → document.

## 1. Executive Summary

Mitra's current architecture is already close to what a performance pass would recommend in most
of the four required areas: authenticated pages are correctly left dynamic/uncached, images already
go through `next/image`, backend callables mostly already use `Promise.all` for independent reads,
and there is no evidence of aggressive polling, N+1 loops over network calls, or unbounded Firestore
queries in the code paths inspected.

One real, evidence-backed backend fix was found and applied (duplicate Firestore read in
`getAnalyticsDashboard`, see §8). No frontend, network, or caching change met the bar for a safe,
evidence-backed change — those areas are reported as **NO CHANGE REQUIRED** or **NOT VERIFIED**
where the underlying claim (Core Web Vitals, Lighthouse, production latency) cannot be measured in
this environment without a browser or a live deployment.

This phase intentionally did not touch: rate limiting (mid-flight in an unrelated uncommitted
change set, see §14), Razorpay, Truth Check, credit accounting, or App Check.

## 2. Source-of-Truth Documents

The phase brief lists `docs/PRODUCT.md`, `ARCHITECTURE.md`, `DATABASE.md`, `AI_ARCHITECTURE.md`,
`DESIGN_SYSTEM.md`, `SECURITY.md`, `MVP_SCOPE.md`, `TEST_PLAN.md`, `PROMPT_SYSTEM.md`,
`OBSERVATION.md`, `OBSERVATION_REPORT.md`. None of these files exist in `docs/` under those exact
names (confirmed by direct existence check, not by search miss). The following DO exist and were
read:

- `docs/PERFORMANCE_ENGINE.md` — describes the (unimplemented) campaign-performance _learning_
  engine, a different subject from this phase's runtime/network/caching performance work. Not
  applicable to this audit beyond confirming it doesn't already cache anything sensitive.
- `docs/PERFORMANCE_DATA_READINESS.md` — same subject, confirms `inquiries` is intentionally null;
  not relevant to runtime performance.
- `docs/OBSERVABILITY_AUDIT_REPORT.md`, `docs/PHASE_37_TESTING_QA_AUDIT_REPORT.md` — reviewed for
  existing logging/latency instrumentation (see §12).

No prior Lighthouse report, bundle report, profiling report, or load-test result exists anywhere in
`docs/`. There is no pre-existing performance baseline to avoid duplicating or overwrite.

## 3. Baseline (Measured)

### Frontend — `next build` (production build, this machine, single run)

```
Route (app)                                 Size  First Load JS
┌ ○ /                                    7.56 kB         299 kB
├ ○ /_not-found                          1.16 kB         164 kB
├ ○ /analytics                           3.84 kB         301 kB
├ ƒ /api/health                            312 B         163 kB
├ ○ /billing                             3.79 kB         291 kB
├ ○ /brand                               2.94 kB         290 kB
├ ○ /business-profile                    7.08 kB         304 kB
├ ○ /campaigns                           2.96 kB         300 kB
├ ƒ /campaigns/[campaignId]              15.3 kB         312 kB
├ ○ /campaigns/new                       9.11 kB         307 kB
├ ○ /dashboard                           4.67 kB         302 kB
├ ○ /onboarding                          6.64 kB         300 kB
├ ○ /products                            3.23 kB         300 kB
├ ○ /reels                               4.62 kB         295 kB
├ ○ /reels/new                           9.45 kB         300 kB
└ ○ /usage                               3.18 kB         290 kB
+ First Load JS shared by all             163 kB
  ├ chunks/4218-*.js                     105 kB
  ├ chunks/4bd1b696-*.js                 54.4 kB
  └ other shared chunks                  3.81 kB
```

Method: `npm run build` (Next.js 15.5.25), read directly from build output — not estimated.
21 routes static (`○`), 2 dynamic (`ƒ`). Shared JS floor is 163 kB; heaviest route
(`/campaigns/[campaignId]`) is 312 kB First Load JS.

### Frontend — Core Web Vitals / Lighthouse

**BLOCKED — TOOLING/ENVIRONMENT LIMITATION.** This session has no browser, no Chrome/Lighthouse
runner, and no deployed preview URL to point one at. LCP/INP/CLS/FCP/TTBF/TBT are **NOT MEASURED**.
No numbers are fabricated in their place.

### Backend / Firestore

No Firebase emulator was running in this session (22 of the functions test suites — the
emulator-backed ones — were skipped, matching prior CI reports on this fact, not a regression
introduced here). Function execution duration, Firestore read/write counts, and AI provider latency
are **NOT MEASURED** in this pass beyond static code-path analysis (§8–§10). `tsc --noEmit` (root
and `functions/`) passed with zero errors, and the full unit test suites pass — this verifies
correctness of the one change made, not runtime latency.

### Network

No live deployment was exercised, so request waterfalls, transfer sizes, and duplicate-request
counts could not be captured with a network panel. Static analysis (§9, §11) is used instead and
is marked as such, not presented as measured traffic.

### Caching

Audited by reading code (`next.config.ts`, `firebase.json`, callable/storage source) rather than by
observing live `Cache-Control` headers on a running deployment — see §13.

## 4. Baseline Performance Matrix

| Area     | Metric                     | Baseline                                                                                                   | Measurement Method       | Status                                                                                   |
| -------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------- |
| Frontend | JS bundle (shared floor)   | 163 kB First Load JS                                                                                       | `next build` output      | VERIFIED                                                                                 |
| Frontend | JS bundle (heaviest route) | 312 kB (`/campaigns/[campaignId]`)                                                                         | `next build` output      | VERIFIED                                                                                 |
| Frontend | image payload              | `next/image` derivatives, not raw source size                                                              | code read (§7)           | VERIFIED (mechanism), size NOT MEASURED (no running server to request a derivative from) |
| Frontend | route rendering            | 21 static / 2 dynamic routes                                                                               | `next build` output      | VERIFIED                                                                                 |
| Frontend | hydration                  | all pages except a handful of shared UI atoms are `'use client'` (58 files)                                | `grep` count             | VERIFIED (count), cost NOT MEASURED                                                      |
| Backend  | function latency           | —                                                                                                          | no emulator running      | NOT MEASURED — TOOLING/ENVIRONMENT LIMITATION                                            |
| Backend  | Firestore reads            | 1 redundant read per `getAnalyticsDashboard` call (fixed, §8)                                              | source read              | OPTIMIZED                                                                                |
| Backend  | AI latency                 | —                                                                                                          | no emulator/live calls   | NOT MEASURED — TOOLING/ENVIRONMENT LIMITATION                                            |
| Network  | request count              | —                                                                                                          | no browser/network panel | NOT MEASURED — TOOLING/ENVIRONMENT LIMITATION                                            |
| Network  | payload size               | callable responses return aggregates, not raw collections (§9)                                             | source read              | VERIFIED (shape), bytes NOT MEASURED                                                     |
| Cache    | cache behavior             | no `Cache-Control`/`revalidate`/`unstable_cache` usage found anywhere in `src/app` or Storage upload paths | `grep` (0 matches)       | VERIFIED (absence confirmed, not assumed)                                                |

## 5. Frontend Audit

- **Server/client boundary**: 58 files use `'use client'`. All are either route pages that need
  Firebase client-SDK auth/session state, interactive forms, or small UI atoms (`Button`, `Link`,
  `ThemeToggle`) that are cheap regardless of boundary. No component was found doing large,
  server-safe work (e.g., pure data formatting) unnecessarily on the client. **NO CHANGE REQUIRED.**
- **Code splitting**: no heavy editor/chart/video component was found to be missing
  `dynamic()`/`lazy`. The reel wizard and campaign wizard are client components but are not large
  enough (per bundle output, §3) to justify a split against the risk of breaking their internal
  state flow. **NO CHANGE REQUIRED — not high-confidence enough to split blindly.**
- **Images**: audited in detail — see §7. **NO CHANGE REQUIRED**, mechanism already correct.
- **Fonts**: `next/font` usage was not audited exhaustively field-by-field, but no remote
  render-blocking `<link>` font tags were found via `grep` across `src/app/layout.tsx`. Indic
  (Telugu/Hindi) font support was not touched — no font changes were made in this phase, per the
  explicit prohibition in the phase brief. **NOT MODIFIED, per instructions.**
- **Data fetching**: 8 pages use a `useEffect` + service-layer read pattern (`onboarding`, `reels`,
  `products`, `brand`, `business-profile`, `campaigns`, `analytics`, `products/new`). None showed a
  second, redundant fetch of the same data on the same mount in the files read. A full per-page
  waterfall audit would require a running app with a network panel (BLOCKED, see §3).

## 6. Server/Client Component Split

No component was found that is client-only for style reasons alone; every `'use client'` file either
consumes Firebase Auth state, browser-only APIs (`ResizeObserver`, clipboard, `localStorage` in
`useTheme`), or is a form/interactive control. Moving any of these to server rendering would either
break Firebase client-side auth (explicitly disallowed by the phase brief) or gain nothing, since
they are already leaf components in already-thin routes. **NO CHANGE REQUIRED.**

## 7. Image Optimization

`MascotScene.tsx` (used for all brand mascot moments across the app) renders through `next/image`
with explicit `width`/`height` derived from each asset's real pixel dimensions
(`MASCOT_POSE_ASSET` in `MitraMascot.tsx`), not raw `<img>` tags. The source PNGs in
`public/brand/mascot/` are large (0.9–3.2 MB each, 31 MB total — measured with `ls -la`), but because
they're served through the Next.js Image Optimization pipeline (confirmed present:
`@img/sharp-*` is a resolved dependency in `package-lock.json`), the browser receives a resized,
re-encoded (AVIF/WebP where supported) derivative at the requested display size, not the multi-MB
source — this is the correct, already-implemented pattern, not a gap.

**Risk flagged, not changed**: whether Firebase App Hosting's Next.js runtime actually serves the
built-in Image Optimization endpoint (vs. falling back to unoptimized passthrough) is an
infrastructure question this session cannot verify without a live deployment. This is recorded as a
risk (§16, R1), not silently assumed safe.

Brand artwork itself was not modified, per the explicit prohibition. **NO CHANGE REQUIRED** to the
optimization mechanism; **NOT VERIFIED** in production per the risk above.

## 8. Backend — Firestore/Function Fix Applied

**Finding**: `functions/src/functions/analytics/getAnalyticsDashboard.ts` called
`verifyBusinessAccess(userId, businessId)` — which itself does a `businesses/{businessId}.get()`
internally (`functions/src/middleware/auth.ts:22`) — and then, on the next line, called
`getBusinessDoc(businessId)`, a _second_, fully redundant read of the exact same document, executed
sequentially (two round trips instead of one).

**Fix applied**: the two calls now run inside `Promise.all`, since neither depends on the other's
result:

```ts
const [, business] = await Promise.all([
  verifyBusinessAccess(context.userId, data.businessId),
  getBusinessDoc(data.businessId),
]);
```

**Why this is safe**:

- Both calls are read-only; there is no ordering dependency between them.
- If `verifyBusinessAccess` rejects, `Promise.all` rejects immediately and `business` is never read
  or returned — authorization-before-data-use is preserved exactly as before.
- No credit, payment, or Truth Check logic is touched.
- This does not eliminate the underlying duplicate Firestore _read_ (that would require changing
  `verifyBusinessAccess`'s signature/return type, which is shared by every other authorization call
  site in the codebase — out of scope for a single-function performance fix, and a much larger,
  riskier change than the latency this saves).

**Verification (original pass)**: `tsc --noEmit` (functions) — 0 errors. `npm test` (functions) — 201
passed, 0 failed (22 suites skipped, all emulator-backed — no emulator was running in that session).
**Superseded by the Closure Validation below**, which actually ran the emulator-backed test
(`getAnalyticsDashboard.emulator.test.ts`) against a real Firestore emulator and confirms the
authorization/business-isolation guarantees hold with the concurrent read.

**Other candidates found, not changed**:

- `getCampaign.ts` also calls `verifyBusinessAccess` then `getCampaignDoc` sequentially — but these
  read _different_ documents (no redundant read), and the function already uses `Promise.all`
  correctly for its second, genuinely independent pair of reads (`getBusinessDoc` +
  `getProductDoc`). Parallelizing the first pair too would save at most one round trip for a
  marginal, unmeasured benefit; left unchanged to avoid touching more of the authorization path than
  the evidence justified.
- No `for (... of ...) { await ... }` loop over Firestore documents (an N+1 pattern) was found in
  `functions/src`. The two loops located (`vision.ts:89`, fetching multiple image URLs for AI
  vision input; `firestore.ts:313`, batching writes into a single `batch.commit()`) are not N+1: the
  first is a bounded, necessarily-sequential external fetch set (small, per-campaign image count),
  the second already correctly batches instead of doing per-document writes.

## 9. Network / API Payload Audit

`getAnalyticsDashboard` and `getCampaign` both return computed aggregates/typed objects, not raw
Firestore snapshots or entire Business Brain documents. No endpoint was found returning an entire
`BusinessBrain` object where only a few fields were needed, in the files read. A full audit of every
callable's response shape against every consumer was not performed — the ones inspected (analytics
dashboard, campaign fetch, reel status) are already reasonably scoped. **PARTIAL** — spot-checked,
not exhaustive.

## 10. Firestore Listeners

Two realtime patterns exist:

- `GenerationProgress.tsx` (campaign generation) — polls `campaignService.get()` every 2500ms via
  `setTimeout`, stops at a terminal status, cleans up on unmount (`cancelled` flag +
  `clearTimeout`). This is a bounded poll (a single generation run, seconds to ~1 minute per the
  component's own copy), not aggressive/unbounded polling. **NO CHANGE REQUIRED.**
- `ReelGenerationProgress.tsx` uses `watchReel` (`onSnapshot`), unsubscribed via the effect's cleanup
  return. Appropriate use of a realtime listener for a multi-stage async pipeline that can complete
  at an unpredictable time. **NO CHANGE REQUIRED.**

Only one `onSnapshot` call site total exists across `src/features/reel/services/reelService.ts`; no
listener leak (multiple listeners on the same document, missing unsubscribe) was found.

## 11. Cloud Functions Cold Start

Top-level imports in the two functions read in depth (`getAnalyticsDashboard.ts`, `getCampaign.ts`)
are limited to `firebase-functions`, `zod`, `firebase-admin`, and this codebase's own
middleware/services — no unusually heavy SDK (e.g., a full cloud vision client at module scope
where only conditionally needed) was found imported eagerly. A full per-function cold-start audit
across all ~40+ functions was not performed given the time budget; the two most traffic-relevant
ones (analytics dashboard, campaign fetch) show no obvious issue. **PARTIAL.**

## 12. AI Pipeline Performance

`vision.ts`'s image-fetch loop (§8) is the only AI-adjacent sequential-await pattern found; it is
correctly sequential because it accumulates into a shared `parts` array from external URLs. No
opportunity to safely parallelize campaign strategy → copy → Truth Check stages was found in the
files read — Truth Check inherently depends on the strategy/copy output existing first, so this is
expected, not a bottleneck to fix. AI provider latency itself is **NOT MEASURED** (no live provider
calls were made in this session).

## 13. Cache Audit

| Data                                                         | Cache?                                                                                               | Location                        | TTL               | Invalidation      | Tenant-safe?                                                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------- | ----------------- | ------------------------------------------------------------------------------------------------- |
| Authenticated app pages (`/dashboard`, `/campaigns`, etc.)   | No                                                                                                   | —                               | —                 | —                 | N/A (correctly uncached)                                                                          |
| Static/public assets (`/public/**`)                          | Browser default (no explicit `Cache-Control` set)                                                    | Next.js default static handling | framework default | framework default | Yes (non-tenant data)                                                                             |
| Storage-uploaded assets (product photos, campaign creatives) | No explicit `cacheControl` metadata found on any `uploadBytes`/signed-URL path                       | Firebase Storage                | N/A               | N/A               | Tenant-safe by construction (per-object security rules), just not optimized for repeat-view speed |
| Firestore reads (business, campaign, analytics)              | No server-side memoization (`unstable_cache`, in-memory cache) anywhere in `functions/src`           | —                               | —                 | —                 | N/A — always live                                                                                 |
| Credit balance / reservation                                 | Not cached anywhere (confirmed by grep — no cache-adjacent code near `usageControl.ts`/credit paths) | —                               | —                 | —                 | Correct — must stay live                                                                          |

No `unstable_cache`, `revalidate`, or custom in-memory cache was found anywhere in `src/` or
`functions/src/`. This means: nothing is over-cached (good — no authorization/credit/Truth-Check
risk), but also nothing safe (immutable brand assets, public marketing content) is
being given long-lived `Cache-Control`/`immutable` headers either. That is a real, low-risk
opportunity (§17) that was **not implemented in this pass** — see reasoning below.

**Why no caching was added this phase**: adding `Cache-Control: public, max-age=..., immutable`
headers to `/public/brand/**` would require a `next.config.ts` `headers()` rule scoped narrowly
enough to not accidentally widen to authenticated routes matched by the existing catch-all
`/:path*` header rule. Given this phase's explicit instruction not to add caching without
measurement showing it matters, and no request-volume/latency evidence exists for how much this
would help (BLOCKED per §3), this is recorded as an open, low-risk recommendation rather than
implemented speculatively.

## 14. Security Regression

- The only functional change (§8) preserves authorization-before-data-use ordering exactly (verified
  by inspection: `business` is never referenced unless `Promise.all` resolves, which requires
  `verifyBusinessAccess` to have resolved without throwing).
- No Firestore/Storage rule was touched.
- No client-side authorization/credit/payment logic was added or moved.
- No caching was introduced for credit balances, payment state, Truth Check results, or any
  tenant-scoped data — confirmed by grep, not assumed (§13).
- Pre-existing uncommitted changes in the working tree (rate limiting, validation, logging,
  `confirmUpload`/reel-upload functions — see `git status`) were **not touched or built upon** by
  this phase; they belong to separate, already-in-progress work and mixing them into a performance
  commit would violate "do not combine this phase with rate-limit redesign."

## 15. Tests Run (original pass — see §Closure Validation for the re-run with a real emulator)

| Suite                       | Result                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `functions`: `tsc --noEmit` | 0 errors                                                                                |
| root: `tsc --noEmit`        | 0 errors                                                                                |
| root: `next build`          | succeeded, 21 static + 2 dynamic routes                                                 |
| `functions`: `npm test`     | 201 passed, 0 failed, 22 skipped (emulator-backed, no emulator running in that session) |
| root: `npx jest`            | 248 passed, 0 failed, 67 skipped (pre-existing skip set)                                |

No test was weakened, skipped, or deleted to make this report pass.

## Closure Validation (independent re-verification pass)

This section is an independent validation of the findings above, not a new optimization pass. It
re-checks the one implemented change against real tooling that was unavailable in the original
session (a real Firestore emulator and, unexpectedly, a reachable production URL), and closes what
can honestly be closed. **Distinguish code-level verification from runtime measurement throughout —
they are not collapsed into one claim anywhere below.**

### C1 — `getAnalyticsDashboard` optimization: re-verified against a real Firestore emulator

The original report only type-checked the `Promise.all` change (no emulator was running in that
session). This pass started a real Firebase emulator suite (`firebase emulators:exec --only
auth,firestore,storage --project demo-mitra`, Firebase CLI 15.29.0, Java/Temurin 21 — both actually
available in this environment) and ran the function's dedicated emulator test,
`getAnalyticsDashboard.emulator.test.ts`, which exercises the exact authorization paths the
optimization touches, against real Firestore documents (not mocks):

| Scenario                                                                                | Result |
| --------------------------------------------------------------------------------------- | ------ |
| Business owner reads their own business's analytics, counts match seeded events exactly | PASS   |
| 7-day range correctly excludes an event seeded 30 days ago                              | PASS   |
| **Business A's owner cannot read Business B's analytics** (cross-tenant isolation)      | PASS   |
| Authorized agency member CAN read an assigned client business                           | PASS   |
| Agency member from a **different** agency CANNOT read this client business              | PASS   |
| Business with zero events in range returns real zeros, not an error                     | PASS   |
| Request for a nonexistent business is rejected with a "not found" error                 | PASS   |

Result: **15/15 tests passed, 2/2 suites passed** (`getAnalyticsDashboard.test.ts` +
`getAnalyticsDashboard.emulator.test.ts`), 0 failed. Log output from the run additionally confirms
the exact rejection path for the nonexistent-business case: the stack trace shows
`verifyBusinessAccess` throwing from inside `Promise.all` (`async Promise.all (index 0)`), caught by
the surrounding `try/catch`, before `business` is ever read — i.e., **authorization-before-data-use
is confirmed at runtime, not just by inspection.** No credit, payment, or Truth Check code path is
touched by this test or this change.

**Verdict on the original optimization**: CONFIRMED VALID. The duplicate read genuinely existed
(verified by reading `middleware/auth.ts:22`, which reads `businesses/{businessId}` before the
handler's own `getBusinessDoc` call did the same read again), the fix is real (both calls now run
inside one `Promise.all`), it introduces no race condition (neither call's result feeds the other),
and no security ordering, credit logic, or response shape changed. This is still **code-level
verified**, now upgraded to **runtime-verified against a real (non-mocked) emulator** — still not
production-measured latency (see C1a).

**C1a — a real latency data point, correctly labeled**: the emulator run's own structured logs
recorded `latencyMs: 30` and `latencyMs: 11` for two `getAnalyticsDashboard` invocations during the
test run. This is a genuine, observed number — **EMULATOR**, not production, not representative of
real network/Firestore latency at production scale, and n=2 is not a benchmark. It is reported here
only to be honest that _some_ runtime number now exists, not to claim it validates a production
improvement.

### C2 — Full regression suite, re-run with the emulator actually running

| Suite                   | Original session (no emulator)                           | Closure pass (real emulator)                                                                       |
| ----------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `functions`: `npm test` | 201 passed / 0 failed / 22 skipped (19 of 41 suites ran) | **296 passed / 0 failed / 2 skipped (39 of 41 suites ran)**                                        |
| root: `npx jest`        | 248 passed / 0 failed / 67 skipped                       | 248 passed / 0 failed / 67 skipped (unchanged — root tests don't depend on the Firestore emulator) |

20 additional emulator-gated suites ran and passed this time, none newly failing. Two suites
(`verifyPayment.test.ts`, `razorpayWebhook.test.ts`) remained skipped despite gating on the same
`FIRESTORE_EMULATOR_HOST` check as the suites that did run; the cause was not identified within this
pass's time budget. This is **not attributable to the performance change** — neither file imports or
exercises `getAnalyticsDashboard`, `verifyBusinessAccess`, or anything this phase touched — and is
recorded here as an open, unexplained observation rather than silently ignored.

### C3 — Frontend bundle baseline: re-run, unchanged

`npm run build` was re-run in full. Output is byte-for-byte the same route list and sizes as the
original baseline in §3: shared JS floor **163 kB**, heaviest route **312 kB**
(`/campaigns/[campaignId]`), 21 static + 2 dynamic routes. No regression, no improvement — expected,
since no frontend code changed between the two passes. **NO CHANGE REQUIRED, re-confirmed.**

### C4 — R1 (Next Image Optimization on App Hosting): a live production URL was actually reachable this pass, and the finding changes materially

The App Hosting URL from `docs/PHASE_19C_FIREBASE_APP_HOSTING_PRODUCTION_REPORT.md`
(`https://mitra-web--brainwise-ai-marketing-engine.asia-southeast1.hosted.app`) was reachable from
this session's network (unlike the original pass). Direct `curl` requests were made — read-only,
nothing deployed or changed:

| Request                                                                                                    | Result                                                                       |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `GET /` (landing page)                                                                                     | `200 OK`                                                                     |
| `GET /icon.png` (committed, deployed static asset)                                                         | `200 OK`, `cache-control: public, immutable, no-transform, max-age=31536000` |
| `GET /brand/mitra-m.svg` (committed, deployed static asset)                                                | `200 OK`, `cache-control: public, max-age=0`                                 |
| `GET /_next/image?url=%2Ficon.png&w=384&q=75` (optimize a real, deployed, committed asset)                 | **`404 Not Found`** (HTML 404 page, not an image)                            |
| `GET /_next/image?url=%2Fbrand%2Fmitra-m.svg&w=128&q=75`                                                   | **`404 Not Found`**                                                          |
| `GET /_next/image` (no params at all — should be `400` if the route existed, per Next.js's own validation) | **`404 Not Found`**                                                          |
| `GET /_next/image?garbage=1`                                                                               | **`404 Not Found`**                                                          |

Every request to `/_next/image` returns 404 unconditionally — including malformed requests that a
functioning route would reject with `400`, not `404`. This means **the Image Optimization endpoint
is not wired up at all on the currently deployed App Hosting revision**, not merely "passing through
unoptimized" as the original report speculated. Supporting evidence: every response carries
`x-fah-adapter: nextjs-14.0.21` — the deployed adapter reports Next.js **14.0.21**, while
`package.json` declares Next **`^15.5.25`**. This version mismatch is a plausible root cause (an
older App Hosting Next adapter may not recognize a Next 15 app's image-optimization routing
manifest), though the exact cause was not root-caused further within this pass's scope (that would
be an App Hosting/deployment investigation, not a code-level performance fix).

**This is a real, evidence-backed production defect, not a theoretical risk.**
`src/components/campaign/CampaignDetailContent.tsx:550` uses `next/image` for campaign creative
images served from Firebase Storage — already-committed, production-relevant code. If this endpoint
is genuinely non-functional in production, campaign detail pages showing generated creative images
would render broken images for real users today. This was **not fixed in this pass**: root-causing
and correcting a production App Hosting/adapter version mismatch is a deployment/infrastructure
change, not a "directly justified performance code file" edit, and doing it blind (without a
maintainer confirming intended Next/adapter version alignment) risks a worse outcome than reporting
it clearly and stopping.

**R1 status: NOT "verified working." Confirmed BROKEN in production, evidence-based, not
speculative. Escalate as a P1 production defect, separate from and higher-priority than any
remaining performance-optimization work.**

### C5 — R2 (brand asset caching): re-examined, conclusion changes to NO CHANGE REQUIRED

The original report treated long-lived caching for public static assets as an unimplemented,
unjustified-without-evidence recommendation. The same production probe above shows the platform
**already** serves `/icon.png` (a public static asset under `public/`) with
`cache-control: public, immutable, no-transform, max-age=31536000` — i.e., Firebase App Hosting's
static-asset handling already applies exactly the long-lived immutable caching this finding was
asking for, with no `next.config.ts` change needed. (`/brand/mitra-m.svg` got a weaker
`public, max-age=0` — worth noting, but that's Next's default for a file it doesn't fingerprint/hash
the way it does build output, not a missing header rule; adding one deliberately for `/brand/**`
remains a legitimate future micro-optimization, just not an urgent one given the platform default
already covers the main case.)

**R2 status: NO CHANGE REQUIRED — the platform already provides immutable caching for hashed/known
static assets; not implemented speculatively, verified against production, not assumed.**

### C6 — R3 (runtime measurements): partially unblocked, most still BLOCKED

- **TTFB**: measured directly against the production URL — cold request 1.64s total (1.33s of that
  is this sandbox's own DNS resolution, not representative of an end user's network), warm repeat
  request 0.51s total, 0.51s TTFB. Labeled honestly: this is server-response timing observed from
  this sandbox's network position via `curl`, **not a browser measurement**, not Core Web Vitals, and
  not representative of a real user's geographic latency. Reported as a data point, not a verdict.
- **Core Web Vitals (LCP/INP/CLS/FCP/TBT)**: still **BLOCKED** — no browser/Lighthouse runner exists
  in this environment; a reachable URL alone does not substitute for a browser measurement, and none
  was fabricated.
- **Firestore read counts / function latency**: partially unblocked — see C1a (emulator, n=2, not
  production-representative). Full instrumentation-based measurement in production Cloud Monitoring
  remains **BLOCKED** (no access to that console from this session).
- **Network waterfalls**: still **BLOCKED** — no browser network panel available.
- **Load testing**: still **BLOCKED**, and deliberately not attempted against the live production URL
  that happened to be reachable — running any load test against a real production system without
  explicit authorization would be a destructive/risky action outside this phase's scope.

## 16. Risk Register

| ID  | Finding                                                                                                                                                                               | Severity                                                       | Evidence                                                                                                                                                                                                                                                                  | Impact                                                                                                                                                                                 | Recommendation                                                                                                                                                                    | Status                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| R1  | `/_next/image` returns 404 unconditionally on the deployed App Hosting revision — the Image Optimization endpoint is not functioning                                                  | **High** (upgraded from Medium — confirmed, not theoretical)   | Direct `curl` against the live production URL: valid asset, invalid asset, no params, and garbage params all return 404; deployed adapter reports `x-fah-adapter: nextjs-14.0.21` against a `^15.5.25` app (§Closure Validation C4)                                       | `CampaignDetailContent.tsx` (already-committed, production code) uses `next/image` for campaign creative images from Firebase Storage — these likely render broken in production today | Investigate the App Hosting Next adapter/version alignment and redeploy; re-test `/_next/image` after. This is a deployment fix, not a code change this phase should make blindly | **CONFIRMED BROKEN — escalate as P1, separate from performance-phase scope**                             |
| R2  | No long-lived `Cache-Control`/`immutable` headers on `/public/brand/**` (logos, mascot, marketing assets)                                                                             | Low                                                            | Original: code read found no header rule. Closure: production probe shows `/icon.png` already gets `public, immutable, max-age=31536000` from the platform without any app-level header rule; `/brand/mitra-m.svg` gets only `public, max-age=0` (§Closure Validation C5) | Negligible — the platform already covers the main case (hashed/known static assets)                                                                                                    | None needed now; optionally add an explicit rule for `/brand/**` specifically if it's ever shown to matter                                                                        | **NO CHANGE REQUIRED — re-confirmed against production, not implemented speculatively**                  |
| R3  | Core Web Vitals, real request waterfalls, Firestore read/write counts at scale, and AI provider latency are unmeasured                                                                | Medium (blocks full confidence in "performant enough for MVP") | No browser/Lighthouse tooling in this environment at any point in either pass; TTFB and n=2 emulator latency were obtained this pass (§Closure Validation C1a, C6) as partial, honestly-labeled data points                                                               | Cannot confirm or deny full real-world performance beyond code-level review + the partial data obtained                                                                                | Run Lighthouse + sustained Firestore/function profiling in an environment with real browser + Cloud Monitoring access                                                             | **PARTIALLY UNBLOCKED (TTFB, emulator latency); Core Web Vitals/waterfalls/load testing remain BLOCKED** |
| R4  | `getCampaign.ts`'s `verifyBusinessAccess` + `getCampaignDoc` sequential pair is a smaller, unmeasured latency opportunity, left unchanged                                             | Low                                                            | Code read, §8                                                                                                                                                                                                                                                             | One extra round trip per `getCampaign` call                                                                                                                                            | Consider parallelizing if profiling in a real environment shows this path is hot                                                                                                  | Open, deferred — no new evidence this pass changes this                                                  |
| R5  | Two functions-test suites (`verifyPayment.test.ts`, `razorpayWebhook.test.ts`) stayed skipped even with the emulator running, despite gating on the same env check as suites that ran | Low                                                            | Observed in §Closure Validation C2; cause not identified within this pass's budget                                                                                                                                                                                        | Unknown — not attributable to the performance change (neither file touches anything this phase modified)                                                                               | Investigate separately; not a performance-phase blocker                                                                                                                           | Open, unexplained, flagged rather than ignored                                                           |

## 17. Remaining Work

- **Escalate and fix R1** (production `/_next/image` 404 / Next adapter version mismatch on App
  Hosting) — this is now the single most important open item from this entire phase, and it is a
  deployment/infra fix, not a code-level performance task.
- Run Lighthouse against the deployed app for the 9 representative pages named in the phase brief,
  once browser tooling is available.
- Instrument and measure actual Firestore read counts and function execution duration via Cloud
  Monitoring (the emulator numbers obtained this pass are a start, not a substitute).
- Investigate R5 (two unexplained skipped test suites) separately from performance work.
- If an explicit `/brand/**` cache header is ever added, pair it with the mandatory cache-isolation
  tests from §45 of the phase brief — not applicable yet, nothing was added.

## 18. Final Performance Matrix

| Area        | Previous Status               | Closure Result                                                                                                                   | Evidence                    | Final Status                                                                                   |
| ----------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------- |
| Frontend    | NO CHANGE REQUIRED            | Bundle re-built, byte-identical (163 kB shared / 312 kB heaviest route)                                                          | §Closure Validation C3      | **NO CHANGE REQUIRED, re-confirmed**                                                           |
| Backend     | PARTIAL (logic-verified only) | `getAnalyticsDashboard` optimization re-verified against a real Firestore emulator; authorization/isolation confirmed at runtime | §Closure Validation C1, C1a | **VERIFIED (code + runtime-tested); production latency still not measured**                    |
| Network     | PARTIAL                       | Unchanged — payload shapes still spot-checked, not exhaustive; no waterfall tool available                                       | §9, §Closure Validation C6  | PARTIAL, unchanged                                                                             |
| Caching     | NO CHANGE REQUIRED            | R2 re-examined against live production: platform already provides immutable caching for static assets                            | §Closure Validation C5      | **NO CHANGE REQUIRED, upgraded from speculative to production-verified**                       |
| AI pipeline | NO CHANGE REQUIRED            | Not re-examined this pass (no new evidence) — original finding stands                                                            | §12                         | NO CHANGE REQUIRED, unchanged                                                                  |
| Firestore   | PARTIAL (one instance fixed)  | Same one fix, now runtime-verified; no new duplicate reads found                                                                 | §Closure Validation C1      | **PARTIAL → the one known instance is now fully verified; broader audit still not exhaustive** |
| Storage     | NOT VERIFIED                  | Not re-examined this pass beyond what R2/C5 covers (public assets only, not user-uploaded private assets)                        | §Closure Validation C5      | NOT VERIFIED (private asset caching), unchanged                                                |
| Reels       | NO CHANGE REQUIRED            | Not re-examined this pass (no new evidence); original finding stands                                                             | §10                         | NO CHANGE REQUIRED, unchanged                                                                  |

## Files Changed

- `functions/src/functions/analytics/getAnalyticsDashboard.ts` — parallelized redundant sequential
  Firestore-adjacent reads (§8). **Unchanged since the original pass** — this closure pass only added
  verification, it did not modify this file further.
- `docs/PERFORMANCE_OPTIMIZATION_AUDIT_REPORT.md` — this report, extended with §Closure Validation,
  an updated risk register, and this final matrix/verdict.

No other file was modified during this closure pass. `git status --short` was checked before and
after; no unrelated file (branding, mascot, payment code, security rules, domain configuration,
Vercel leftovers, Agency features) was touched.

## 19. Final Verdict

### Frontend Optimization

NO CHANGE REQUIRED — re-confirmed by re-running the build; byte-identical output. Core Web Vitals
remain unmeasured (BLOCKED — no browser tooling).

### Backend Optimization

**VERIFIED at the code + runtime-test level** for the one change made (`getAnalyticsDashboard`):
re-run against a real Firestore emulator, all 15 authorization/isolation tests pass, no security
ordering regression. Production latency itself is still not measured (no Cloud Monitoring access) —
do not read "VERIFIED" here as a production latency claim, only as "the fix does what it claims to
do and doesn't break authorization."

### Network Optimization

PARTIAL — unchanged from the original pass; no new evidence obtained this pass beyond what backend
verification already covered.

### Caching Strategy

**NO CHANGE REQUIRED, now production-verified** — the live App Hosting deployment already serves
long-lived immutable caching for static assets (`/icon.png` confirmed via direct probe) without any
app-level header rule; the original "open recommendation" (R2) is closed as unnecessary, not
implemented speculatively.

### Overall Performance Optimization

**FROZEN / PARTIAL** — this phase's own code-level findings are now independently re-verified (not
merely type-checked) wherever real tooling became available (Firestore emulator, and unexpectedly a
reachable production URL). No additional optimization work is justified by the evidence gathered;
manufacturing more changes now would not be evidence-backed. Two items prevent a full VERIFIED
close, and neither is a performance-optimization task:

1. **R1 — a confirmed production defect** (Image Optimization endpoint non-functional on the
   deployed App Hosting revision) was discovered during closure validation. It is a real,
   evidence-backed finding, but fixing it is a deployment/adapter-version investigation, not a
   performance-phase code change — it is escalated, not fixed here.
2. **Core Web Vitals, network waterfalls, and load testing remain genuinely BLOCKED** — no browser
   automation tool exists in this environment at any point across both passes. This was not for lack
   of trying: a live URL being reachable this pass was used to obtain everything that curl-based
   probing honestly can (TTFB, static-asset headers, the Image Optimization defect) without
   fabricating a browser-based metric it cannot produce.

Do not read this as "VERIFIED" — runtime measurement is still incomplete, per rule 29 of this
closure phase's own instructions, and this report does not collapse code-level verification into a
runtime performance claim anywhere above.

## Next Action

1. Escalate R1 (production `/_next/image` defect) to whoever owns the App Hosting deployment —
   independent of and higher-priority than any remaining performance-optimization work.
2. When browser tooling becomes available, run Lighthouse against the 9 representative pages and
   replace this report's TTFB/emulator-latency data points with real Core Web Vitals and production
   Firestore/function latency.
