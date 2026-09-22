# Phase 19C — reCAPTCHA Enterprise / App Check Verification

Date: 2026-09-21. Status words: PASS / PARTIAL / BLOCKED / FAIL; evidence words: VERIFIED / NOT VERIFIED / BLOCKED / FAILED.

**Verdict: BLOCKED.** The frontend implementation is correct. The reCAPTCHA Enterprise key `6Lfrer4t…lGOE3` does not allow the App Hosting hostname, proven by probing the key directly. Fixing it needs a Google Cloud console edit that this session cannot perform. No code or config change was needed or made.

## 1. Environment
Project `brainwise-ai-marketing-engine` (691254604957) · App Hosting backend `mitra-web` (asia-southeast1) · hostname `mitra-web--brainwise-ai-marketing-engine.asia-southeast1.hosted.app` · branch `master` · deployed commit: local-source rollout of the tree at `f5fbada`.

## 2. reCAPTCHA Configuration
- Key verified as the one the app uses: **YES** — the deployed JS embeds exactly `6Lfrer4tAAAAAOhwU88DuXobbIT1sDKJkFtlGOE3` (1 occurrence), matching `apphosting.yaml`; no other reCAPTCHA key in the repo or bundle (other `6L…` strings in a repo-wide grep are random base64 inside image/asset files, not keys).
- Console access: NOT available (the Firebase CLI's internal auth helper could not be used from a script; no credential was extracted by hand). The domain list was therefore **probed empirically** using reCAPTCHA's public anchor endpoint (`/recaptcha/enterprise/anchor?k=<key>&co=<origin>`), which returns "Invalid domain for site key" for disallowed origins and issues a token page for allowed ones. Read-only; changes nothing.

| Origin probed | Result |
|---|---|
| `mitra-web--brainwise-ai-marketing-engine.asia-southeast1.hosted.app` | **INVALID DOMAIN** |
| `brain-wise.com` | ALLOWED |
| `www.brain-wise.com` | ALLOWED |
| `brainwise-ai-marketing-engine.web.app` | ALLOWED |
| `brainwise-ai-marketing-engine.firebaseapp.com` | ALLOWED |
| random third-party domain (control) | INVALID DOMAIN |
| variants: `hosted.app`, `asia-southeast1.hosted.app`, `brainwise-ai-marketing-engine.asia-southeast1.hosted.app`, `…hosted.app` without region, `asia-south1`/`us-central1` regions, a different backend id | all INVALID |

- Allowed hostname verified: **NO** (App Hosting host is not on the key). Custom domains configured: **YES for the key** (both `brain-wise.com` and `www` accepted; note this is the key list only — DNS is unchanged). Stale keys found: NO.
- Interpretation: the custom-domain and default Firebase domains are already on the key, but **no `hosted.app` entry of any kind exists**. So the requested addition either was not saved, went onto a different key/project, or was entered in a format the console did not accept. (It is not a typo of the hostname: every plausible variant was also rejected.) A control run against a random domain confirms the probe discriminates correctly.
- **USER ACTION REQUIRED:** Google Cloud Console → project `brainwise-ai-marketing-engine` → Security → reCAPTCHA Enterprise → Keys → key `6Lfrer4tAAAAAOhwU88DuXobbIT1sDKJkFtlGOE3` → Edit → Domains → add the bare hostname `mitra-web--brainwise-ai-marketing-engine.asia-southeast1.hosted.app` (no `https://`, no port, no path) → Save. If the console rejects it (some hosts on the public-suffix list are refused), send me the exact error message; the fallback is testing on `brain-wise.com` once DNS is moved (already allowed on the key).

## 3. Frontend App Check — IMPLEMENTATION VERIFIED
- Provider: `ReCaptchaEnterpriseProvider` (not V3 — correct for an Enterprise key) in `src/lib/firebase/client.ts`.
- Site key source: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, supplied to the production build via `apphosting.yaml` (BUILD+RUNTIME); present in the deployed bundle.
- Initialization: once, in the module-init path, `initializeAppCheck()` at line 127, **before** `getAuth()` (line 129) and before Firestore/Storage/Functions — correct order.
- Debug token: only set when `NEXT_PUBLIC_USE_EMULATORS === 'true'`; `apphosting.yaml` sets it `"false"`; 0 occurrences of debug-token assignment or emulator hosts in the deployed bundle (previous section, re-confirmed by browser run: 0 localhost requests).
- Firebase app: same web app `1:691254604957:web:caf76181…` as the deployed config.
- Runtime behavior: App Check initializes and requests a token; reCAPTCHA refuses on the origin (Section 2); Auth then reports `auth/firebase-app-check-token-is-invalid`. Firebase Auth itself enforces App Check in this project.
- Result: code correct; failure is configuration. No rewrite performed.

## 4. Firebase Auth
Signup: **BLOCKED** (re-run 2026-09-21, still `auth/firebase-app-check-token-is-invalid`; anchor frame text "Invalid domain for site key"). Login/logout/persistence/protected-route-when-authenticated: **NOT VERIFIED** (need a session). Unauthenticated `/dashboard` → `/login`: VERIFIED PASS. No test account exists.

## 5. Firestore — NOT VERIFIED (no authenticated session). Rules untouched.
## 6. Storage — NOT VERIFIED (same). Rules untouched.

## 7. Security
- `enforceAppCheck: true` unchanged everywhere.
- VERIFIED (production Functions, curl): no auth + no App Check → 401; fake bearer token → 401; fake App Check token → 401.
- NOT VERIFIED: valid-auth-without-App-Check via a browser, wrong-business access, cross-tenant access (need authenticated sessions).
- Nothing was weakened; no bypass or debug token added.

## 8. Browser E2E (real headless Chromium against the App Hosting URL, production Firebase project)
| Test | Result | Evidence |
|---|---|---|
| Landing page | PASS | 200, title "Mitra…", renders |
| reCAPTCHA | **BLOCKED** | anchor frame: "ERROR for site owner: Invalid domain for site key" (origin `…hosted.app:443`) |
| App Check | **BLOCKED** | `appCheck/recaptcha-error`; no token issued |
| Signup | **BLOCKED** | `accounts:signUp` 401 → `auth/firebase-app-check-token-is-invalid` |
| Login | NOT VERIFIED | needs account |
| Business creation | NOT VERIFIED | chain stops at signup |
| Storage upload | NOT VERIFIED | |
| Product creation | NOT VERIFIED | |
| Campaign creation | NOT VERIFIED | |
Per instructions the chain stops at the first real blocker; later stages are not claimed.

## 9. Remaining Blockers
1. reCAPTCHA key `…lGOE3` lacks the App Hosting hostname [EXTERNAL — console edit].
2. After #1: Firebase Console → App Check should show the web app registered with reCAPTCHA Enterprise for this key (cannot be inspected from here) [NOT VERIFIED].
No other blockers were identified; `/terms` and `/privacy` 404 were not touched (separate P2 item), GitHub CD, custom domain, and Vercel cleanup were deliberately not started.

## 10. Final Verdict
**BLOCKED** — a specific external configuration blocker prevents completing the required verification. The implementation is not broken (not FAIL).

## Files changed / tests run
Files changed: this report only. Tests run: production bundle key/provider inspection; source scan for provider, init order, stale keys; real-browser signup re-run and reCAPTCHA-frame diagnosis (twice); direct anchor-endpoint domain probe (15 origins). No repo tests re-run (no code changed).

---

# Continuation 2 — 2026-09-21, after the user confirmed the Domain list in the console

User-reported (console, not independently visible to this session): Domain list contains `brain-wise.com`, `brainwise-ai-marketing-engine.firebaseapp.com`, `brainwise-ai-marketing-engine.web.app`, and `mitra-web--brainwise-ai-marketing-engine.asia-southeast1.hosted.app`; the project has exactly one key, "Mitra", ID `6Lfrer4t…lGOE3` (matches the ID the app embeds).

## Fresh verification results (all real evidence from this run)
| Check | Result | Evidence |
|---|---|---|
| Key ID the app uses | VERIFIED | bundle embeds `6Lfrer4t…lGOE3`, same as console key list |
| Domain probe, hosted.app host | **REJECTED** | anchor endpoint → "Invalid domain for site key"; polled ~9 more minutes (21 attempts, 25 s apart) with no change — not propagation |
| Domain probe, `brain-wise.com` / `www.brain-wise.com` | ALLOWED | token page issued |
| Real browser signup (headless Chromium, App Hosting URL) | **BLOCKED** | reCAPTCHA iframe text: "ERROR for site owner: Invalid domain for site key"; UI: `auth/firebase-app-check-token-is-invalid`; `accounts:signUp` 401 |
| Firebase App Check web-app registration / provider / key reference | NOT VERIFIED | console-only; also **not the cause** of this failure — the reCAPTCHA frame rejects the origin *before* any token reaches Firebase |
| Key type / SCORE / domain verification / checkbox off | NOT VERIFIED | console-only (no API access from this session) |
| Everything after signup | NOT VERIFIED | chain stops at first blocker |

## Analysis
The failing layer is the reCAPTCHA Enterprise site-key origin check, upstream of App Check. Google's edge accepts origins `brain-wise.com`, `www.brain-wise.com`, `*.web.app` (project host) and `*.firebaseapp.com` (project host) — the same private-suffix class as `hosted.app` — but rejects the App Hosting host, and every other `hosted.app` variant. Since the console reportedly lists the exact host, the discrepancy is between what the console shows and what the serving key config contains (unsaved/pending change, an entry that differs subtly from the hostname, or a validation quirk for this suffix). This cannot be resolved from the repo or from outside the project.

## Diagnostic to run (USER ACTION — read-only, no secrets in the output)
In Google Cloud Shell (or any machine with gcloud) for project `brainwise-ai-marketing-engine`:
```
gcloud recaptcha keys describe 6Lfrer4tAAAAAOhwU88DuXobbIT1sDKJkFtlGOE3 --project=brainwise-ai-marketing-engine
```
Paste the output. It shows the key's real `webSettings` (`allowedDomains`, `allowAllDomains`, `integrationType`, `challengeSecurityPreference`) and reveals any entry that differs from the hostname.
To attempt the fix directly if `allowedDomains` lacks the host:
```
gcloud recaptcha keys update 6Lfrer4tAAAAAOhwU88DuXobbIT1sDKJkFtlGOE3 --project=brainwise-ai-marketing-engine --domains=brain-wise.com,www.brain-wise.com,brainwise-ai-marketing-engine.firebaseapp.com,brainwise-ai-marketing-engine.web.app,mitra-web--brainwise-ai-marketing-engine.asia-southeast1.hosted.app
```
(`--domains` replaces the list, so include every domain to keep. Do not use `--allow-all-domains`.)

## Fallback that avoids the hosted.app entry
`brain-wise.com` is already accepted by the key. Pointing brain-wise.com at App Hosting (custom-domain setup) would let the full browser flow run on a domain the key already allows. Not started: it changes DNS, which requires explicit approval.

## Verdict (Continuation 2)
**BLOCKED** — unchanged. Code and App Check implementation remain VERIFIED correct; no code or config was changed.

---

# Continuation 3 — 2026-09-22 (after the reCAPTCHA domain was fixed via `gcloud recaptcha keys update --web --domains=…`)

Key now allows the App Hosting host (probe: ALLOWED). All results below are real-browser (headed Chromium, human-like input) or direct live-API evidence against PRODUCTION Firebase.

## Auth / App Check — PASS
- reCAPTCHA frame issues tokens; `exchangeRecaptchaEnterpriseToken` → **200**; `accounts:signUp` → 200; `signInWithPassword` → 200; `accounts:lookup` → 200.
- Server-side proof (Cloud Function logs): `"Callable request verification passed","verifications":{"app":"VALID","auth":"VALID"}` for `getUploadUrl`; `createBusiness` callable → 200.
- Signup, login, logout→protected-route redirect, login again, session persistence across page refresh and across a full browser restart (persistent profile): PASS.
- Note: headless Chromium / instant `fill()` input is scored as a bot by the SCORE key and gets `403 App attestation failed` — expected behaviour of the control, not a defect.

## Real defects found by this verification and FIXED (each with direct evidence)
1. **Dashboard/all data pages failed for every IST user** — usage document ID built from local time (`uid_2026-08-31`) while the backend creates it from UTC (`uid_2026-09-01`); the usage read rule denies missing docs → "Missing or insufficient permissions". Proven live: GET UTC id → 200, GET local id → 403. Fix: `usageService.getCurrentPeriod` now derives the UTC month start. Regression test `src/services/database.test.ts` (4 cases + timezone precondition) — fails 4/5 against the old code; `tests/globalSetup.js` pins Jest to IST so a UTC CI machine cannot hide the bug.
2. **Three missing Firestore composite indexes** (the emulator does not enforce indexes, so no local test could catch them): `businesses (userId, createdAt DESC, status DESC)`, `campaigns (businessId, createdAt DESC)`, `products (businessId, sortOrder, createdAt DESC, status DESC)`. Exact shapes decoded from the server's own error links; added to `firestore.indexes.json` and deployed. A live sweep of 12 client query shapes now passes for all queries the UI uses.
3. **Direct load / refresh of any protected URL lost the page** — `useAuth`/`useAuthStatus` declared "unauthenticated" as soon as `auth.currentUser` was null, which on a fresh load only means "session not restored yet"; `ProtectedRoute` then redirected to `/login` and on to `/dashboard`. Fix: stay `loading` until the first `onAuthStateChanged`. Verified live: `/products/new`, `/campaigns/abc123`, `/billing` now load directly. Three tests that encoded the old behaviour were corrected and regression tests added (fail 3/9 against the old hook).
Validation after fixes: lint 0, typecheck 0, `npm test` 32 suites / 305 passed / 7 skipped / 0 failed, `functions:build` 0. App Hosting redeployed twice (local-source rollouts).

## Storage — BLOCKED (IAM, external)
`getUploadUrl` returns 500. Function log: `Permission 'iam.serviceAccounts.signBlob' denied on resource`. The function's runtime service account cannot sign URLs. This is a project IAM setting (not code, not App Check, not rules). **USER ACTION** — in Cloud Shell:
```
gcloud functions describe getUploadUrl --region=asia-south1 --gen2 --project=brainwise-ai-marketing-engine --format="value(serviceConfig.serviceAccountEmail)"
```
then grant that service account the Token Creator role on itself (replace SA with the email printed above):
```
gcloud iam service-accounts add-iam-policy-binding SA --project=brainwise-ai-marketing-engine --member="serviceAccount:SA" --role="roles/iam.serviceAccountTokenCreator"
```
Also affects other signed-URL paths (reel clip upload, AI image re-hosting). Product creation requires a photo, so product and campaign creation are blocked behind this.

## Security negative tests (live production, second user as attacker) — PASS, all REJECTED
No auth → 401 · fake Auth + valid App Check → 401 · valid Auth, no App Check → 401 · valid Auth, invalid App Check → 401 · valid App Check, no Auth → 401 · getBusiness / createProduct / getUploadUrl on ANOTHER user's business → rejected · Firestore direct read of another user's business → 403 · Firestore query of another user's products → PERMISSION_DENIED · Firestore write to another user's business → 403 · privilege escalation (`users/{uid}.role='admin'`) → 403 · Storage list of another user's folder → 403. Sanity: the attacker's own valid Auth+App Check call succeeds (200), so the rejections are real.
Finding (P2): cross-user callable rejections return HTTP **500 / INTERNAL** ("Access denied to business") instead of 403 / PERMISSION_DENIED — access IS denied, but errors are mis-typed, which pollutes alerting and error monitoring.

## Status table
| Area | Result |
|---|---|
| reCAPTCHA / App Check / Auth | PASS |
| Firestore (business, dashboard, usage, indexes) | PASS |
| Deep links / refresh / persistence | PASS (after fix 3) |
| Security negative tests | PASS |
| Storage upload | BLOCKED — IAM `signBlob` |
| Product / campaign / Truth Check / credits / AI / Razorpay / analytics | NOT VERIFIED (behind upload) |
| next/image with Storage images | NOT VERIFIED (behind upload) |

## Other open items
- Stray live index `businesses (userId, createdAt DESC, status ASC)` from a wrong first attempt; harmless, delete in console when convenient.
- `/terms` and `/privacy` 404 (P2). `campaign_assets` query by `campaignId` alone (campaign detail page) may be denied by the read rule (query does not pin userId/businessId) — NOT VERIFIED, needs a real campaign; check once uploads work.
- Test data in production: 3 throw-away accounts (`mitra-e2e-19c-*@example.test`, one `diag-*`) and one business `[E2E-19C TEST]…`; delete after verification.

## Verdict (Continuation 3)
**PARTIAL** — reCAPTCHA, App Check, Auth, Firestore and authorization are verified working in production, and three real defects were found and fixed; Storage and everything behind it is blocked by one IAM permission that requires the project owner.
