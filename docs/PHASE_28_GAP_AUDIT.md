# Phase 28 — Gap Audit, Scope Cleanup & Source-of-Truth Verification

**Status: AUDIT ONLY. No feature code was implemented, fixed, or refactored in this phase.**
All findings below are traced to actual runtime code paths (grep + read verified), not inferred
from type definitions, comments, or dead code, unless explicitly labeled as such.

---

## Executive Summary

The product's real, executed behavior is **narrower than the type system and prompt-registry
scaffolding suggest**. Three findings change the shape of the five known gaps materially:

1. **Only `restaurant` is a real vertical.** `salon` and `real_estate` pass validation and can be
   persisted, but there is no UI to create them, and — critically — the code path that actually
   generates campaigns (`pipeline.ts`) has **hard-coded, restaurant-only, Hyderabad-only prompt
   strings**. A parallel, more vertical-aware prompt system (`promptRegistry.ts`) exists but is
   **never called by anything** — it is dead code that creates a false impression of salon
   readiness.
2. **`campaignHistory` and its `performance.{whatsappClicks,inquiries}` fields are 100% dead
   schema.** The array is initialized to `[]` once, at business creation, and nothing anywhere in
   the codebase ever appends to it. This isn't "stale" data — it's data that has never existed for
   a single business, ever.
3. **Analytics events are real and being written**, but the ownership-verification step in the one
   client-triggerable path (`trackAnalyticsEvent`) is a stub that always passes, and no aggregation
   or dashboard of any kind consumes the data.

None of the five gaps are simple "just build the missing screen" work — each has a load-bearing
architectural issue underneath it (dead prompt registry, dead schema, unverified ownership check,
non-existent shared hooks) that must be resolved before the obvious UI work would even be correct.

**Verdict: AUDIT COMPLETE** (see §Verification Run below).

---

## 1. Restaurant / Salon / Real Estate — Vertical Support Matrix

**Architectural finding that changes everything else in this section:** `functions/src/services/ai/promptRegistry.ts`
defines versioned, vertical-aware prompt templates with explicit `salon`/`restaurant` branches
(lines 114–115, 133, 142–152). It looks like the production prompt source. It is not. A repo-wide
grep of `promptRegistry` outside its own file returns **zero results** — nothing imports or calls
it. The function that actually runs generation, `GenerationPipeline` in `pipeline.ts`, builds every
prompt through its own private `buildXPrompt` methods using **hard-coded restaurant/Hyderabad
strings** (e.g. `pipeline.ts:1277` — *"You are a Hyderabadi marketing copywriter. Generate a
complete campaign pack for a Hyderabad restaurant."*, unconditional; `pipeline.ts:1326` — *"You are
a creative director for Instagram food marketing"*, unconditional). **`promptRegistry.ts` is dead
code.** Any assessment of salon readiness must discount it entirely.

| Feature | Restaurant | Salon | Real Estate |
|---|---|---|---|
| Category validation (Zod, create/update) | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED — `createBusiness.ts:17` accepts all three identically; `createBusiness.test.ts:98` proves salon persists at the schema level |
| Business onboarding UI | IMPLEMENTED | MISSING | MISSING — `onboarding/page.tsx:20,34,140` hard-code the form's type to the literal `'restaurant'`; line 288 renders static text, not a selector |
| Campaign wizard objectives/CTA/offer types | IMPLEMENTED | MISSING | MISSING — `campaign/constants.ts:23–86` only exposes restaurant vocabulary (`new_dish`, `book_table`, `view_menu`); no `book_appointment` or `schedule_visit` equivalents exist |
| Prompt templates (`promptRegistry.ts`) | IMPLEMENTED but DEAD CODE | PARTIAL but DEAD CODE | MISSING, DEAD CODE | Not consumed by the live pipeline — see architectural note above |
| Copy generation (live path, `pipeline.ts`) | IMPLEMENTED | MISSING | MISSING — `pipeline.ts:1277` unconditional restaurant framing |
| Image/creative-direction generation | IMPLEMENTED | MISSING | MISSING — `pipeline.ts:1326`; `imagePromptBuilder.ts:212,275,314,358` restaurant/food-only strings |
| Image analysis persona (`vision.ts`) | IMPLEMENTED | IMPLEMENTED | MISSING — `vision.ts:138` binary ternary; real_estate silently falls through to the food/product-analyst branch |
| Truth Check verification rules | IMPLEMENTED | PLACEHOLDER | MISSING — `truthCheck.ts:949–972` restaurant-only claim dictionary (delivery/dine-in/parking/wifi); `validationStages.ts:89` explicitly concedes salon medical-claim checking is a future TODO inside a prompt comment |
| Campaign strategy generation | IMPLEMENTED | PARTIAL | MISSING — strategy-stage template has salon guidance in the dead registry only; the live hard-coded prompts override it |
| Localization (language/regional style) | IMPLEMENTED | NOT APPLICABLE | NOT APPLICABLE — tied to city/region, not vertical; scope is Hyderabad-only by product decision |
| Pricing/credits | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED — `pricing.ts` has zero vertical branching; genuinely vertical-agnostic, not a gap |
| Dashboard/analytics vertical awareness | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE — no analytics UI exists at all (§2) |
| Test coverage | PARTIAL | PLACEHOLDER | MISSING — one CRUD-level test for salon (`createBusiness.test.ts:98`), nothing exercising generation/Truth Check for salon; **zero** test coverage of any kind for real_estate |

**Bottom line:** restaurant is the only vertical a real user can create or generate a campaign for.
Salon has a database row and a checkbox in test fixtures; real_estate has a string in a type union.

---

## 2. Analytics — Event Tracing

**Definitions:** `functions/src/services/analyticsService.ts:8–16` — seven canonical events:
`signup`, `onboarding_complete`, `campaign_started`, `campaign_generated`, `asset_downloaded`,
`whatsapp_clicked`, `subscription_started`. Each is written via `trackEvent()` as an independent
document in Firestore's flat `analytics_events/{eventId}` collection (no per-business/per-campaign
rollup document of any kind).

