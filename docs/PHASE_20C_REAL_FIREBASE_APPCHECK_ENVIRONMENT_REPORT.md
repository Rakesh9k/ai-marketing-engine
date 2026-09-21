# PHASE 20C RESULT

## Objective

Establish and verify a real Firebase + App Check development environment so a
real browser can sign up, log in, maintain a session, obtain a real App Check
token, and call the local `createBusiness` callable Function with both Auth
and App Check enforced — while Auth/Firestore/Storage/Functions stay on local
emulators and no production security setting is weakened.

## Environment

### Firebase Project
- real project: **PASS**
- project ID: `brainwise-ai-marketing-engine` (already configured in
  `.firebaserc` before this phase started; not `demo-project`)

### Firebase Web App
- configured: **PASS** — `.env.local` carries a real `apiKey`, `authDomain`,
  `projectId`, `storageBucket`, `messagingSenderId`, `appId` for a Web App
  registered on that project.

### App Check
- Web App registered: **PARTIAL** — a `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
  (reCAPTCHA Enterprise) and a debug token were already present in
  `.env.local` at the start of this session. This session did not itself
  perform the Firebase Console registration step, so registration is
  inferred from functional evidence (below), not independently witnessed.
- provider configured: **PASS** — `src/lib/firebase/client.ts` initializes
  `ReCaptchaEnterpriseProvider` with the site key, and sets
  `self.FIREBASE_APPCHECK_DEBUG_TOKEN` before `initializeAppCheck()` when
  `NEXT_PUBLIC_USE_EMULATORS=true`.
- debug token generated: **PASS** — real browser console showed: `App Check
  debug token: <token>. You will need to add it to your app's App Check
  settings...`, and the client attached a JWT-shaped `X-Firebase-AppCheck`
  header to every callable request (confirmed from network capture).
- debug token registered: **BLOCKED** — no way to inspect Firebase Console
  state from this session; see "Human Actions Required".
- runtime token accepted: **PARTIAL** — the real browser's `createBusiness`
  call succeeded end-to-end (see below), and the Functions emulator logged
  `verifications: {app: "VALID", auth: "VALID"}` for it. However, this
  session discovered that the local Functions emulator does **not**
  cryptographically verify the App Check token at all (see "Emulator
  App Check Limitation" below) — so "runtime token accepted" is proven for
  the emulator, but is not independent proof that the *real* Firebase App
  Check backend validated this specific debug token as registered.

### Local Emulators
- Auth: **PASS** — `127.0.0.1:9099`, confirmed via signup/login and direct
  Identity Toolkit REST calls.
- Firestore: **PASS** — `127.0.0.1:8080`, confirmed via document read after
  `createBusiness`.
- Storage: **PASS** — `127.0.0.1:9199`, emulator started and reachable
  (not exercised by this phase's flow, which doesn't upload files).
- Functions: **PASS** — `127.0.0.1:5001`, all 34 callables plus
  `healthCheck` and the two Auth triggers loaded and served requests.

(Ports read from `firebase.json`, not assumed.)

## Real Browser Tests

All browser tests were executed with a headless Chromium driven by
Playwright (`playwright@1.63.0`, already a project dependency) against a
real `next dev` server and the real emulator suite above — not Jest, not
curl, not `.run()`.

### Signup
**PASS**

Evidence: submitted the signup form with a fresh email/password. The Auth
emulator returned `200` for `accounts:signUp`, `accounts:sendOobCode`.
`PublicOnlyRoute` immediately treated the session as authenticated and
redirected to `/dashboard`, which rendered "Welcome back,
phase20c.<ts>@example.com!". No App Check or CORS errors were logged to the
browser console during this step.

Note: the signup form's own "verification email sent" notice never became
visible because the dashboard redirect (driven by `onAuthStateChanged`)
wins that race — this is a pre-existing UI race, not an App Check/Auth
failure, and is outside Phase 20C's scope to fix.

### Login
**PASS**

Evidence: after using the in-app "Log out" menu action (confirmed redirect
to `/login`), the same credentials were submitted on `/login`. The Auth
emulator returned `200` for `accounts:signInWithPassword`, and the app
redirected to `/dashboard` within 15s.

### App Check
**PARTIAL**

Evidence for what could be verified:
- `initializeAppCheck()` ran before any callable was invoked (confirmed by
  reading `src/lib/firebase/client.ts` initialization order).
- The debug token was generated and logged by the SDK.
- Every callable request from the browser carried a JWT-shaped
  `X-Firebase-AppCheck` header.
- The Functions emulator logged `app: "VALID"` for these requests, and the
  requests succeeded.

What could not be verified from this session, and why this is graded
PARTIAL and not PASS: see "Emulator App Check Limitation" below. In short,
the local Functions emulator accepts *any* syntactically JWT-shaped
`X-Firebase-AppCheck` value as `VALID` — it never calls a signature
verifier for it locally. That means a genuinely-registered real App Check
token and a fabricated one are indistinguishable to the local backend. The
positive path (App Check present + real token from real infrastructure)
is proven by the client-side evidence above; the backend's *cryptographic*
acceptance of that specific token could not be proven in this environment.

### createBusiness
**PASS**

Evidence: from the real browser, completed the onboarding wizard (Business
Basics → Location → Contact & Operations → Marketing Preferences → Review)
for a restaurant-category business and clicked "Complete Setup". The
Functions emulator log shows:
```
Beginning execution of "asia-south1-createBusiness"
{"verifications":{"app":"VALID","auth":"VALID"}, ... "message":"Callable request verification passed"}
{"userId":"ilirFUjLVTd5h150wBOvisu3xJ01","function":"createBusiness", ..., "message":"createBusiness.start"}
{"userId":"ilirFUjLVTd5h150wBOvisu3xJ01","function":"createBusiness", "latencyMs":18, "success":true, ..., "message":"function.complete"}
Finished "asia-south1-createBusiness" in 21.0786ms
```
The UI reached the "Your business is set up." confirmation screen.

### Firestore Persistence
**PASS**

Evidence: read the resulting `businesses/{businessId}` document from the
Firestore emulator (via the emulator's Firestore REST endpoint with the
documented `Authorization: Bearer owner` test-admin bypass, since
unauthenticated direct reads are correctly rejected by `firestore.rules`
with `PERMISSION_DENIED` — confirming rules were not loosened for this
test). Fields matched what the browser submitted: `userId` equal to the
signed-up user's UID, `category: "restaurant"`, `status: "active"`, correct
`name`. Reloading `/onboarding` in the same session (Step 14/15) reflects
the existing business rather than re-showing the wizard.

### Authorization
**PASS**

Evidence (direct callable requests, real ID tokens from the Auth emulator,
same App Check header used throughout):
- User A (`ilirFUjLVTd5h150wBOvisu3xJ01`) calling `getBusiness` for their
  own business: `200`, business returned.
- User B (a second, freshly signed-up user) calling `getBusiness` for User
  A's `businessId`: rejected — `"Access denied to business"`
  (`verifyBusinessAccess` in `functions/src/middleware/auth.ts` correctly
  fired). Note: this rejection currently surfaces as HTTP `500`/`INTERNAL`
  rather than `403`/`permission-denied` — the underlying `HttpsError`
  appears to be getting remapped by `mapErrorToHttpsError`/the caller's
  error handling. The access is still correctly *denied*; only the status
  code is misleading. This is a pre-existing, narrow bug unrelated to App
  Check/Auth wiring — flagged here rather than fixed, per this phase's
  "do not expand scope" instruction.

## Negative Security Tests

All performed via direct HTTP calls to the local Functions emulator
(`http://127.0.0.1:5001/brainwise-ai-marketing-engine/asia-south1/createBusiness`),
which is the correct way to isolate each layer rather than relying only on
the real-browser positive path.

