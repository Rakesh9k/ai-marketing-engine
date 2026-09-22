# Phase 19C — Firebase App Hosting Production Report

Date: 2026-09-21. Status words: IMPLEMENTED / PASS / FAIL / BLOCKED / NOT VERIFIED / UNTOUCHED.

**Verdict: PHASE 19C BLOCKED.** App Hosting is deployed and the app serves correctly, but the real-browser gates (Auth, App Check, everything behind them) are blocked by one external configuration item: the reCAPTCHA Enterprise key does not allow the `hosted.app` origin. The GitHub connection is also a pending one-time console step.

## 1. Executive Summary
Created one App Hosting backend `mitra-web` in the existing Firebase project and deployed the Next.js app to it from local source (`firebase deploy --only apphosting`). Generated URL: `https://mitra-web--brainwise-ai-marketing-engine.asia-southeast1.hosted.app`. Routes, headers, bundle safety and Firebase project wiring verified. A real headless-Chromium run reached signup and was rejected by Firebase Auth's App Check enforcement (`auth/firebase-app-check-token-is-invalid`, underlying `appCheck/recaptcha-error`) because the reCAPTCHA key's allowed-domain list does not include the new origin. No security control was weakened.

## 2. Previous Architecture
GitHub → (intended) Vercel → Next.js → Firebase. Vercel work done: project `visheshkakar-8050/ai-marketing-engine`, a preview deployment, `vercel.json`/`.vercelignore` edits (uncommitted). Vercel preview served all routes and headers correctly but was behind Deployment Protection; no Auth/App Check test was possible there.

## 3. New Architecture
GitHub (`Rakesh9k/ai-marketing-engine`, `master`) → Firebase App Hosting (`mitra-web`, asia-southeast1, Cloud Build + Cloud Run + CDN) → Next.js → Firebase Auth / App Check / Firestore / Storage / Cloud Functions (asia-south1) → AI, Razorpay, analytics. `services/reel-renderer` stays an independent Cloud Run service and is excluded from the App Hosting upload.

## 4. Files Changed (this phase)
- `apphosting.yaml` (new): `runConfig` (cpu 1, 512 MiB, min 0, max 10, concurrency 80) + 10 env vars.
- `firebase.json`: added `apphosting` block (`backendId: mitra-web`, `rootDir: /`, ignore list incl. `.env*`, `.next`, `node_modules`, `services/reel-renderer`).
- `.npmrc` (new): `legacy-peer-deps=true` (a devDependency, `@firebase/rules-unit-testing@2.0.7`, peers on `firebase@^9`; a strict install fails with ERESOLVE).
- Not committed by this phase (Vercel leftovers, pending removal decision): `vercel.json` (modified), `.vercelignore`, `.gitignore` (`.vercel` line), `docs/PHASE_19B_*`.
- Temporary test script `_e2e19c.mjs` (untracked, delete before committing).

## 5. Firebase App Hosting Configuration
| Item | Value |
|---|---|
| Backend | `mitra-web` |
| Region | `asia-southeast1` (Singapore). `asia-south1` (Mumbai, where Functions run) is **not** an App Hosting region — API returned 403 "not found or unauthorized" |
| Repository | none yet (local-source deploy); GitHub link pending [ACCESS] |
| Branch | intended `master` |
| Root | `/` (Next.js app is at repo root; `services/reel-renderer` is separate) |
| Runtime | `nodejs22` (Node 20 is deprecated; `package.json` `engines` still says `20.x` — builder used the backend runtime; build succeeded) |
| Web app | attached to existing web app `1:691254604957:web:caf76181c86efb6a7b5074` (no duplicate) |
| Rollout | complete; local-source; commit not applicable |