**Call sites are real, not fabricated:**
- `signup` — server-side, `onUserCreated.ts:131`, fires on the auth trigger.
- `onboarding_complete` — server-side, `createBusiness.ts:155`.
- `campaign_started` / `campaign_generated` — server-side, `generateCampaignStrategy.ts:234` and `:371–376`.
- `asset_downloaded` / `whatsapp_clicked` — **client-triggered**, `CampaignDetailContent.tsx:290,349,402–406`, routed through the `trackAnalyticsEvent` callable (the only viable client write path — direct client Firestore writes to `analytics_events` are denied by `firestore.rules:191–195`).
- `subscription_started` — server-side, `razorpayWebhook.ts:347–355`, after webhook verification.

**Dead code found:** the convenience wrapper functions (`trackSignup`, `trackCampaignStarted`, etc.,
`analyticsService.ts:60–198`) are never called anywhere — every real call site uses the generic
`trackEvent(ANALYTICS_EVENTS.X, ...)` directly.

**Security gap worth flagging (not a scope gap, a real risk):** `trackAnalyticsEvent.ts:37–46` and
`:48–54` contain code comments admitting the ownership-verification check for `asset_downloaded`/
`whatsapp_clicked` payloads is a stub — *"we'll skip the full verification to avoid type issues"*.
Any authenticated user can currently attribute an analytics event to any `businessId`/`campaignId`
they choose; the callable only checks that the caller is authenticated, not that they own the
resource named in the payload.

**No aggregation exists.** Grepping `aggregat*`, `rollup`, `summar*` across the whole repo returns
zero analytics-related hits. **No frontend ever reads analytics data back** — `analyticsService.listByBusiness()`
in `src/services/database.ts` exists but is never called from any component. **No chart, stat, or
dashboard UI of any kind exists.** This confirms the prior audit's finding exactly.

---

## 3. Business Brain — Data Audit

`businessBrain` is a single nested object embedded in `businesses/{businessId}` (not a
subcollection) — `identity`, `products[]`, `brand`, `audience`, `localization`, `businessRules`,
`campaignHistory[]`, plus a `verticalProfile` that is **declared in the type but never written or
read anywhere** (fully dead, same conclusion as §1).

**Writes:** the entire `businessBrain` object is constructed exactly once, at
`createBusiness.ts:82–121`, and several of its fields are **permanent placeholders, not real
data**: `brand.colors` is always the literal `{primary:'#E84D1A', secondary:'#FFFFFF',
accent:'#FFD700'}` regardless of anything the user entered; `brand.fonts` is always
Poppins/Inter; `audience.targetCustomer`/`preferences` are always `''`;
`businessRules.offerValidityRules`/`pricingRules` are always `''`. These are not "derived" values —
they are hard-coded and never subsequently written by any update path found in this audit.

