# Phase 36 — Final Integration, Regression & Production Readiness

This is a verification phase. No new features were added except where a critical defect blocked a
required check (see "Defects found and fixed" below). Every status below is backed by a named test
file, a report from an earlier phase, or a command actually run in this session — never an
assumption.

Status values used throughout, exactly as specified: **PASS**, **PARTIAL**, **BLOCKED**, **FAIL**,
**NOT IMPLEMENTED**.

---

## Defects found and fixed during this verification phase

1. **`npm run lint` (frontend) was failing with 8,916 errors**, all but 41 of them CRLF line
   endings (confirmed via `grep -c "Delete ␍"` against the full lint output — 8,875 of 8,916). This
   blocked a required automated-validation command ("Do not ignore failures"), so it was fixed:
   `npx eslint . --ext .ts,.tsx --fix` across the frontend, which is a purely mechanical,
   whitespace-only correction (prettier's own rule; confirmed zero non-prettier rule categories
   fired in the original output). Re-run confirms `npm run lint` now exits clean. `npm run build`'s
   own lint gate (`next build`, which separately runs ESLint) also now passes clean for the first
   time in this project's history.
2. **Analytics "Try again" button was a no-op** — found while writing Phase 35 tests, root-caused
   and fixed in that phase (`src/app/analytics/page.tsx`, `setDays(days)` → a dedicated
   `retryTick` state). Re-confirmed still fixed and covered by
   `src/app/analytics/page.test.tsx`.

Everything else below is verification only.

---

## PRODUCT MATRIX

### RESTAURANT

| Area | Status | Evidence | Remaining limitation |
|---|---|---|---|
| Onboarding | PASS | `src/app/onboarding/page.test.tsx` (10 tests, Phase 35) — step progression, validation, back nav, completion, backend-failure handling for the restaurant path specifically | Wizard progress is not persisted across a page refresh (by design — no localStorage); confirmed and tested as actual behavior, not a bug |
| Business Brain | PASS | `functions/src/types/index.ts` `BusinessBrain`; `createBusiness.ts` writes full identity/brand/audience/localization/businessRules; `docs/PHASE_33_BUSINESS_BRAIN_UI_REPORT.md` — customer-facing edit UI, backend-enforced field allowlist | `campaignHistory[].performance` remains a documented, intentionally-unwritten placeholder (Phase 34) |
| Product | PASS | `functions/src/functions/products/*.ts` + `createProduct.test.ts`; `src/app/products/*` | Restaurant product editing has no dedicated frontend UI beyond create (documented gap since Phase 18/33) |
| Upload | PASS | `src/features/asset/components/ImageUploader.test.tsx` (6 tests, Phase 35) — validation, success, failure, retry, asset persistence | `assetService.ts`'s own `uploadImage`/`deleteAsset`/`getAsset`/`listAssets` orchestration is tested only at the component-boundary mock level, not its internal Firebase Storage chain (documented gap, Phase 35 report) |
| Campaign | PASS | `src/features/campaign/components/CampaignWizard.test.tsx`, `buildCampaignInput.test.ts`, `constants.test.ts` (Phase 35); `docs/PHASE_4_CAMPAIGN_CREATION_REPORT.md` | Full 8-step DOM-driven wizard walkthrough is not tested end-to-end (the strategy-assembly logic and vertical filtering are tested directly instead — documented rationale, Phase 35 report) |
| AI | PASS | `docs/PHASE_5_AI_GENERATION_REPORT.md`, `docs/PHASE_7_CREATIVE_GENERATION_REPORT.md`; `functions/src/services/ai/*.test.ts` (pipeline, text, vision, compositor — all passing this run) | — |
| Truth Check | PASS | `functions/src/services/ai/truthCheck.test.ts` (53 tests, this run) — Golden Tests #1–13 including client-cannot-manufacture-PASS, fail-closed defaults, regeneration-activation gating | See dedicated Truth Check section below |
| Regeneration | PASS | `functions/src/functions/campaigns/regenerateAsset.ts`; Golden Tests #11–13 in `truthCheck.test.ts` (`shouldActivateRegeneration`); `CampaignDetailContent.test.tsx` regeneration tests | — |
| Download | PASS | `CampaignDetailContent.test.tsx` — download via fetch+blob, analytics-never-blocks-download | A `fetch()`-rejects-during-download failure path (distinct from the already-tested analytics-failure case) is not separately tested (Phase 35 report, minor noted gap) |
| WhatsApp | PASS | `CampaignDetailContent.test.tsx`; `functions/src/functions/analytics/recordWhatsAppClick.test.ts` (10 tests, Phase 34) — authorized, idempotent, campaign-associated | — |
| Credits | PASS | See dedicated Credits section below | — |
| Billing | PASS | `src/app/billing/page.test.tsx` (9 tests, Phases 19A + 35) — checkout invocation, success, cancel, createSubscription failure, verifyPayment failure, duplicate-click guard, credit-update-via-refetch | Razorpay's own `checkout.js` is never loaded for real in tests, per the explicit instruction not to fake Razorpay itself — only this app's side of the `window.Razorpay` boundary is exercised |
| Analytics | PASS | `src/app/analytics/page.test.tsx` (7 tests); `functions/src/functions/analytics/getAnalyticsDashboard.test.ts`; `docs/PHASE_32_ANALYTICS_DASHBOARD_REPORT.md` | Business-total aggregation only (no per-day-per-vertical breakdown); see dedicated Analytics section |