## 6. Environment Variables
PUBLIC (in `apphosting.yaml`, availability BUILD+RUNTIME): `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID`, `_MEASUREMENT_ID`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` (`rzp_test_`). Set explicitly: `NEXT_PUBLIC_USE_EMULATORS="false"`.
SERVER / SECRET: none required by the Next app; provider/Razorpay/Admin secrets remain in Cloud Functions secrets.
LOCAL ONLY: `.env.local` (`USE_EMULATORS=true`, App Check debug token) — excluded from upload, gitignored; explicit `false` in App Hosting overrides it anyway.
Note: these public web values now live in a **public** repo via `apphosting.yaml`; they are already public in the served JS, but GitHub secret scanning may flag the `AIza…` key (expected for Firebase web keys). Make the repo private if that is undesirable.

## 7. Security
- Emulator safety (deployed bundle, 21 chunks, ~1.0 MB): `localhost:9099/8080/9199/5001` 0, `127.0.0.1` 0, `USE_EMULATORS` 0, debug-token assignment 0, secret patterns 0. Explicit `false` lets the compiler remove the emulator branches entirely. Browser run: 0 requests to localhost/emulator hosts.
- Deployed Firebase config matches `firebase apps:sdkconfig` (projectId, appId, storageBucket, authDomain, senderId, apiKey).
- Negative tests against production Functions (curl, real endpoints): no auth+no App Check → 401 UNAUTHENTICATED; fake bearer token → 401; fake `X-Firebase-AppCheck` → 401. All REJECTED as required. `healthCheck` returns 200 (observation: a callable reachable without App Check; likely intentional health endpoint — not investigated).
- Firestore/Storage rules and `enforceAppCheck: true` untouched. Firebase Auth itself enforces App Check for this project (signUp/signInWithPassword returned 401 without a valid App Check token) — a stronger control than assumed.
- Not run: wrong-business and agency cross-tenant tests (need an authenticated session).

## 8. Browser Tests (real headless Chromium 153, against the App Hosting URL — PRODUCTION Firebase project)
| Gate | Result | Evidence |
|---|---|---|
| A. App loads | PASS | title "Mitra…", renders, no blank screen |
| B. Signup | **BLOCKED** | `accounts:signUp` → 401, UI shows `auth/firebase-app-check-token-is-invalid`; console `appCheck/recaptcha-error`. Config issue, not code |
| C. Login/persistence | BLOCKED | `signInWithPassword` → 401 for same reason |
| D–F. Business/Storage/Campaign | NOT VERIFIED | need authenticated session |
| G. AI, H. Truth Check | NOT VERIFIED | |
| I. Billing | NOT VERIFIED authenticated (route serves 200; protected page redirects when unauthenticated) | |
| Protected route when logged out | PASS | `/dashboard` → `/login` |
| Mobile 390px | PASS (login/landing; no horizontal overflow) | authenticated pages not testable |
Other findings: `/terms` and `/privacy` links 404 (P2, app bug); recaptcha `clr` request aborted (consequence of the same failure). Test account not created (signup rejected), so no production test data exists from this run.

## 9. Automated Tests
Local, last run this session on the same source: `npm run lint` exit 0; `npm run typecheck` exit 0; `npm test` 31 suites / 298 passed / 7 skipped / 0 failed; `npm run build` PASS; `npm run functions:build` exit 0. (`apphosting.yaml`/`firebase.json`/`.npmrc` changes do not touch app code; not re-run after them beyond the successful Cloud Build.)

## 10. Custom Domain
`brain-wise.com`: UNTOUCHED (still Firebase Hosting default 404). `www`: UNTOUCHED. DNS: UNTOUCHED. Not migrated, per the required order.

## 11. Vercel
NOT USED in the target architecture. Leftovers still present (not removed yet, by instruction: only after App Hosting is verified): Vercel project `ai-marketing-engine` (account `visheshkakar-8050`) with preview deployments; uncommitted `vercel.json`, `.vercelignore`, `.gitignore` `.vercel`; docs `VERCEL_*`, `PHASE_19B_*`. Committed `vercel.json` (from `d882dbb`) also still on `master`. Recommendation: REMOVE all after Phase 19C passes; deleting the Vercel project is an action for the account owner.

## 12. GitHub Deployment
Local-source rollout only. GitHub → App Hosting continuous deployment: **NOT VERIFIED / BLOCKED** — needs the Firebase GitHub App authorization in the console (interactive). No harmless-commit rollout test possible yet.

## 13. Cost
Project already on Blaze (Cloud Functions v2 deployed). App Hosting adds Cloud Build, Cloud Run (min instances 0, max 10), Artifact Registry, Cloud Storage (`firebaseapphosting-sources-691254604957-asia-southeast1` created), logging. Conservative settings applied. **Budget alerts NOT verified/configured** — set in Google Cloud Billing (manual). No cost figures are claimed.

## 14. Remaining Blockers
1. **reCAPTCHA Enterprise key allowed domains** must include `mitra-web--brainwise-ai-marketing-engine.asia-southeast1.hosted.app` (later `brain-wise.com`, `www.brain-wise.com`) [ACCESS — could not be changed programmatically: the CLI's internal auth helper was not usable from a script, and no credential was extracted by hand].
2. Connect GitHub repo to the backend (console) and set live branch `master`.
3. Re-run the browser E2E (script ready) after #1; then Business/Storage/`next/image`/campaign/AI/credits/Razorpay/analytics/negative-tenant tests.
4. Budget alerts.
5. Vercel cleanup decision; `engines` (`20.x`) vs runtime `nodejs22` consistency.
6. `/terms`, `/privacy` 404 (P2).

## 15. Final Verdict
**PHASE 19C BLOCKED**

## Appendix — Manual steps
**reCAPTCHA key:** Google Cloud Console → project `brainwise-ai-marketing-engine` → Security → reCAPTCHA Enterprise → key ending `…lGOE3` (site key in `apphosting.yaml`) → Edit → Domains → add `mitra-web--brainwise-ai-marketing-engine.asia-southeast1.hosted.app` → Save. (Also confirm Firebase Console → App Check → web app is registered with reCAPTCHA Enterprise and Auth/Functions enforcement is intended.)
**GitHub link:** Firebase Console → App Hosting → `mitra-web` → Settings/Deployment → connect GitHub repo `Rakesh9k/ai-marketing-engine`, live branch `master`, root `/`, automatic rollouts on.
**Rollback:** Console → App Hosting → `mitra-web` → rollout history → "Roll back to this build" (instant); or create a rollout for an earlier commit (`firebase apphosting:rollouts:create mitra-web`). Rollback controls not exercised.
**Debugging path:** deploy failed → rollout page/Cloud Build log; runtime crash → Cloud Run logs for `mitra-web`; Auth/App Check → browser console (`appCheck/recaptcha-error` = key domains); Function errors → Functions logs; Storage → rules + network tab.

---

# Continuation — 2026-09-21 (re-run after user reported adding reCAPTCHA domains)

Earlier sections are preserved unchanged. Real headless Chromium against `https://mitra-web--brainwise-ai-marketing-engine.asia-southeast1.hosted.app` (PRODUCTION Firebase project).