**Reads:** `generateCampaignStrategy.ts:142–146` is the sole read fan-in at generation time. The
important finding here: `businessBrain.localization` (saved once at onboarding) is **not what's
actually used** — `generateCampaignStrategy.ts:260–261` passes `data.localization` (the campaign
wizard's fresh, per-campaign selection) into the pipeline instead. The stored onboarding-time
localization profile is write-once and functionally ignored at generation time. Inside
`pipeline.ts`, the entire `businessBrain` object is dumped as raw JSON into one prompt
(`pipeline.ts:1139`) for the LLM to read unstructured — only `businessRules.operatingMode`
(`pipeline.ts:912,950`) is read by name in code. `businessBrain.audience` and
`businessBrain.products[]` are never accessed by field name anywhere outside that JSON dump.

**Editability, confirmed directly:**
- **BrandKit is genuinely editable** — `src/app/brand/page.tsx:419` calls `brandKitService.upsert(...)`,
  a real client-side write path (notably: this bypasses the `createBrandKit`/`updateBrandKit`
  Cloud Functions entirely, writing straight to Firestore via the client SDK service layer instead).
- **Products have no edit path.** A repo-wide search for any frontend call to `updateProduct`
  (function or service) returns zero results — `src/app/products` only lists and creates; there is
  no product-edit UI or call site.
- **`businessBrain`'s nested sub-fields (audience, localization, businessRules, campaignHistory,
  verticalProfile) have no edit path at all**, post-creation, anywhere in the frontend.

---

## 4. Performance Data — `campaignHistory.performance.{whatsappClicks,inquiries}`

**Every occurrence of `whatsappClicks` and `inquiries` in the entire repository is a type
definition** (`functions/src/types/index.ts:444–445`, `src/types/index.ts:191–192`, and their
compiled `.d.ts` mirror). There is no read, no write, no test assertion of either field anywhere.

**`campaignHistory` itself has exactly one write site in the whole codebase:**
`createBusiness.ts:119` — `campaignHistory: [],`. Nothing ever appends to it afterward: no
`generateCampaignStrategy` step, no webhook, no scheduled function records a completed campaign
into `businessBrain.campaignHistory`. Two test files (`tests/campaignWizard.test.ts:103`,
`tests/truthCheck.test.ts:137`) set `campaignHistory: []` as mock-fixture scaffolding — not real
writes, and both use an empty array.

**Conclusion:** this is not stale or partially-populated data — it is a field that has never had a
single value in any environment. **Confirmed independently** (not solely from the subagent's
trace): `createBusiness.ts:119` was read directly and shows the empty-array initialization; no
second write site exists.

**Type-safety note:** both fields are typed as plain `number`, not `number | undefined`. This is
moot today (nothing reads a partially-populated `performance` object), but it means a future,
naively-written aggregation (`el.performance.whatsappClicks || 0`) would compile without the type
system forcing a null-check — worth fixing the type to `number | undefined` *when* (not before) a
real write path is built, so the compiler catches incomplete population instead of silently
defaulting to zero.