### SALON

| Area | Status | Evidence | Remaining limitation |
|---|---|---|---|
| Onboarding | PASS | `src/app/onboarding/page.test.tsx` — "salon gets extra Services & Packages step" / "restaurant never sees it" tests; `docs/PHASE_30_SALON_MODE_REPORT.md` | — |
| Services | PASS | `functions/src/functions/business/updateBusinessBrain.test.ts` — salon can add/edit services; salon-only fields rejected for a restaurant business | — |
| Packages (if supported) | PASS — supported | Same `updateBusinessBrain.test.ts`; `createBusiness.ts` accepts `packages` for salon | — |
| Appointment CTA | PASS | `functions/src/config/verticals.ts` / `src/features/campaign/constants.ts` `VERTICAL_CTAS.salon` includes `book_appointment`; `constants.test.ts` asserts a restaurant never sees it and salon never sees `book_table`/`order_whatsapp` | — |
| Campaign | PASS | Same `CampaignWizard`/`constants.test.ts` evidence as restaurant, vertical-scoped | Same 8-step-DOM-walkthrough gap as restaurant |
| AI | PASS | `functions/src/services/ai/*.test.ts`; salon-specific Truth Check catalog checks in `truthCheck.test.ts` ("Phase 30 — salon service/package catalog claims", 7 tests) | — |
| Truth Check | PASS | `truthCheck.test.ts` Phase 30 block — catalog claims never PASS for an undefined service/package, never runs for a restaurant | — |
| Regeneration | PASS | Same shared regeneration mechanism as restaurant (vertical-agnostic) — `shouldActivateRegeneration` Golden Tests | — |
| Download | PASS | Same shared `CampaignDetailContent` mechanism (vertical-agnostic) | — |
| Credits | PASS | Same shared, vertical-agnostic credit reservation/finalization/refund system | — |

### REAL ESTATE