### Missing Auth
Result: **REJECTED** — no `Authorization` header, no `X-Firebase-AppCheck`
header → `HTTP 401 {"error":{"message":"Unauthenticated","status":"UNAUTHENTICATED"}}`.

### Invalid Auth
Result: **REJECTED** — malformed bearer value → `HTTP 401 UNAUTHENTICATED`.

### Missing App Check
Result: **REJECTED** — valid Auth ID token (obtained via a real
`accounts:signInWithPassword` call to the Auth emulator), no
`X-Firebase-AppCheck` header → `HTTP 401 UNAUTHENTICATED`. This is the
exact "auth: VALID, app: MISSING" failure mode Phase 20B diagnosed
originally, and it still correctly rejects, confirming App Check
enforcement did not regress.

### Invalid App Check
Result: **BLOCKED, not verifiable locally** — a valid Auth token plus a
garbage `X-Firebase-AppCheck` value (both a plain string and a
syntactically JWT-shaped-but-unsigned token) was **accepted** (`HTTP 200`,
`createBusiness` executed) by the local Functions emulator. Root-caused by
reading `functions/node_modules/firebase-functions/lib/common/providers/https.js`:
when the Functions emulator runs, `firebase-functions` sets
`FIREBASE_DEBUG_MODE=true` for the callable-handling code path, which
makes `checkAppCheckToken()` call `unsafeDecodeAppCheckToken()` — an
explicitly-named, explicitly-documented ("Do not use in production")
unverified JWT decode — instead of `admin.appCheck().verifyToken()`. Any
3-dot-segment, base64-decodable string is accepted as `app: "VALID"`
without any signature or registration check. The same debug shortcut
applies to Auth ID tokens (`checkAuthToken`), which is *why* Auth-emulator
tokens (not signed by real Google infrastructure) verify successfully at
all locally.