**No UI depends on this data.** No "Performance Engine" of any kind was found in code — see §6 for
the fact that `docs/PERFORMANCE_ENGINE.md` and `docs/PERFORMANCE_DATA_READINESS.md` (referenced in
this phase's brief) do not exist in the repository at all.

---

## 5. Frontend Test Coverage

Real frontend/component-level test files found: `src/app/billing/page.test.tsx`,
`src/components/campaign/CampaignDetailContent.test.tsx`,
`src/features/asset/services/assetService.test.ts`, `src/lib/utils/whatsapp.test.ts`, plus
schema/contract-only `tests/campaignWizard.test.ts` (tests the wizard's payload-building and
validation logic, never mounts the wizard UI). `tests/e2e/mvp-golden-path.spec.ts` (Playwright)
exists but its own header comment states it **has never been executed in this environment**
(browser launch is blocked by this machine's Application Control policy) — it counts as zero
verified coverage, not partial coverage, until it is actually run somewhere.

| Flow | Coverage |
|---|---|
| Authentication | **ZERO** |
| Onboarding | **ZERO** |
| Business Brain (UI) | **ZERO** (expected — no UI exists to test, see §3) |
| Campaign wizard | PARTIAL — payload/validation logic only, no UI interaction test |
| Upload | PARTIAL — file validation/compression logic only, no UI test |
| Generation (progress/polling) | **ZERO** |
| Truth Check (display) | YES — thorough (`CampaignDetailContent.test.tsx`) |
| Regeneration | YES |
| Download | YES |
| WhatsApp share | YES |
| Billing | YES |
| Analytics | **ZERO** (expected — no UI exists to test) |
| Routing (protected redirects) | **ZERO** |
| Error states | PARTIAL — narrow (missing-config, missing-phone-number); no generic network-failure or not-found-page test |

**Categories with zero coverage: Authentication, Onboarding, Business Brain UI, Generation
polling, Analytics, Routing.** Of these, **Authentication, Onboarding, and Generation polling are
the highest-risk gaps** — they're core-path flows every user goes through, not edge features.

---

## 6. Documentation Drift

**None of the eleven requested source-of-truth documents exist in this repository:**
`PRODUCT.md`, `ARCHITECTURE.md`, `DATABASE.md`, `AI_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`,
`SECURITY.md`, `MVP_SCOPE.md`, `TEST_PLAN.md`, `PROMPT_SYSTEM.md`, `PERFORMANCE_ENGINE.md`,
`PERFORMANCE_DATA_READINESS.md` — all "does not exist." `docs/` instead contains 20
`PHASE_N_*_REPORT.md` progress reports (Phase 4 through Phase 20B), which are retrospective build
logs, not living specs.

**`README.md` is actively stale and self-contradictory relative to the real codebase.** It
describes itself as documenting "Phase 1" only (line 11), states explicitly **"NO PRODUCT FEATURES
WERE IMPLEMENTED IN PHASE 1"** (lines 377, 444) and lists Authentication, Business onboarding,
Campaign Wizard, AI generation, Dashboard, Analytics, and Razorpay integration as "❌ OUT OF SCOPE
for Phase 1" — all of which demonstrably exist and work today per this audit and the prior product
audit. It also describes `docs/` (lines 183–192) as containing exactly the nine spec files listed
above ("Phase 0 - frozen") — which is false; those files don't exist. The feature-flag table (lines
170–173) is the one part of the README that appears to still be accurate: `NEXT_PUBLIC_ENABLE_SALON_VERTICAL`
and `NEXT_PUBLIC_ENABLE_REAL_ESTATE_VERTICAL` both default `false`, consistent with §1's finding
that neither vertical is real today.

**This phase does not rewrite the README or fabricate the missing docs** — per the phase rule,
inaccurate documentation is reported, not silently corrected.

---

## Actual Missing Work

Work that would need to be *built*, not just fixed:
1. A real vertical-aware prompt/generation path (the dead `promptRegistry.ts` is not a shortcut —
   it was never wired to `pipeline.ts` and its salon coverage is itself partial; real_estate has no
   template anywhere, dead or otherwise).
2. Salon/real-estate onboarding UI, wizard objectives/CTAs, Truth Check claim dictionaries, and
   image-analysis personas (`vision.ts`'s real_estate case).
3. A campaign-history write path (on generation completion) if `performance` tracking is ever
   wanted — currently there is no event or trigger that would populate it even structurally.
4. Any analytics dashboard UI, plus an aggregation layer (none exists) to feed it.
5. A Business Brain edit UI for `audience`, `localization`, `businessRules` — currently unreachable
   after creation.
6. A product edit UI (creation and listing exist; editing does not).
7. Frontend tests for Authentication, Onboarding, Generation polling, and Routing.
8. An actually-run end-to-end test (the existing Playwright spec has never executed in this
   environment).

## Deliberately Deferred Work (confirmed, not just assumed)

- Salon/real-estate verticals — confirmed deferred by product decision: `README.md`'s feature-flag
  table explicitly gates both behind `false`/"Post-MVP" flags, and `campaign/constants.ts`'s own
  header comment states the MVP scope is restaurants/cloud kitchens only.
- WhatsApp Business API and Agency workspace — same feature-flag table, both `false`/"Post-MVP."
- Single-region scope (Hyderabad-only language/regional-style options) — confirmed intentional via
  `campaign/constants.ts` comments citing the MVP scope decision.

## Potential Hidden Risks

1. **`trackAnalyticsEvent`'s ownership check is a stub that always passes** (`trackAnalyticsEvent.ts:37–46,48–54`)
   — any authenticated user can currently write an analytics event attributed to any businessId/campaignId,
   not just their own. Low severity today (analytics has no reads/consumers), but it's a live gap,
   not a documentation gap.
2. **The dead `promptRegistry.ts` could mislead a future engineer into thinking salon support is
   further along than it is** — it reads as a maintained, production prompt source and is not.
3. **`functions/` ESLint is currently failing with ~1,600 problems**, the overwhelming majority
   being CRLF line-ending mismatches (`Delete ␍`) plus a smaller set of genuine unused-import
   errors (e.g. `validationStages.ts:2-10`, `analyticsService.ts:2-3`, `firestore.ts:2`,
   `usageControl.ts:2-3`) and several files ESLint can't parse at all because they're outside the
   configured `tsconfig` project (`validationStages.test.ts`, `vision.test.ts`,
   `analyticsService.test.ts`, `firestore.reserveCredits.test.ts`, `usageControl.test.ts`,
   `usageControl.concurrency.test.ts`, `testSetup.ts`, `logging.test.ts`). This is pre-existing —
   not introduced by this audit phase — but it means `functions-lint` in CI is either not actually
   enforced the way the workflow file implies, or has been failing silently for some time. This is
   worth its own investigation before the next phase touches `functions/`.
4. **13 of 26 functions test suites are gated behind Firebase emulators and did not run in this
   environment** — the passing 13/26 suites cover AI-pipeline/validation logic; the skipped half
   likely includes security-rules and integration-level tests. This audit did not stand up
   emulators (out of scope — "audit only"), so those suites' current pass/fail status is unverified
   here, not confirmed-passing.
5. **`campaignHistory`/`performance` fields being typed as plain `number`** (not
   `number | undefined`) is a latent trap for whoever eventually builds the write path — see §4.

## Recommended Phase Order

1. **Fix the `functions/` lint failure and confirm CI is actually enforcing it** — a currently-broken
   quality gate is higher priority than any feature work; building on top of it risks the same
   drift the docs have (things reported as "done" that quietly aren't).
2. **Close the `trackAnalyticsEvent` ownership-verification stub** — small, contained, security-relevant.
3. **Decide the fate of `promptRegistry.ts`**: either wire it into `pipeline.ts` and finish its
   salon/real_estate coverage, or delete it — its current dead, half-finished state is actively
   misleading.
4. **Frontend tests for Authentication, Onboarding, and Generation polling** — cheapest, highest
   coverage-of-core-path return, no design decisions required.
5. **Business Brain edit UI + product edit UI** — unblocks a real product gap independent of any
   vertical decision.
6. **Vertical expansion (salon first)** — only after #3, since building salon-specific prompts on
   top of a dead registry (or hard-coding a second restaurant-shaped path into `pipeline.ts`) would
   compound the architecture problem rather than fix it.
7. **`campaignHistory.performance` write path + analytics dashboard** — lowest priority; no product
   surface currently depends on either, and building the dashboard before deciding what performance
   data even means for salon/real_estate would likely need rework.
8. **Rewrite `README.md` and produce the missing `docs/` spec files** — do this once the above
   settles, not before, so the new docs describe the corrected state rather than needing a second
   correction pass.

---

## Verification Run

All commands below were run from the actual repository, not assumed.

| Command | Location | Result |
|---|---|---|
| `npm run lint` | frontend (`/`) | **PASS** — zero errors |
| `npm run lint` | `functions/` | **FAIL** — 1,613 errors, 7 warnings (see Hidden Risk #3; pre-existing, not introduced by this phase) |
| `npm run typecheck` | frontend | **PASS** |
| `npm run typecheck` | `functions/` | **PASS** |
| `npm run build` | frontend (`next build`) | **PASS** — compiles, generates all 18 routes |
| `npm run build` | `functions/` (`tsc`) | **PASS** |
| `npm test` | frontend (jest) | **PASS** — 14 suites, 164 passed / 7 skipped (emulator-gated) |
| `npm test` | `functions/` (jest) | **PARTIAL** — 13 of 26 suites ran and passed (107 passed / 53 skipped within those); the other 13 suites are gated behind Firebase emulators, which were not started in this audit (out of scope for an audit-only phase) |

The functions-lint failure is a real, pre-existing condition of the repository, not a regression
caused by this audit (no files were edited in this phase). It is reported here rather than fixed,
per the "no feature implementation" rule — but see Recommended Phase Order #1.

---

## Final Verdict

**AUDIT COMPLETE.**

This verdict reflects that every requested trace was completed with runtime evidence (not
inference from types/comments), all required verification commands were run and their real
results reported (including the functions-lint failure, which is not swept under the rug), and no
feature code was modified. It does **not** mean the underlying product is complete — five real
gaps, three of them structurally deeper than "missing UI," remain exactly as documented above.