## Result: still BLOCKED at signup — same external blocker
Re-ran the E2E (two runs, ~14:52 and ~14:54 UTC): signup still fails with `auth/firebase-app-check-token-is-invalid`; `accounts:signUp` and `signInWithPassword` → 401; console `appCheck/recaptcha-error`. No test account created; no production data written.

## Root cause, now proven (not inferred)
Loaded the reCAPTCHA Enterprise anchor frame for the site key in `apphosting.yaml` (`6Lfrer4t…lGOE3`) and read its own page text: **"ERROR for site owner: Invalid domain for site key."** The anchor was requested with `co=` decoding to exactly `https://mitra-web--brainwise-ai-marketing-engine.asia-southeast1.hosted.app:443`, i.e. the origin the browser presents. The frame then posts an error report (`enterprise/clr`) and never requests a token, which is what App Check surfaces as `recaptcha-error`. Conclusion: for **this key ID, in this project**, the allowed-domain list does not currently contain that hostname. This is CONFIGURATION, not code, and not propagation-only (still failing minutes after the reported change).

Likely causes (console-side, cannot be inspected from here): (a) the domain was added to a *different* reCAPTCHA key than `6Lfrer4t…lGOE3`; (b) the edit was not saved; (c) the entry is malformed — must be a bare hostname, no `https://`, no port, no trailing slash; (d) the key was edited in another Google Cloud project. Note also: the Firebase Console App Check screen does not hold the domain list — it lives on the key under Google Cloud → Security → reCAPTCHA Enterprise.

## Phase status this run
| Phase | Result |
|---|---|
| A App Check/Auth | BLOCKED (external: key domain) |
| B–H Business, Storage, Product, Campaign, Truth Check, Credits, Razorpay, Analytics | NOT VERIFIED (need an authenticated session) |
| I Security negative tests | PASS for unauthenticated / invalid-auth / invalid-App-Check (401 each, previous section); wrong-business & cross-tenant NOT VERIFIED |
| J App Hosting / Next.js | PASS for routes, 404, headers, mobile layout (previous section); authenticated routes NOT VERIFIED |
| K Production environment | PASS (bundle scan; 0 emulator/localhost requests in browser) |
| L GitHub integration | NOT VERIFIED (console link pending) |
| M Custom domain | NOT STARTED (DNS untouched — gating tests have not passed) |
| N Vercel cleanup | NOT STARTED (by instruction, only after production verification) |

## Final Verdict (this run)
**PHASE 19C BLOCKED** — external blocker: reCAPTCHA Enterprise key `6Lfrer4t…lGOE3` reports "Invalid domain for site key" for the App Hosting origin.