This is firebase-tools/firebase-functions SDK behavior, not something this
codebase configured (`FIREBASE_DEBUG_MODE`/`FIREBASE_DEBUG_FEATURES` do not
appear anywhere in this repo's source). It does not exist in production:
deployed Cloud Functions never run with `FIREBASE_DEBUG_MODE=true`, so
`admin.appCheck().verifyToken()` — real JWKS-backed cryptographic
verification — is what actually gates production traffic. Locally, the
one thing that *is* provably enforced is **presence** of the header
(missing App Check is rejected, confirmed above); *validity* of a present
token cannot be exercised end-to-end without either a real deployed
Cloud Function or an official App Check emulator (which does not exist in
the current Firebase Emulator Suite).

### Cross-user access
Result: **REJECTED** — see "Authorization" above (User B denied access to
User A's business; status code is `500` instead of the more correct `403`,
tracked as a separate minor finding, not a security bypass).

## Production Safety

- enforceAppCheck preserved: confirmed by grep — **34 of 34** client-invoked
  callable Functions carry `enforceAppCheck: true` (unchanged; this session
  made zero edits to any file under `functions/src/functions`). `healthCheck`
  is the one `onCall` without it, by design (liveness probe, no user data,
  no business logic). `razorpayWebhook` is an `onRequest` webhook verified
  by Razorpay's own HMAC signature, not App Check. `onUserCreatedHandler`/
  `onUserDeletedHandler` are Auth triggers, not client-invoked callables —
  App Check does not apply to them.
- no debug bypass introduced: the `skipTokenVerification` behavior
  documented above is inherent to `firebase-tools`/`firebase-functions`
  itself, not a flag this codebase sets.
- no secrets exposed: `.env.local` (gitignored, untracked — confirmed via
  `git ls-files`) holds only `NEXT_PUBLIC_*` values plus the local debug
  token; no Admin SDK, Razorpay, or AI provider secret was read, printed,
  or committed by this session.
- no production emulator bypass: `NEXT_PUBLIC_USE_EMULATORS=true` only in
  `.env.local`; the client only ever connects to `localhost` emulator ports
  when that flag is set, and only App Check's token-exchange call reaches
  real Firebase infrastructure, exactly as designed.
- no weakened rules: confirmed by testing — an unauthenticated direct
  Firestore REST read of the created business document was rejected with
  `PERMISSION_DENIED`.
- no security regression: this session made **no source code changes**.

## Automated Validation

- Lint (frontend): **PASS** (`npm run lint`, exit 0)
- Typecheck (frontend): **PASS** (`npm run typecheck`, exit 0)
- Build (frontend): **PASS** (`npm run build`, exit 0)
- Functions build: **PASS** (`npm run functions:build`, exit 0)
- Functions typecheck: **PASS** (`npm run functions:typecheck`, exit 0)
- Functions lint: **FAIL (pre-existing, unrelated to this phase)** — 69
  errors / 3 warnings, entirely in files this session did not touch
  (`middleware/rateLimit.ts` unused imports, and three `*.test.ts`/
  `testSetup.ts` files hitting a `parserOptions.project` ESLint config gap).
  Not introduced or modified by Phase 20C work.
- Functions tests: **PASS** — 199 passed, 80 skipped (emulator-gated), 0
  failed, 19 of 35 suites run without live emulators.
- Frontend tests: **PASS** — 298 passed, 7 skipped, 0 failed, 31/31 suites.

## Files Changed

None. This phase was verification-only: no file under version control was
created or modified except this report. `.env.local` already contained the
project/App Check configuration this phase needed at session start, and was
not edited.

## Human Actions Required

1. **Confirm the debug token registered in `.env.local` is actually
   registered** in Firebase Console → App Check → Web App → Manage debug
   tokens, for project `brainwise-ai-marketing-engine`. This session found
   the value already present but could not independently confirm Console
   state (no Console access). If it turns out not to be registered, the
   client-side evidence in this report (token generated, JWT-shaped header
   attached, no client-side App Check errors) would need re-examination —
   though note the local emulator would behave identically either way, per
   the "Invalid App Check" finding above.
2. **Optional but recommended for Phase 20D**: since local emulator App
   Check enforcement cannot distinguish a valid from a garbage token, a true
   "invalid App Check token is rejected" proof requires either (a) a
   deployed Cloud Functions environment, or (b) waiting for Firebase to ship
   an official App Check emulator. Neither is a Phase 20C blocker — missing
   App Check is provably rejected locally, which was the original bug this
   track exists to fix — but it should be captured before anyone assumes
   local emulator testing alone proves App Check token validity end-to-end
   in production.

## Remaining Blockers

- Firebase Console App Check debug-token registration status is unverified
  from this session (see Human Actions Required #1).
- Local cryptographic App Check token validation cannot be exercised
  end-to-end due to the Functions emulator's `skipTokenVerification` debug
  behavior (an upstream `firebase-tools`/`firebase-functions` limitation,
  not fixable from this repo).

## Phase 20C Final Verdict

**PHASE 20C PARTIALLY VERIFIED**

Everything that can be proven in this environment was proven: real project,
real Web App, real browser signup, real browser login, session persistence,
App Check client initialization and token attachment, `createBusiness`
succeeding end-to-end with Auth+App Check both reported `VALID`, correct
Firestore persistence and reload behavior, correct rejection of missing
Auth/missing App Check/cross-user access, zero regressions in the automated
suites, and zero production security settings weakened. What keeps this
from a clean PASS is that two checklist items are genuinely outside this
session's ability to verify: real Firebase Console registration state for
the debug token (no Console access), and a true positive/negative
*cryptographic* App Check validity test (the local emulator does not
perform real token verification for either Auth or App Check, by Firebase's
own design — confirmed by reading the SDK source, not assumed).

## PHASE 20D HANDOFF

Not issuing the "PHASE 20C PASS — ENVIRONMENT READY FOR PHASE 20D" handoff,
since the verdict above is PARTIALLY VERIFIED, not PASS. The environment is
functionally usable for continued local development right now — signup,
login, and `createBusiness` all work end-to-end through the real browser —
but Phase 20D (or whoever owns Firebase Console access) should first close
out the two "Remaining Blockers" above so that a future verification pass
can respond to this phase's exact negative-App-Check-token test, ideally
against a deployed (not emulated) Functions environment.
