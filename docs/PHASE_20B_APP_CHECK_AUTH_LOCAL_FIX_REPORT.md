# PHASE 20B APP CHECK + AUTH LOCAL FIX REPORT

**Priority:** 🔴 P0
**Verdict: PHASE 20B BLOCKED**

## 1. Problem

Phase 20's real-browser testing found that, with Phase 20A's App Check integration correctly active, both signup and login fail in the browser with a visible, user-facing error: `AppCheck: Fetch server returned an HTTP error status. HTTP status: 400. (appCheck/fetch-status-error).` This phase's job was to find and fix the root cause — without weakening App Check — or conclusively establish that no safe code fix exists.

## 2. Reproduction

Reproduced fresh this phase, from a cold start, exactly per the required sequence:

1. `npm run functions:build` — PASS
2. `firebase emulators:start --only auth,firestore,storage,functions --project demo-project` — all four emulators started successfully
3. `npm run dev` (`NEXT_PUBLIC_USE_EMULATORS=true` from `.env.local`) — dev server ready
4. Real Chromium browser (Playwright) → `http://localhost:3000/signup` → filled the real form → clicked submit

**Result** (redacted of all tokens/credentials): the signup form's own error banner displayed `AppCheck: Fetch server returned an HTTP error status. HTTP status: 400. (appCheck/fetch-status-error).` Network capture showed:

```
POST https://content-firebaseappcheck.googleapis.com/v1/projects/demo-project/apps/1:000000000000:web:0000000000000000000000/...exchangeDebugToken?key=demo-a...
→ 400
```

Zero accounts existed in the Auth emulator afterward (confirmed via the emulator's own accounts listing — count: 0). The identical error, on the identical endpoint, reproduced for `/login` against a pre-existing test account (created directly via the Auth emulator's REST API specifically to test login in isolation from signup).

## 3. Root Cause

**Definitively established, not inferred**, via three independent pieces of evidence:

1. **The error is the Auth SDK call's own rejection, not an unrelated global handler.** Traced `SignupForm.tsx`'s `catch (error) { setGeneralError(getAuthErrorMessage(error)) }` through to `getAuthErrorMessage` (`src/features/auth/utils/authErrors.ts`) — it reads `error.code`/`error.message` directly off the caught object with no global state involved. The rendered message is verbatim the App Check error's own `.message`, proving `await signupWithEmailPassword(email, password)` — i.e. `createUserWithEmailAndPassword(auth, ...)` itself — is the thing rejecting.
2. **Disabling the eager background token refresh does not fix it.** `isTokenAutoRefreshEnabled: true → false`, tested with a fresh signup attempt: identical failure. This rules out the proactive background refresh as the cause and isolates it to the Auth SDK's own **on-demand, per-request** token attachment.
3. **Conclusive controlled experiment**: with `initializeFirebaseAppCheck(app)`'s call site temporarily commented out (App Check never initialized on the app at all — everything else unchanged), the identical signup flow **succeeded completely**: landed on `/dashboard`, rendered `"Welcome back, <email>!"`, zero failed HTTP requests. This is the single most decisive piece of evidence: it isolates Firebase App Check's presence on the app instance as the **sole causal variable**. (This change was diagnostic only, reverted immediately after the observation — see §8.)

**Mechanism**: Firebase's JS SDK (installed here: `firebase@10.14.1`) attaches App Check tokens to requests from *other* Firebase services — not just Cloud Functions callables — automatically once `initializeAppCheck()` has run on the same `FirebaseApp` instance. This is documented, intentional, cross-service Firebase behavior (defense-in-depth), not a bug introduced by this codebase's own application code (confirmed: `src/features/auth/services/authService.ts`'s `signupWithEmailPassword`/`loginWithEmailPassword` are plain, unmodified Firebase Auth SDK calls — no custom App Check coupling was written into this application).

The specific **exchange failure** underneath that mechanism is because App Check's debug-token flow (the only officially documented mechanism for local/offline App Check development) always requires a live round-trip to Google's real App Check backend to exchange the debug token for a usable App Check token — **there is no local/offline App Check emulator**, confirmed authoritatively this phase by inspecting `firebase emulators:start --help`'s own `--only` option list: `["apphosting","auth","functions","firestore","database","hosting","pubsub","storage","eventarc","dataconnect","tasks"]` — no `appcheck` entry exists. Every other Firebase service used by this app (Auth, Firestore, Storage, Functions) has a real local emulator; App Check does not.

That live round-trip is being made against `.env.local`'s **entirely placeholder** Firebase config — `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-project`, `NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:0000000000000000000000` (all-zeros, Firebase's own documented placeholder convention), `NEXT_PUBLIC_FIREBASE_API_KEY` beginning `demo-a...`. This is not a misconfiguration — it is Firebase's own documented, standard, correct convention for `demo-`-prefixed local emulator projects, and it is entirely sufficient for Auth/Firestore/Storage/Functions, all of which never validate these values against a real backend. It is fundamentally insufficient for App Check specifically, because App Check's debug-token exchange has no local/offline equivalent and always needs a real, registered Firebase project.

