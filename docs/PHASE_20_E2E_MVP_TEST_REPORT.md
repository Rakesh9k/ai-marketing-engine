# PHASE 20 E2E MVP TEST REPORT

**Priority:** 🔴 P0
**Verdict: PHASE 20 BLOCKED**

## 1. Executive Summary

This phase set out to prove the complete MVP golden path end-to-end. For the first time in this session, a real, functional Chromium browser was available (all prior phases — 16, 17, 18, 20A — were blocked by this environment's Application Control policy; that policy is no longer blocking browser launches, re-verified fresh this phase, not assumed carried-over). This let the audit go materially further than any prior phase: real browser navigation, real form interaction, and real network/console inspection against the actual application running against live Firebase emulators.

That real-browser testing surfaced a **new, genuine P0 blocker that no prior phase had discovered**: with Phase 20A's App Check integration active (as required — it was **not** weakened to investigate this), **both signup (`createUserWithEmailAndPassword`) and login (`signInWithEmailAndPassword`) fail in the browser**, each surfacing a visible, user-facing error — `AppCheck: Fetch server returned an HTTP error status. HTTP status: 400. (appCheck/fetch-status-error).` Root-caused (not just observed) to: Firebase's JS SDK attaches an App Check token to *all* Firebase service requests once App Check is initialized on the app — including plain Authentication calls, not just Cloud Functions callables — and the debug-token exchange this environment's `NEXT_PUBLIC_USE_EMULATORS=true` configuration relies on for local App Check testing requires a real round-trip to Google's live App Check backend, which correctly rejects the placeholder `demo-project`/`demo-api-key` configuration this local environment uses for the fully-offline Auth/Firestore/Storage/Functions emulators. **No account can be created or signed into through the actual browser UI in this environment while App Check remains correctly enforced** — confirmed for both signup and login independently, and confirmed not resolved by adjusting `isTokenAutoRefreshEnabled` (tested and reverted, see §9).

This is reported as **environment-dependent, not a fixable application code defect**, per the phase's own explicit rule (§51/§17 of the brief): the actual fix requires registering the SDK's auto-generated debug token in the real Firebase Console for a real, non-placeholder Firebase project — an action requiring Google-account browser access and Firebase Console credentials this environment does not have. **App Check was not weakened, disabled, or bypassed to work around this** — it remains fully enforced (verified, see §9), exactly as instructed.

Because this blocker prevents the golden path from proceeding past the account-creation step in the one environment configuration available here, and per the phase's own verdict rule (*"a genuine P0 blocker remains... core MVP journey cannot proceed"*), the verdict is **PHASE 20 BLOCKED**. This is not a statement that Mitra's architecture is broken — every layer this audit could reach independently of the browser (Firestore/Storage rules, credit ledger, campaign pipeline, Truth Check server-authority, webhook idempotency, App Check backend enforcement itself) was re-verified passing, live, this phase (§21). It is a statement that the specific, real customer-facing action of *signing up or logging in through a browser* cannot currently be demonstrated to work in any environment available to this audit.

## 2. Environment

| Classification | Value |
|---|---|
| A. Local development | YES |
| B. Firebase emulator environment | YES — Auth/Firestore/Storage/Functions emulators, `--project demo-project` |
| C. Staging | NO |
| D. Production | NO |
| E. Real browser available | **YES — new this phase.** Chromium (via the existing Playwright installation from Phase 16) launches and renders successfully; re-verified fresh at the start of this phase (`chromium.launch()` succeeded, a `data:` URL rendered and its text was read back) rather than assumed from a prior phase's finding |
| F. Real browser unavailable | NO (superseded — see E) |
| G. Real AI credentials available | NO — no `functions/.env` or equivalent exists; `GEMINI_API_KEY`/`OPENAI_API_KEY`/`NVIDIA_API_KEY` all unset |
| H. Real AI credentials unavailable | YES |
| I. Razorpay test credentials available | **PARTIAL** — `NEXT_PUBLIC_RAZORPAY_KEY_ID` in `.env.local` is a real-shaped `rzp_test_...` value (client-visible public key ID), but no backend `RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET` exists anywhere in this environment — the backend cannot actually create a real Razorpay order without it |
| J. Razorpay live credentials available | NO |

`.env.local` (present, real Firebase client config pointed at the `demo-project` emulator convention — `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-project`, `NEXT_PUBLIC_USE_EMULATORS=true`) was read for classification purposes only; no value from it is reproduced in this report beyond the non-secret classifications above.

## 3. Source-of-Truth Documents Reviewed

Missing (consistent with every phase this session): `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/AI_ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/SECURITY.md`, `docs/MVP_SCOPE.md`, `docs/TEST_PLAN.md`, `docs/PROMPT_SYSTEM.md`, `docs/PERFORMANCE_ENGINE.md`, `docs/PERFORMANCE_DATA_READINESS.md`, `docs/FIRST_CUSTOMERS.md`, `docs/SALES_PLAYBOOK.md`, `docs/CUSTOMER_FEEDBACK.md`, `docs/CUSTOMER_BLOCKERS.md`.

Found and read: `docs/PHASE_19_PRODUCTION_READINESS_REPORT.md`, `docs/PHASE_19A_PRODUCTION_BLOCKER_FIXES_REPORT.md`, `docs/PHASE_20A_APP_CHECK_INTEGRATION_REPORT.md` (all from earlier in this session/a parallel continuation of it — treated as prior evidence, re-spot-checked rather than trusted blindly, per this phase's own rule not to assume an earlier phase is correct merely because it reports PASS).

## 4. Golden Path Definition

As specified in the phase brief:

```
OPEN MITRA → SIGN UP → ONBOARDING → BUSINESS PROFILE → PRODUCT → UPLOAD PHOTO
→ CAMPAIGN → REAL AI GENERATION → TRUTH CHECK → REVIEW → DOWNLOAD → WHATSAPP
→ FREE CREDITS CONSUMED → BILLING → RAZORPAY → CREDITS GRANTED → SECOND CAMPAIGN
→ LOGOUT → LOGIN AGAIN → DATA PERSISTS
```

## 5. Step-by-Step Results

| Step | Result | Evidence | Notes |
|---|---|---|---|
| 1. Open application | **PASS** | Real browser: `GET /` → 200; title `"Mitra — One photo. A month of marketing."`; landing page body text confirmed correct (Phase 17 content); zero fatal page errors | Genuine real-browser evidence, not curl-only |
| 2. Signup | **FAIL (blocked by App Check/Auth interaction — see §1)** | Real browser: filled and submitted the actual signup form; page displayed `AppCheck: Fetch server returned an HTTP error status. HTTP status: 400.`; zero users created in the Auth emulator (confirmed via emulator's own accounts list, 0 users) | Root-caused, not merely observed — see §9 |
| 3. Onboarding | **NOT REACHED** | — | Blocked by step 2 |
| 4. Business Brain | **NOT REACHED (via browser)**; **PASS (via emulator-backed tests)** | `createBusiness.test.ts` (re-run live this phase) verifies Business Brain fields persist correctly server-side | Backend mechanism proven; browser path blocked |
| 5. Product | **NOT REACHED (via browser)**; **PASS (via emulator-backed tests)** | `createProduct.test.ts` (re-run live) | Same distinction |
| 6. Asset upload | **NOT REACHED (via browser)**; mechanism previously verified in Phase 8/9/15 | — | Signed-URL generation itself remains untestable in any environment audited this session (unchanged finding) |
| 7. Campaign | **NOT REACHED (via browser)**; **PASS (via emulator-backed tests)** | `createCampaign.test.ts`, `generateCampaignStrategy.consistency.test.ts` (re-run live) | — |
| 8. Credit check | **NOT REACHED (via browser)**; **PASS (via emulator-backed tests)** | `usageControl.test.ts`, `usageControl.concurrency.test.ts`, `firestore.reserveCredits.test.ts` (re-run live, all passing, including the golden concurrency test) | — |
| 9. Real AI generation | **BLOCKED / NOT VERIFIED** | No `GEMINI_API_KEY`/`OPENAI_API_KEY`/`NVIDIA_API_KEY` configured anywhere in this environment | Per §16/§45 of the brief — not fabricated |
| 10. Truth Check | **NOT REACHED (via browser)**; **PASS (via emulator-backed tests)** | `truthCheck.test.ts` (28 tests, re-run live) — deterministic, provider-independent, already proven not to require real AI to validate its own logic | — |
| 11. Review | **NOT REACHED** | — | Blocked upstream |
| 12. Regeneration | **NOT REACHED** | — | Blocked upstream |
| 13. Download | **NOT REACHED (via browser)**; mechanism previously verified Phase 8/9 | — | — |
| 14. WhatsApp | **NOT REACHED (via browser)**; mechanism previously verified Phase 8/9 | — | — |
| 15. Analytics | **NOT REACHED (via browser)**; canonical events confirmed present in code (§17) | — | — |
| 16. Credit consumption | **NOT REACHED (via browser)**; **PASS (via emulator-backed tests)** | Same tests as step 8 | — |
| 17. Billing | **NOT REACHED (via browser)**; UI implementation verified present (Phase 19A) | — | — |
| 18. Razorpay | **BLOCKED / NOT VERIFIED** | No backend `RAZORPAY_KEY_SECRET` configured; real checkout cannot be exercised | — |
| 19. Webhook | **NOT REACHED (via browser)**; **PASS (via emulator-backed tests)** | `razorpayWebhook.test.ts` (re-run live, including concurrent-duplicate-delivery idempotency test) | — |
| 20. Credit grant | **NOT REACHED (via browser)**; **PASS (via emulator-backed tests, mechanism only)** | Same as step 19 | — |
| 21. Second campaign | **NOT REACHED** | — | Blocked upstream |
| 22. Logout | **NOT REACHED** | — | Blocked upstream (never logged in) |
| 23. Login again | **FAIL (same blocker as step 2)** | Real browser: pre-created a test account directly via the Auth emulator's own REST API (bypassing the broken browser signup specifically to test login in isolation); submitted the real login form; identical error: `AppCheck: Fetch server returned an HTTP error status. HTTP status: 400.` | Proves the blocker is Auth-SDK-wide (not signup-specific) |
| 24. Persistence | **NOT REACHED** | — | Blocked upstream |

**Result: 1 of 24 steps genuinely PASS via real browser. 9 of the remaining 23 have independent PASS evidence from live, freshly-re-run emulator-backed automated tests (backend mechanism only, explicitly not claimed as browser E2E per the brief's own §44 rule). 2 are explicitly BLOCKED/NOT VERIFIED due to missing external credentials (AI, Razorpay). The remainder are NOT REACHED because they are sequentially downstream of the step-2 blocker.**

## 6. Browser Console Findings

Classified per the brief's own critical/warning/harmless taxonomy:

- **CRITICAL**: `AppCheck: Fetch server returned an HTTP error status. HTTP status: 400. (appCheck/fetch-status-error)` — appears on both `/signup` and `/login` after form submission; user-facing (rendered in the form's own error banner, not just console). This is the step 2/23 blocker.
- **HARMLESS**: `WARNING: You are using the Auth Emulator, which is intended for local testing only.` — expected, standard Firebase emulator banner.
- **HARMLESS**: `App Check debug token: <uuid>. You will need to add it to your app's App Check settings in the Firebase console for it to work.` — this is the SDK correctly doing exactly what it's documented to do; confirms Phase 20A's client-side integration is functioning as designed up to the point external Console registration would be needed.
- **HARMLESS**: `Framing 'https://www.google.com/' violates the following report-only Content Security Policy directive: "frame-ancestors 'self'"` — this is a **report-only** CSP violation (the browser explicitly logs "no further action has been taken"), and this application sets no `Content-Security-Policy` header at all (confirmed via `next.config.ts` — only `X-Frame-Options`/`X-Content-Type-Options`/etc. are set, no CSP). This warning originates from Google's own reCAPTCHA/App Check response infrastructure, not from Mitra's configuration, and blocks nothing.
- **HARMLESS**: `net::ERR_BLOCKED_BY_ORB` on a POST to `csp.withgoogle.com` — Chrome's Opaque Response Blocking silently dropping Google's own CSP-violation telemetry beacon; unrelated to and does not affect application function.
- No hydration errors, no uncaught React exceptions, no blank-screen failures were observed on any page reached (`/`, `/signup`, `/login`).

## 7. Network Findings

- `GET /` → 200, real HTML.
- `POST https://content-firebaseappcheck.googleapis.com/v1/projects/demo-project/apps/.../exchangeDebugToken?key=demo-api-key` → **400**, on both the signup and login attempts. This is the root cause (§9). No token secret is exposed in this URL — `demo-api-key` is the deliberate, non-secret placeholder value Firebase's own tooling uses for `demo-` prefixed emulator projects (confirmed: this is not this project's real API key, which is never printed in this report).
- No Gemini/OpenAI/Razorpay secret key was observed in any request URL, request body, or response body across all network traffic captured this phase.
- No callable Cloud Function request was ever observed being sent, because the browser never reached an authenticated state from which the app would attempt one.

## 8. Firebase Auth Verification

**FAIL, for the reason established in §1/§9.** Both `createUserWithEmailAndPassword` and `signInWithEmailAndPassword`, called through the real browser SDK exactly as the application's own `SignupForm.tsx`/`LoginForm.tsx` call them (via `src/features/auth/services/authService.ts`, read and confirmed unmodified — pure Firebase Auth SDK usage, no custom App Check coupling written into this application's own code), fail with an App Check-originated error. A user account **can** be created directly against the Auth emulator's own admin REST API (confirmed — used to set up the login test in step 23), proving the Auth emulator itself is healthy and reachable; the failure is specific to the browser SDK's own automatic App Check token attachment, not the emulator's Auth logic.

## 9. App Check Verification

**Re-confirmed NOT regressed and NOT weakened this phase:**

- `enforceAppCheck: true` present on all 24 expected callable functions — re-grepped fresh this phase (`functions/src/functions/**`), identical result to Phase 20A's inventory.
- `healthCheck` remains the sole, intentional, documented exception (static status endpoint, no data, no auth) — unchanged, not modified this phase.
- No `enforceAppCheck: false` exists anywhere in production source (fresh grep, this phase).
- `src/lib/firebase/client.ts` — read in full this phase; confirmed **identical** to the state Phase 20A left it in. One temporary diagnostic edit was made and then explicitly reverted during this phase's root-cause investigation (`isTokenAutoRefreshEnabled: true → false → true`, to test whether the eager background token-refresh — as opposed to the Auth SDK's own on-demand token request — was the cause; it was not: the error persisted identically with auto-refresh disabled, isolating the cause to the Auth SDK's own per-request token attachment, not the proactive background refresh). The file's final, committed-equivalent state is unchanged from Phase 20A — confirmed via `git diff --stat` showing the same diff shape as before this phase began.
- **New finding this phase, not previously known**: App Check's browser-side integration is broader than Phase 20A characterized it — it affects Firebase Auth operations too, not only Cloud Functions callables. Phase 20A's own verification (Node + jsdom, not a real browser) could not have caught this, because it tested the Functions/callable path specifically and never exercised `createUserWithEmailAndPassword`/`signInWithEmailAndPassword` through the real SDK. This phase's real-browser access is what surfaced it.
- **Production App Check = NOT VERIFIED** (unchanged from Phase 20A — no real, registered reCAPTCHA v3 site key exists in this environment).
- `FIREBASE_APPCHECK_DEBUG_TOKEN` is confirmed used only in the `NEXT_PUBLIC_USE_EMULATORS === true` branch, exactly as intended — it is not reachable or active in a production build path (confirmed by re-reading the surrounding conditional in `client.ts`).

## 10. Firestore Verification

`tests/security.test.ts` and `tests/phase27-*.test.ts` (24 + 11 + 9 tests) re-run live against a fresh Firestore emulator this phase: **all passing**. Cross-user, cross-business, cross-agency isolation and client-side forgery rejection (status/truthCheckStatus/credits) all re-confirmed, not merely cited.

## 11. Storage Verification

`tests/storage.test.ts` (10 tests) re-run live this phase: **all passing**.

## 12. Functions Verification

All 24 `enforceAppCheck: true` functions build successfully (`npm run functions:build`, `npm run functions:typecheck`, both PASS this phase). **No callable function was actually invoked through the real browser this phase** (the Auth blocker in §8/§9 prevented the app from ever reaching an authenticated state that would trigger one) — this is stated plainly rather than papered over. The callable/App Check mechanism itself was proven functional against the Functions emulator using the real SDK in Phase 20A (Node + jsdom, not a browser); that specific finding is not re-derived here, only re-cited as still-standing prior evidence.

## 13. AI Verification

**BLOCKED / NOT VERIFIED.** No AI provider credentials exist in this environment (§2). Architecture (retry/timeout/validation/cost-ceiling) remains proven only against a mocked provider boundary (Phase 15), unchanged this phase.

## 14. Truth Check Verification

**PASS (deterministic logic, re-verified live this phase, provider-independent).** `truthCheck.test.ts`'s 28 tests re-run live: PASS/FAIL/REVIEW_REQUIRED behavior for price, discount, location, business/product name, prohibited claims, and aggregation logic all confirmed. Truth Check's actual invocation as part of a live AI-generated campaign remains blocked by §13's finding (Truth Check needs generated content to check, and no content can be generated without AI credentials).

## 15. Credits Verification

**PASS (mechanism, re-verified live this phase).** `usageControl.test.ts`, `usageControl.concurrency.test.ts` (including the golden concurrency test: two simultaneous reservations for the same balance, exactly one succeeds, balance never negative), `firestore.reserveCredits.test.ts` — all re-run live, all passing. No credits were manually granted or edited directly in Firestore at any point this phase.

## 16. Razorpay Verification

**BLOCKED for a real order/checkout** (no backend secret configured). **PASS for the backend logic that can be exercised**: `razorpayWebhook.test.ts` re-run live, including sequential and concurrent duplicate-delivery idempotency (exactly one credit grant either way). The Phase 19A frontend integration (`createSubscription` → Checkout → `verifyPayment`) was not re-exercised through a real browser this phase, since it is itself downstream of the login blocker (§8) — a customer cannot reach `/billing` without first being authenticated.

## 17. Analytics Verification

Canonical events (`SIGNUP`, `ONBOARDING_COMPLETE`, `CAMPAIGN_STARTED`, `CAMPAIGN_GENERATED`, `ASSET_DOWNLOADED`, `WHATSAPP_CLICKED`, `SUBSCRIPTION_STARTED`) confirmed still present in `functions/src/services/analyticsService.ts` — read, not modified. None could be triggered through a real browser this phase (downstream of the login blocker). No event was fabricated or manually inserted to simulate this.

## 18. Authorization / Tenant Isolation

Re-verified via the same live Firestore/Storage rules test suites cited in §10/§11 — unchanged from Phase 19's findings, re-confirmed passing rather than re-derived from first principles. A second real browser account for cross-tenant testing (brief §34) could not be exercised, since even a single account cannot complete signup in this environment.

## 19. Duplicate/Idempotency Tests

**PASS, via live emulator tests, re-run this phase**: duplicate campaign-credit reservation (`firestore.reserveCredits.test.ts`), duplicate/concurrent webhook delivery (`razorpayWebhook.test.ts`), duplicate finalize/refund races (`usageControl.concurrency.test.ts`). No duplicate-action test could be run through the real browser this phase (e.g., double-clicking a real Generate button), since no browser session ever reached that page.

## 20. Security Audit

Full regression grep run fresh this phase across `functions/src` and `src`:
- `enforceAppCheck: false` → **zero matches**
- `TODO`/`FIXME` security bypass language → **zero matches**
- Hardcoded API keys/secrets/service-account credentials → **zero matches** (the only `NEXT_PUBLIC_...key...`-shaped match is `NEXT_PUBLIC_FIREBASE_API_KEY`, which is not secret by design — Firebase Web API keys are meant to be public)
- Client-side credit-grant or client-side Truth-Check-PASS assignment → **zero matches** (all `creditsUsed`/`creditsIncluded` references in frontend code are read-only display bindings from server-fetched documents, not writes)
- Fake payment success / fake webhook success → **zero matches**

**No security control was weakened, removed, or bypassed anywhere in this phase.**

## 21. Automated Test Results

Run fresh this phase, against live emulators, not carried forward from a prior phase's numbers:

```
npm run lint                PASS (root, 0 errors)
npm run typecheck            PASS (root)
npm run build                  PASS (17/17 pages)
npm run functions:build         PASS
npm run functions:typecheck      PASS

Root suite (Firestore + Storage + Auth emulators):
  Test Suites: 14 passed, 14 total
  Tests:       7 skipped, 164 passed, 171 total

Functions suite (Firestore + Auth emulators):
  Test Suites: 26 passed, 26 total
  Tests:       160 passed, 160 total
```

**Combined: 40 suites, 324 tests passed, 7 legitimately skipped, 0 failed.** Per §44's explicit instruction, none of this is reported as "real browser E2E PASS" — these are `.run()`-style and emulator-integration tests, valuable and re-confirmed live, but distinct from the real-browser evidence in §5–§9.

## 22. Deployment Verification

Not re-audited from scratch this phase (Phase 19/19A's findings — Vercel-intended frontend, Firebase Functions-only backend deploy, no reachable production/staging URL in this environment — are unchanged and were not contradicted by anything found this phase). **PRODUCTION BROWSER E2E = BLOCKED / NOT VERIFIED** (no reachable deployment exists to test against, independent of the local-environment App Check finding above).

## 23. Blockers

| ID | Severity | Finding | Evidence | Status |
|---|---|---|---|---|
| P0-NEW | **P0 — BLOCKS CORE MVP JOURNEY** | Firebase Auth (`createUserWithEmailAndPassword` and `signInWithEmailAndPassword`) fails in the real browser once App Check is correctly initialized, because the App Check debug-token exchange this local environment relies on cannot complete against the placeholder `demo-project`/`demo-api-key` configuration — a real, Console-registered Firebase project and debug token are required, and this environment has no browser-based Firebase Console access to provide one | §1, §5 (steps 2 & 23), §8, §9 | **BLOCKED — genuinely environment-dependent, not fixed this phase.** Tested one plausible code-level mitigation (disabling `isTokenAutoRefreshEnabled`) and confirmed it does not resolve the issue (§9) — the failure is in the Auth SDK's own per-request token attachment, not the proactive background refresh. No other safe, in-scope code fix was identified that would not risk weakening App Check enforcement, which is explicitly forbidden. |
| P0 (carried forward, re-confirmed still present) | P0 | No real AI provider credentials in this environment | §2, §13 | NOT VERIFIED (unchanged from Phase 19) |
| P0-adjacent (carried forward) | P1 | No backend Razorpay secret; real checkout cannot be exercised | §2, §16 | NOT VERIFIED (unchanged from Phase 19) |
| — (carried forward) | — | No reachable production/staging deployment | §22 | BLOCKED (unchanged from Phase 19) |

## 24. Remaining Manual Actions

1. **Register the App Check debug token** (printed to the browser console on first local run — a real, live example: `App Check debug token: <uuid>. You will need to add it to your app's App Check settings in the Firebase console for it to work.`) in the real Firebase project's Console under App Check → Apps → this web app → Manage debug tokens, using a real (non-`demo-`) project ID in local `.env.local` for App Check purposes specifically, OR obtain and configure a real `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` for that real project. This is the single action that would unblock the entire remainder of the golden path in a properly-provisioned environment.
2. Provision real (test-mode-acceptable) AI provider credentials to unblock step 9.
3. Provision the backend `RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET` (test mode) to unblock step 18.
4. Confirm/establish a reachable staging or production deployment for production-level verification (§22, unchanged from Phase 19).

## 25. Final Verdict

**PHASE 20 BLOCKED**

A genuine P0 blocker — not fabricated, not assumed, root-caused through direct real-browser investigation — prevents the core MVP journey (a customer signing up or logging in) from proceeding past its first authenticated step in every environment configuration available to this audit. Per the phase's own verdict rule, this requires **BLOCKED**, not **PARTIALLY VERIFIED**: the distinction the brief draws is between "an external dependency couldn't be exercised" (which describes the AI/Razorpay/production-deployment gaps, all correctly the reason Phase 19 was itself BLOCKED) and "the core MVP journey cannot proceed" — and this phase's new finding is squarely the latter. App Check was not weakened, disabled, or bypassed at any point to investigate or report on this — it remains exactly as strict as Phase 20A left it, confirmed by direct inspection and by the unchanged 24/24 `enforceAppCheck: true` inventory. Every other architectural layer this audit could reach independent of the browser-Auth blocker — Firestore/Storage security rules, the credit ledger's concurrency/idempotency guarantees, Truth Check's deterministic logic, and Razorpay webhook idempotency — was re-verified passing, live, this phase, and none of it regressed.

---

## PHASE 20B — LOCAL APP CHECK / AUTH FIX

A dedicated follow-up investigation (full detail: `docs/PHASE_20B_APP_CHECK_AUTH_LOCAL_FIX_REPORT.md`) attempted to find and fix the root cause of the blocker above without weakening App Check. Summary:

**Original failure**: signup and login both fail in the real browser with `AppCheck: Fetch server returned an HTTP error status. HTTP status: 400. (appCheck/fetch-status-error).`

**Root cause, conclusively proven this follow-up** (not merely re-observed): a controlled experiment — temporarily removing the `initializeAppCheck()` call, reproducing signup, observing it succeed completely (real account created, landed on `/dashboard`), then immediately reverting — isolated Firebase App Check's presence on the app instance as the **sole causal variable**. Mechanism: Firebase's JS SDK automatically attaches App Check tokens to *all* Firebase service requests (Auth included, not just Functions callables) once App Check is initialized, and this environment's App Check debug-token exchange cannot succeed because it requires a live round-trip to Google's real App Check backend — confirmed this follow-up that **no local App Check emulator exists at all** (authoritative: `firebase emulators:start --help`'s `--only` option list has no `appcheck` entry) — against `.env.local`'s intentionally-placeholder `demo-project` Firebase config, which is Firebase's own correct, documented convention for local Auth/Firestore/Storage/Functions emulation but is fundamentally incompatible with App Check specifically.

**Evidence**: reproduced fresh from a cold start (emulators + dev server + real browser); traced the error to the Auth SDK's own call rejection (not a global handler, confirmed via `getAuthErrorMessage`'s implementation); ruled out `isTokenAutoRefreshEnabled` as the cause (disabled it, failure persisted identically); ruled out a CLI/programmatic debug-token-registration workaround (`firebase appcheck` is an unimplemented command-group label in the installed `firebase-tools@15.29.0`, and any working alternative would still require `firebase login` credentials this environment lacks).

**Fix**: **none implemented in shipped code** — no safe fix exists that doesn't require either weakening App Check (forbidden) or external credentials (a real Firebase project + interactive Firebase Console access to register a debug token) this environment cannot provide. The one temporary diagnostic edit made during the investigation was reverted immediately; `git diff` confirms zero net change to `src/lib/firebase/client.ts` from this follow-up.

**Local App Check behavior**: unchanged, fully enforced — 24/24 expected callables still `enforceAppCheck: true` (fresh inventory); negative tests (no auth header, and a fake auth header with no App Check header) both still correctly rejected with `UNAUTHENTICATED`, confirmed fresh this follow-up.

**Auth result**: BLOCKED (Gates A and B both fail, real browser, root-caused).

**createBusiness result**: BLOCKED — untestable through a real authenticated browser session since Gates A/B never produce one; the callable's own App Check/auth enforcement was independently re-confirmed correct via direct negative HTTP tests against the emulator.

**Production security status**: unchanged and unweakened — verified fresh, not assumed.

**Remaining external blockers**: a real, non-placeholder Firebase project configuration for local App Check testing (with a Console-registered debug token) is now the single most specific, well-characterized action needed to unblock the rest of Phase 20 — on top of the already-known needs for real AI provider credentials and a backend Razorpay test-mode secret.

**Phase 20B Verdict: PHASE 20B BLOCKED**