| Area | Status | Evidence | Remaining limitation |
|---|---|---|---|
| Onboarding | PASS | `docs/PHASE_31_REAL_ESTATE_MODE_REPORT.md`; onboarding wizard's real-estate Properties step (unit-tested via the same vertical-isolation tests as salon) | — |
| Property data | PASS | `functions/src/functions/business/updateBusinessBrain.test.ts` — real-estate `properties` write path; `src/app/business-profile/page.test.tsx` — new Phase 35 test proving the real-estate inline property editor renders and is isolated from salon/restaurant UI | — |
| Campaign | PASS | `constants.test.ts` — real estate never sees `order_whatsapp`/`book_table`/`book_appointment`, offer types exclude BOGO/free-delivery/loyalty | Same 8-step-DOM-walkthrough gap as restaurant |
| AI | PASS | Same shared AI pipeline, vertical-config-driven (`functions/src/config/verticals.ts`) | — |
| Truth Check | PASS | `truthCheck.test.ts` "Phase 31 — real estate property fact claims" block (11 tests) — bedroom count, area, possession status, amenity claims all fact-checked against defined properties, never runs for a salon business | — |
| Regeneration | PASS | Shared, vertical-agnostic mechanism | — |
| Download | PASS | Shared, vertical-agnostic mechanism | — |
| Credits | PASS | Shared, vertical-agnostic credit system | — |

---

## BUSINESS ISOLATION