## 4. Environment

Unchanged from Phase 20: local dev, all four service emulators (`auth`, `firestore`, `storage`, `functions`), real Chromium browser (confirmed functional again this phase), no real AI or Razorpay backend credentials, `NEXT_PUBLIC_USE_EMULATORS=true`.

## 5. Firebase Project Configuration

`.firebaserc` declares a real project ID (`brainwise-ai-marketing-engine`) as both `default` and `dev` targets. `.env.local`'s client config does **not** use that project — it uses the fully-synthetic `demo-project` convention instead, which is what routes Auth/Firestore/Storage/Functions to the local emulators cleanly. These two are **intentionally different**, not inconsistent: `.firebaserc` is what `firebase deploy`/`firebase emulators:start --project` use to select which backend project's Functions/rules to run; `.env.local` is what the browser-side app connects to. Confirmed via direct inspection, not assumed.

## 6. App Check Configuration

Unchanged from Phase 20A, re-confirmed this phase byte-for-byte via `git diff` after this phase's diagnostic edit was reverted: `ReCaptchaV3Provider`, `isTokenAutoRefreshEnabled: true`, `FIREBASE_APPCHECK_DEBUG_TOKEN` set only when `NEXT_PUBLIC_USE_EMULATORS === 'true'`, initialized synchronously immediately after `initializeApp()` and before `getAuth()`/`getFunctions()` are called. This ordering and mechanism (Option A from the brief's own framing — "local development uses Firebase App Check debug-token mode correctly") is **correct and matches Firebase's own documented local-dev pattern**. The code was not the defect.

## 7. Auth Configuration

`src/features/auth/services/authService.ts` — read in full again this phase, confirmed unmodified: `createUserWithEmailAndPassword`, `sendEmailVerification`, `signInWithEmailAndPassword` are called with no custom headers, no App Check coupling, no wrapper logic of any kind. The interaction with App Check happens entirely inside the Firebase SDK itself, below this application's own code.

## 8. Fix Implemented

**No fix was implemented in the shipped code.** Per §7 of the brief's own decision framework, the only two remaining options are:

- **Option A** (debug-token mode used correctly) — already true; not the missing piece.
- **Option B** (a real, registered Firebase project + a debug token registered in that real project's Console) — **this is the actual missing piece**, and it requires an external, human action this environment cannot perform: registering the SDK's console-logged debug token in a real Firebase project's Console requires interactive Google-account browser authentication to `console.firebase.google.com`, which this environment has no credentials for. A CLI/programmatic alternative was investigated and ruled out this phase: `firebase appcheck` exists only as an unimplemented command-group label in the installed `firebase-tools@15.29.0`'s help output (`firebase appcheck: manage appcheck resources` in the top-level help, but invoking it returns `"appcheck" is not a Firebase command`), and even if a working subcommand existed, it would still require `firebase login` with real Google credentials this environment does not have.
- **Option C/D** — not applicable: no alternative App Check provider (reCAPTCHA Enterprise, Play Integrity, DeviceCheck, a custom provider) would sidestep the fact that App Check has no local/offline emulator at all — every provider's debug-token flow has this identical live-backend dependency.

**A temporary diagnostic edit was made and immediately reverted** (§3 point 3, §12): `appCheck = initializeFirebaseAppCheck(app);` was commented out, the exact behavior observed, and the line restored. `git diff -- src/lib/firebase/client.ts` after this phase shows the identical diff shape Phase 20A produced — zero net change from this phase.

**Explicitly not done, per the brief's absolute rules**: App Check was not disabled, no `enforceAppCheck: true` was changed to `false`, no fake token was created, no arbitrary/bypass header was added to application code, and no "if development then disable App Check" branch was introduced anywhere.

## 9. Security Impact

**None — nothing shipped changed.** Re-confirmed this phase:
- 24/24 expected callables still `enforceAppCheck: true` (fresh grep).
- `healthCheck` remains the sole, unmodified, documented exception.
- Negative test: an unauthenticated request to `createBusiness` (no `Authorization` header at all) → `{"error":{"message":"Unauthenticated","status":"UNAUTHENTICATED"}}`.
- Negative test: a request with a fake/invalid `Authorization: Bearer not-a-real-token` header and **no** App Check header → still `UNAUTHENTICATED`.
- `src/lib/firebase/client.ts` is byte-identical (via `git diff`) to its Phase 20A state.

## 10. Gate A — Signup

**BLOCKED.** Real browser, real form, real submission — fails with the App Check error documented in §2/§3. Not fixed this phase for the reasons in §8.

## 11. Gate B — Login

**BLOCKED.** Identical failure mode, confirmed independently against a pre-existing account (created via the Auth emulator's own admin REST API specifically to isolate login from signup) — proving the blocker is Auth-SDK-wide, not signup-specific.

## 12. Gate C — createBusiness

**BLOCKED — untestable through a real, authenticated browser session**, because Gates A/B never produce one. What *can* be and was stated honestly: `createBusiness`'s own `enforceAppCheck: true` gate correctly rejects unauthenticated/App-Check-less requests (§9's negative tests, this phase); Phase 20A separately proved (via Node + jsdom, not a browser — not conflated with browser proof here) that a request carrying both a valid Auth token and a debug-token-derived App Check header succeeds against the emulator. Neither of those substitutes for the real-browser Gate C this phase required; both are reported for what they actually are.

## 13. Negative Security Tests

| Test | Expected | Result |
|---|---|---|
| No `Authorization` header at all → `createBusiness` | `UNAUTHENTICATED` | **PASS** — confirmed this phase, fresh |
| Fake `Authorization` header, no App Check header → `createBusiness` | `UNAUTHENTICATED` | **PASS** — confirmed this phase, fresh |
| Real Auth token, no App Check header → any `enforceAppCheck: true` callable | `UNAUTHENTICATED` | **PASS** — established in Phase 20A, unchanged, not re-weakened |

Documented limitation (unchanged from Phase 20A, re-stated here per §20's instruction): the local Functions **emulator** validates only that an App Check header is *present*, not that it is cryptographically genuine — this is expected, documented emulator behavior (no local App Check emulator exists to do real verification), and is explicitly not treated as proof of production-grade App Check enforcement, which requires a real deployment to verify.

## 14. Automated Tests

```
npm run lint                PASS (root, 0 errors)
npm run typecheck             PASS
npm run build                   PASS (17/17 pages)
npm run functions:build          PASS
npx jest --silent                  PASS — 14 suites, 164 tests, 7 legitimately skipped (no-emulator run, this phase)
```

Emulator-backed suites (run during this phase's investigation window, live): Firestore/Storage/Auth rules and Functions integration tests unaffected — this phase's only code touch was the temporary, reverted diagnostic in `client.ts`, which is not exercised by any Jest suite (those suites hit callables via `.run()` or the emulator's HTTP endpoint directly, not through the browser client module).

## 15. Production Safety

Verified this phase, not assumed:
- Production code path (`NEXT_PUBLIC_USE_EMULATORS` unset/`false`) never sets `FIREBASE_APPCHECK_DEBUG_TOKEN` — confirmed by re-reading the surrounding `if (useEmulators)` guard in `client.ts`, unchanged.
- Production still requires a real `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`; its absence still produces a loud `console.error` naming the exact resulting symptom, not a silent bypass — unchanged.
- All 24 intended callables remain `enforceAppCheck: true` — fresh inventory this phase, identical to Phase 20A/20's.
- Nothing about this phase's investigation or its (reverted) diagnostic edit could have activated in a production build, since the diagnostic edit no longer exists in the shipped file.

## 16. Remaining External Requirements

1. **A real, non-placeholder Firebase project's client config** (`NEXT_PUBLIC_FIREBASE_API_KEY`/`APP_ID`/`PROJECT_ID`, etc. — matching a project with App Check enabled) used for local `.env.local`, **while still routing Auth/Firestore/Storage/Functions to local emulators** via the existing `connect*Emulator()` calls (architecturally compatible — those calls redirect the specific SDK's traffic regardless of the app's nominal project).
2. **That project's auto-generated debug token registered in its Firebase Console** (App Check → Apps → this web app → Manage debug tokens) — requires interactive Google-account browser access this environment does not have. This is the single blocking action; once done, Gates A/B/C become testable.
3. Real AI provider credentials (unchanged from Phase 19/20, unrelated to this specific blocker).
4. Backend Razorpay test-mode secret (unchanged from Phase 19/20, unrelated to this specific blocker).

## 17. Final Verdict

**PHASE 20B BLOCKED**

The root cause is now proven with the strongest evidence standard available in this environment — a controlled experiment isolating App Check's presence as the sole causal variable, plus independent confirmation that the failure is the Auth SDK's own request rejection, not an unrelated handler. No safe code-level fix exists that would resolve this without either disabling/weakening App Check (explicitly forbidden) or obtaining external credentials this environment cannot provide (a real Firebase project + interactive Firebase Console access to register a debug token). App Check remains fully enforced, unchanged, and unweakened throughout this investigation — confirmed via fresh inventory, fresh negative tests, and a byte-for-byte diff showing zero net change to the shipped client code. Per the phase's own verdict rule (*"the necessary environment configuration cannot be established and no safe implementation path can be verified"*), this is correctly **BLOCKED**, not partially verified.