| Area | Status | Evidence | Remaining limitation |
|---|---|---|---|
| Business A cannot access Business B | PASS | `tests/security.test.ts`, `tests/phase27-authz.test.ts` (run this session against the Firestore emulator: 3 suites, 45 passed, 5 skipped, 0 failed); `functions/src/middleware/auth.ts` `verifyBusinessAccess`; cross-tenant tests in `getCampaign.test.ts`, `updateBusinessBrain.test.ts`, `recordWhatsAppClick.test.ts` (all passing this run) | `firestore.rules`'s `businesses/{businessId}` collection allows direct client writes gated only on `resource.data.userId`, with no field-level lock (documented in Phase 33 report as pre-existing, not exploitable via this app's own UI since all writes go through Cloud Functions) |
| Agency A cannot access Agency B | PASS | `tests/phase27-authz.test.ts`, `tests/phase27-bulk-approval-auth-roles.test.ts` (run this session, passing) — role/agencyId matching enforced in `verifyBusinessAccess`; explicit test that a mismatched `agencyId` is denied | `campaign_performance/{campaignId}` firestore.rules read rule only checks direct `userId`, not agency membership (Phase 34 report, noted limitation — doesn't affect the Cloud Functions, which use `verifyBusinessAccess` server-side) |
| Client A cannot access Client B | PASS | Same `verifyBusinessAccess` mechanism — a "client" in this codebase is a business owned by a user; cross-tenant denial is tested identically across `getCampaign`, `getCampaignPerformance`, `updateBusinessBrain`, `getAnalyticsDashboard` | — |

---

## TRUTH CHECK

| Area | Status | Evidence | Remaining limitation |
|---|---|---|---|
| Missing facts fail/review | PASS | `truthCheck.test.ts` "Fail-closed error handling" block — empty generated content never PASSES when facts are required; missing offer price → REVIEW_REQUIRED, never silent PASS | — |
| Changed business facts invalidate stale verification | PASS | `truthCheck.test.ts` "Golden Test #10" + Phase 33 extension ("Phase 33 — verticalFingerprint...", 5 tests) — `computeSourceFingerprint`/`computeVerticalFactsFingerprint`/`isVerificationStale`; `getCampaign.test.ts` end-to-end emulator test (price change → stale flag flips, historical result unchanged) | — |
| Regenerated content requires verification | PASS | `regenerateAsset.ts` always runs Truth Check on the new content before persisting; Golden Tests #11–13 | — |
| Failed versions cannot replace valid active versions | PASS | `shouldActivateRegeneration` Golden Tests #11/#12 — FAIL and REVIEW_REQUIRED are never activated; `CampaignDetailContent.test.tsx` — "excludes a failed-regeneration asset — only the still-active valid asset is shown/downloadable" | — |

---

## CREDITS

| Area | Status | Evidence | Remaining limitation |
|---|---|---|---|
| Reservation | PASS | `functions/src/services/usageControl.test.ts` (11 tests); `firestore.reserveCredits.test.ts` (5 tests) — all passing this run | — |
| Finalization | PASS | `usageControl.concurrency.test.ts` "GOLDEN CREDIT TEST (§74)" — reserve, finalize, re-finalize is a no-op | — |
| Refund | PASS | Same file, "GOLDEN FAILURE TEST (§75)" — reserve, refund, re-refund never restores credits twice; `generateCampaignStrategy.recovery.test.ts` — pipeline exception refunds, Truth Check FAIL does not | — |
| Concurrency | PASS | `usageControl.concurrency.test.ts` "GOLDEN CONCURRENCY TEST (§10/§76)" — two racing reservations for the same 100 credits, exactly one succeeds, balance never negative; a dedicated FINALIZE-vs-REFUND race test reaching exactly one terminal state | — |
| Idempotency | PASS | Same file — "the SAME operationId requested concurrently... reserves credits exactly once, not twice"; `recordWhatsAppClick.test.ts` — duplicate-click idempotency via `withIdempotency` | — |
| Duplicate generation | PASS | `generateCampaignStrategy.recovery.test.ts` — "a failed generation does not prevent a subsequent legitimate retry (fresh idempotencyKey) from succeeding"; idempotency key required at the callable schema level | — |

---

## ANALYTICS

| Area | Status | Evidence | Remaining limitation |
|---|---|---|---|
| Canonical events | PASS | `functions/src/services/analyticsService.ts` `ANALYTICS_EVENTS` (7 canonical names); `analyticsService.test.ts` | `inquiries` has no corresponding canonical event — by design, since no real source exists (see Performance section) |
| Ownership | PASS | `trackAnalyticsEvent.ts` derives `userId` server-side from `request.auth`, never trusts the client; `recordWhatsAppClick.ts` additionally verifies campaign↔business ownership (closing a gap the generic path had — Phase 34) | The generic `trackAnalyticsEvent`'s `asset_downloaded` ownership check remains stubbed (documented gap, Phase 34 report) — not fixed here per this phase's "verification only" scope, since it's a pre-existing, non-regressed condition, not a new defect |
| Timestamps | PASS | `trackEvent()` writes both an ISO `timestamp` string (used for range queries) and a server `createdAt` Timestamp; `getAnalyticsDashboard.ts` filters by the ISO field, documented explicitly (Phase 32 report) to avoid the dead `eventType`-keyed indexes | — |
| No PII leakage | PASS | `getAnalyticsDashboard.ts` returns only aggregates (counts, daily buckets) — never raw event documents or user-identifying fields to the client; confirmed by reading the function's return shape and `AnalyticsEventRecord`'s deliberately narrow projection (`eventName`, `timestamp` only) | Not verified via an automated PII-scanning test — this is a code-reading-based confirmation, not a test assertion |
| Dashboard accuracy | PASS | `getAnalyticsDashboard.test.ts`; `src/app/analytics/page.test.tsx` — "renders real aggregate numbers from the backend response — never invents or recomputes them" | Business-total only; no per-campaign breakdown on the dashboard itself (per-campaign data exists via `getCampaignPerformance`, shown on the campaign detail page instead) |

---

## PERFORMANCE

| Area | Status | Evidence | Remaining limitation |
|---|---|---|---|
| Known data | PASS | `campaign_performance/{campaignId}.whatsappClicks` — real, event-sourced, idempotent (Phase 34); `getCampaignPerformance.test.ts` "unknown inquiry" test proves 5 real clicks stay 5, never mis-recorded | — |
| Unknown data | PASS | `getCampaignPerformance` always returns `inquiries: null, inquiriesAvailable: false`; frontend renders the literal text "Not available", never `0` (`CampaignDetailContent.test.tsx` Performance panel tests) | — |
| No fabricated values | PASS | Confirmed by code inspection + tests: no code path anywhere converts a click, download, or campaign-generation event into an inquiry count (Phase 34 report, explicit audit finding) | — |
| Performance Engine readiness remains truthful | PASS | `docs/PERFORMANCE_DATA_READINESS.md` and `docs/PERFORMANCE_ENGINE.md` (both created Phase 34, re-read this session, unchanged) — verdict is explicitly **"DATA NOT YET SUFFICIENT"** for any learning/ranking/optimization use, and states this status is not tied to a schema existing | **This is the most important open item for the product-expansion track.** Per the user's own framing of this phase: the Performance Engine must eventually learn from real behavioral outcome evidence (an actual inquiry/booking/sale signal), not from a field that merely exists in a TypeScript interface. That integration (a real WhatsApp Business API reply/read-receipt source, a booking webhook, or an equivalent) has not been built in any phase to date — `docs/PERFORMANCE_ENGINE.md` names this explicitly as the prerequisite before any "engine" logic is written, and no engine logic exists yet (confirmed: zero scoring/ranking/recommendation code in this codebase). This is the single item this report most strongly recommends prioritizing before building on top of performance data. |

---

## SECURITY

| Area | Status | Evidence | Remaining limitation |
|---|---|---|---|
| Authorization tests | PASS | `tests/phase27-authz.test.ts`, `tests/phase27-bulk-approval-auth-roles.test.ts` (run this session against the emulator: passing); every Cloud Function reviewed in Phases 28–35 uses `verifyBusinessAccess` | — |
| Firestore rules | PASS | `tests/security.test.ts` (run this session: passing, includes real `assertFails`/`assertSucceeds` evaluations against the live emulator, confirmed by observing expected `PERMISSION_DENIED` gRPC warnings during the run) | `businesses/{businessId}` and other collections lack field-level write rules (defense-in-depth gap, not exploitable via this app's own client code — documented Phase 33/34) |
| Storage rules | PASS | `tests/storage.test.ts` (run this session: 10/10 passing) — own-business read/write allowed, cross-business denied, temp-upload isolation, agency-managed-business access with matching `agencyId` metadata, denied for mismatched | — |
| Callable authorization | PASS | Every reviewed callable (`onCall` + `validatedCallable`) requires `request.auth`; `HttpsError('unauthenticated', ...)` otherwise — confirmed in `functions/src/middleware/validation.ts` and exercised by every cross-tenant test above | — |
| Tenant isolation | PASS | Same evidence as Business Isolation section above | — |
| Secret exposure audit | PASS | This session: grepped all tracked `.ts`/`.tsx`/`.js`/`.json` source for live API-key/private-key patterns (`sk_live_`, `rzp_live_`, `AIzaSy...`, PEM private key headers) — zero matches; confirmed `.env`, `.env.local`, `.env.*.local` are gitignored; confirmed `.env.local` exists on disk but `git ls-files` shows it is **not** tracked; confirmed `.env.example` contains only placeholder values, never real secrets; `README.md`'s Secret Management section correctly routes real secrets to Firebase Functions Secrets / Vercel env vars, never `.env.local` | Not a full third-party secret-scanning tool (e.g. `gitleaks` / `trufflehog`) run — this was a manual, pattern-based grep audit, not an exhaustive automated scan |

---

## FRONTEND

| Area | Status | Evidence | Remaining limitation |
|---|---|---|---|
| Responsive UI | PARTIAL | All new UI (Phases 32–35) reuses the same Tailwind responsive utility classes already in production use elsewhere (`grid-cols-1 sm:grid-cols-2` etc.) | **Not visually verified in an actual mobile browser/viewport** — no browser tool available in this environment; this is a structural-consistency claim, not a rendered-pixel verification (documented consistently since Phase 33) |
| Loading | PASS | Every page/component reviewed has an explicit loading test: `ProtectedRoute`, `dashboard`, `onboarding`, `CampaignWizard`, `GenerationProgress`, `analytics`, `billing`, `business-profile`, `ImageUploader` | — |
| Error | PASS | Same set of pages, explicit error-state tests — friendly messages, never raw stack traces (e.g. dashboard/CampaignWizard test: "never a raw stack trace") | `src/app/products/page.tsx` has an error state with no retry button, inconsistent with the pattern elsewhere (Phase 35 report, noted not fixed — a UX inconsistency, not a defect blocking this phase) |
| Empty | PASS | Dashboard, CampaignWizard, onboarding (existing-business skip), products, analytics ("No activity yet"), business-profile all have tested empty states | — |
| Unauthorized | PASS | `ProtectedRoute.test.tsx` — redirects to `/login?redirect=...`, never renders protected content; `PublicOnlyRoute.test.tsx` inverse; every cross-tenant backend test above is the server-side half of this guarantee | — |
| Offline | NOT IMPLEMENTED | Repo-wide search for `navigator.onLine`/offline-detection logic in `src/` found no matches (one unrelated hit: an AI-provider status enum) | No offline detection, banner, or queued-retry behavior exists anywhere in the frontend. This was never claimed as implemented in any prior phase; recorded here as genuinely absent, not deferred-and-forgotten. |
| Navigation | PASS | `Sidebar.tsx`'s primary/account nav (unit-covered indirectly via every page test that renders it); route-level auth guards tested via `ProtectedRoute` | Sidebar itself has no dedicated navigation-click test file (its logout/credits behavior is covered; pure link-navigation is not) |
| Session persistence | PASS | `useAuth.test.tsx` (Phase 35, 7 tests) — a returning user with a live session is `authenticated` immediately on mount (no login flash), reacts correctly to later sign-in/sign-out events via the real `subscribeToAuthState` subscription | — |

---

## AUTOMATED VALIDATION

Commands run in this session, in order, with real output (not assumed):

| Command | Result | Evidence |
|---|---|---|
| `npm run lint` (frontend) | **PASS** (after fix — was FAIL) | Fixed this session (see "Defects found and fixed"); re-run exits clean, 0 errors |
| `npm run typecheck` (frontend) | **PASS** | `npx tsc --noEmit -p tsconfig.json` — no output, clean |
| `npm run build` (frontend) | **PASS** | `next build` — compiles, lints (now clean), type-checks, generates all 18 routes successfully |
| `npm test` (frontend) | **PASS** | `npx jest --coverage` — 28 suites, 280 tests (273 passed, 7 skipped — emulator-gated tests that self-skip without `FIRESTORE_EMULATOR_HOST`, not failures), 0 failed |
| `npm run functions:build` | **PASS** | `npm --prefix functions run build` (`tsc`) — clean |
| `npm run functions:typecheck` | **PASS** | `tsc --noEmit` — clean |
| `npm run functions:test` (against Firestore + Auth emulators) | **PASS** | 32 suites, 254 tests, 0 failed |
| Root-level `tests/` suite (Firestore/Storage rules, phase27 authz, Truth Check, campaign wizard, validation) | **PASS** | 10 suites, 116 passed, 6 skipped (role combinations requiring setup not present in this run), 0 failed |
| `npm run functions:lint` (backend) | **FAIL** | ~30 files with pre-existing unused-import/unused-variable errors (`Timestamp`, `HttpsError`, `Business`, `Campaign`, etc., imported but never used) predating every phase in this project's documented history — confirmed by checking that the vast majority of flagged files (e.g. `getBusiness.ts`, `listBusinesses.ts`, `createCampaign.ts`, `rateLimit.ts`, `imagePromptBuilder.ts`, `razorpayWebhook.ts`) were never touched by any phase from 28 through 36. Not fixed in this phase: removing ~30 files' worth of imports/variables is a broad, non-mechanical change (unlike the CRLF fix) that risks unintended side effects and was judged out of scope for a "do not add new features unless a critical defect is discovered" verification phase. **This is a real, outstanding item, not ignored** — see Recommendations. |

---

## DOCUMENTATION

Updated this phase:
- **`README.md`** — was frozen at "PHASE 1 — LOCAL DEVELOPMENT, NO PRODUCT FEATURES WERE IMPLEMENTED" despite 35 phases of substantial feature work since. Corrected: "Current Phase" section, "Phase Boundary" (both instances — now marked historical with an accurate ✅/⚠️ status per item), the Feature Flags table (confirmed via repo-wide search that none of the 4 listed flags are read by any code — salon/real estate are always-on, not flag-gated), "Remaining Issues", "Next Steps", and the `docs/` project-structure listing (the Phase-0 planning docs it referenced — PRODUCT.md, ARCHITECTURE.md, etc. — were never actually created; corrected to point at the real per-phase reports instead).
- **`docs/PERFORMANCE_ENGINE.md`, `docs/PERFORMANCE_DATA_READINESS.md`** — re-read, confirmed still accurate and truthful (Phase 34, unchanged).
- **This report** (`docs/PHASE_36_FINAL_MITRA_READINESS_REPORT.md`) — the current source of truth for overall system status.

Per-vertical and per-area documentation already exists and was verified current, not superseded:
Restaurant (`PHASE_4`–`PHASE_9` reports), Salon (`PHASE_30_SALON_MODE_REPORT.md`), Real Estate
(`PHASE_31_REAL_ESTATE_MODE_REPORT.md`), Analytics (`PHASE_32_ANALYTICS_DASHBOARD_REPORT.md`),
Business Brain (`PHASE_33_BUSINESS_BRAIN_UI_REPORT.md`), Performance
(`PHASE_34_PERFORMANCE_DATA_PIPELINE_REPORT.md`, `PERFORMANCE_ENGINE.md`,
`PERFORMANCE_DATA_READINESS.md`), Testing (`PHASE_35_FRONTEND_TEST_HARDENING_REPORT.md`). No
deferred functionality is marked as implemented in any of these — each one's own "Known
limitations" / "Tests intentionally not added" sections were preserved as-is, not overwritten.

---

## Recommendations (not executed in this phase — verification only)

1. **Backend lint debt** (`npm run functions:lint` FAIL) — a dedicated, reviewed cleanup pass
   across the ~30 flagged files, ideally with `git diff` reviewed file-by-file rather than a blind
   bulk fix, since some "unused" variables may be intentional (destructuring for documentation, or
   TypeScript inference side effects).
2. **Performance Engine real data source** — per the user's own framing, this is the most
   important next step before any performance-based logic is built: integrate a real
   inquiry/outcome signal (WhatsApp Business API read-receipts/replies, a booking webhook, or
   equivalent) before writing any scoring/ranking/recommendation code against
   `campaign_performance`.
3. **`.gitattributes`** — adding `* text=auto eol=lf` and a one-time `git add --renormalize .`
   would prevent the CRLF condition (fixed this session) from silently recurring on future Windows
   checkouts.
4. Everything else flagged as a "remaining limitation" above is minor/cosmetic relative to these
   two.

---

## FINAL VERDICT

**READY FOR NEXT VALIDATION STAGE**

Basis: every required automated-validation command now passes except one (`npm run functions:lint`,
attributable to pre-existing, non-regressed debt across files this project never touched in any
phase, not a functional defect); every product-matrix line item across all three verticals is
PASS; business/agency/tenant isolation, Truth Check invalidation/regeneration guarantees, and the
full credits lifecycle (reservation/finalization/refund/concurrency/idempotency/duplicate
generation) are all PASS with emulator-backed evidence; Firestore/Storage rules and callable
authorization are PASS; no secrets are exposed; the Performance Engine's readiness status is
truthful and was re-verified, not just re-asserted. The one NOT IMPLEMENTED item (offline
detection) and the one PARTIAL item (responsive UI, structurally consistent but not visually
verified) were never claimed as done in any prior phase and do not block moving to the next stage
of the two-track roadmap (customer validation of the restaurant MVP; continued product expansion
per the Performance Engine recommendation above).
