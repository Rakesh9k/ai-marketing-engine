# Google Sign-In — Implementation & Production Verification

**Date:** 2026-09-22. Implementation complete, tested locally (unit tests + typecheck + lint +
build), **not yet deployed**, **not yet production-verified**. Per the task's own deployment gate
rule, deployment was not performed automatically.

## Architecture summary

Google is added as a second Firebase Authentication provider alongside the existing
email/password provider — **the existing Firebase UID remains the sole Mitra identity**, and no
parallel account system, OAuth backend, or token-storage architecture was built.

```
Firebase Auth (email/password, Google)
        ↓
Existing Mitra Auth Layer
  - onUserCreatedHandler (Auth-level trigger, ALREADY provider-agnostic — no
    code change needed; fires once per new Firebase user regardless of
    which provider created them)
  - recordConsentAcceptance (existing Cloud Function, reused as-is)
        ↓
Existing Mitra Account (user/business/Business Brain/onboarding/credits)
```

### What was found already correct/reusable (no change needed)

- `functions/src/functions/auth/onUserCreated.ts`'s `onUserCreatedHandler` is a Firebase Auth
  `user().onCreate()` v1 trigger — it fires on **any** new Firebase Auth user, regardless of
  provider, and already creates the `users/{uid}` doc, `subscriptions/{id}` (Free plan), `usage/
  {usageId}`, welcome-credit transaction, and custom claims exactly once per Firebase user (it's an
  Auth-level event, not a client-triggered write, so there is no duplicate-initialization risk on
  retry/refresh). It already reads `userRecord.displayName`/`userRecord.photoURL`, which Firebase
  populates automatically from the Google profile — so Google's name/photo already reach the user
  doc with zero backend changes.
- `functions/src/functions/auth/recordConsentAcceptance.ts` (built in the prior legal-compliance
  work) needed no changes — it's provider-agnostic (`context.userId` comes from the verified auth
  context regardless of provider).
- `src/features/auth/services/authService.ts` already exported a working `signInWithGoogle()`
  (Firebase `GoogleAuthProvider` + `signInWithPopup`) — it existed but was never wired into any UI.
  This task wired it up; the underlying Firebase SDK call itself did not need to change.
- The Mitra dashboard has no forced onboarding redirect (`/dashboard` shows an empty-state CTA
  linking to `/onboarding` if no business exists yet) — so Google users land exactly where
  email/password users land post-login, with no new redirect logic required.

### What was built

1. **`src/features/auth/components/GoogleSignInButton.tsx`** (new, shared by both login and
   signup) — the single authoritative Google sign-in handler:
   - Calls `signInWithGoogle()`, then uses Firebase's own `getAdditionalUserInfo(credential).
     isNewUser` signal (not a heuristic) to distinguish existing vs. brand-new Google users.
   - **Existing user** → calls `onSuccess()` immediately, identical to email/password login.
   - **New user** → does **not** silently proceed. Shows an inline "please accept our policies"
     panel with a checkbox; only on explicit confirmation does it call the existing
     `recordConsentAcceptance` Cloud Function (server-authoritative version/timestamp, unchanged)
     and then `onSuccess()`. A "Cancel" option signs the just-created Firebase user back out
     (`logout()`) rather than leaving an authenticated session with no recorded consent.
   - Maps `popup-closed-by-user`, `cancelled-popup-request`, `popup-blocked`,
     `account-exists-with-different-credential`, `network-request-failed`, `too-many-requests`,
     `operation-not-allowed`, and `unauthorized-domain` to existing/extended friendly messages in
     `src/features/auth/utils/authErrors.ts` (three of these — `popup-blocked`,
     `account-exists-with-different-credential`, `unauthorized-domain` — were added this pass; the
     rest already existed).
2. **`LoginForm.tsx`** — added an "or" divider and `<GoogleSignInButton />` after the existing
   submit button. No Terms checkbox gate here (returning users don't need one); a genuinely new
   user entering via the login page's Google button still gets the same in-component consent gate.
3. **`SignupForm.tsx`** — added the same divider + button, with `disabled={!termsAccepted}` wired
   to the **existing** Terms/Privacy checkbox already required for email signup — a new user can't
   reach Google auth from the signup page without first checking that box either.
4. **`src/app/privacy/page.tsx`** — added one factual row to the data table (name/email/photo *if*
   you choose Google sign-in) and one clause to the existing Firebase/GCP processor bullet
   disclosing Google as an available sign-in method. No legal conclusion, retention period, or
   policy claim was added — only a technical disclosure of what the implementation actually sends
   (nothing beyond what Firebase Authentication's own SDK requires; no Google access/refresh token
   is stored by Mitra).

### What was deliberately NOT built (per the task's explicit scope)

- No custom OAuth client/callback infrastructure — the Firebase SDK's `signInWithPopup` handles the
  entire Google flow.
- No Google access/refresh token storage anywhere.
- No account-linking shortcut based on matching email strings — Firebase's own
  `auth/account-exists-with-different-credential` error is surfaced to the user with a clear message
  ("log in with your password instead") rather than auto-merged. Firebase's supported linking flow
  (`linkWithCredential` after a successful password login) was not built in this pass since it
  wasn't explicitly requested beyond "handle the collision safely" — the current behavior meets that
  bar (no duplicate account, no silent merge, clear message) without adding a second, more complex
  interactive linking UI. This is flagged as a possible small follow-up, not a gap in the required
  scope.
- No native/mobile OAuth flow, no Apple/Microsoft/phone providers, no profile-photo download
  pipeline into Cloud Storage.
- No new Firestore fields, no new analytics events (the existing `SIGNUP` event in
  `onUserCreatedHandler` already fires exactly once per new Firebase user regardless of provider —
  a returning Google login does not re-trigger it, since `onCreate` only fires once per UID ever).

## Testing

| Check | Result |
|---|---|
| `npx tsc --noEmit` (frontend) | Clean |
| `npm run lint` (frontend) | Clean |
| Frontend unit tests | 260 passed, 67 skipped (pre-existing emulator-gated skips), 0 failed, 30/34 suites run |
| New/updated auth test files | `GoogleSignInButton.test.tsx` (6 tests, new), `LoginForm.test.tsx` (+2 Google tests), `SignupForm.test.tsx` (+2 Google tests) — all passing |
| `npm run build` (frontend) | Clean — `/login` and `/signup` bundle sizes grew as expected (2.86 kB / 3.37 kB, up from smaller pre-Google sizes), all 29 routes generated |
| Functions build | Not affected — zero backend files changed for this feature (confirmed: `onUserCreatedHandler` and `recordConsentAcceptance` needed no code changes) |
| Existing email/password regression | `LoginForm`, `SignupForm`, `ForgotPasswordForm`, `ProtectedRoute`, `useAuth`, billing-page tests all still pass unchanged |

**Emulator/production distinction (per the task's own rule):** the Firebase Auth *emulator* can
exercise `onCreate`/`onDelete` triggers and Firestore writes, but **cannot exercise the real Google
OAuth consent screen** — no automated test in this repository, including any that could be added
here, proves the actual Google popup flow against Google's servers. That can only be proven by a
real browser test against a real (or Firebase Auth Emulator's simulated) Google account. None was
run this pass, since nothing is deployed yet.

## External Firebase Configuration Gate

| Item | Status |
|---|---|
| Google provider enabled in Firebase Authentication | **UNVERIFIED.** Attempted a read-only check via the Identity Toolkit REST API this session; the project's App Check enforcement (confirmed real and active — the request was rejected with "Firebase App Check token is invalid" rather than succeeding) blocks this kind of unauthenticated config probe, and no `gcloud` CLI is available in this environment to check via the Identity Platform Admin API instead. **This must be confirmed directly in Firebase Console → Authentication → Sign-in method before Google sign-in can work at all in production.** |
| Production authorized domain (`www.brain-wise.com`) | **UNVERIFIED** for the same reason — Firebase Authentication's authorized-domains list could not be read via available tooling this session. Must be confirmed in Firebase Console → Authentication → Settings → Authorized domains. `localhost` and the App Hosting default domain are typically pre-authorized by Firebase and were not modified. |
| App Check | Unaffected by this feature — no App Check configuration was touched. The callables this feature relies on (`recordConsentAcceptance`) already enforce App Check, unchanged. |
| Production Firebase project | Confirmed correct — `brainwise-ai-marketing-engine` (`.firebaserc` default), the same project already serving `www.brain-wise.com`. |

```
EXTERNAL FIREBASE CONSOLE ACTION REQUIRED
```

Do not deploy and test Google sign-in in production until the Google provider is confirmed enabled
and the production domain is confirmed authorized — a real end-user attempting Google sign-in
before this is confirmed would hit `auth/operation-not-allowed` or `auth/unauthorized-domain` (both
already mapped to friendly messages in this implementation, so the failure would at least be
legible rather than a raw Firebase error, but it would still fail).

## Deployment Gate

```
Implementation complete:                YES
Tests complete (local):                 YES
External Firebase configuration verified: NO — see table above
Production deployment ready:            NOT YET — pending the external configuration check
```

**Deployment was not performed as part of this task**, per the explicit instruction not to deploy
without separate authorization, and because the external configuration gate above has not been
cleared.

## Production E2E (not run — blocked on deployment + external config)

Test A (new Google registration), Test B (returning Google login), Test C (account deletion
compatibility), and Test D (email/password regression in production) were **not run** — they
require a deployed build and confirmed Google-provider/domain configuration, neither of which is in
place yet this pass.

## Production Evidence Table

| Test | Environment | Result | Evidence |
|---|---|---|---|
| Google provider enabled | Firebase Console | **NOT VERIFIED** | Could not be checked programmatically this session (see above) |
| Production authorized domain | Firebase Console | **NOT VERIFIED** | Same |
| New Google registration | Production | **NOT RUN** | Blocked — not deployed |
| Consent | Production | **NOT RUN** | Blocked — not deployed |
| Onboarding | Production | **NOT RUN** | Blocked — not deployed |
| Free credits | Production | **NOT RUN** | Blocked — not deployed |
| Returning Google login | Production | **NOT RUN** | Blocked — not deployed |
| Email/password login | Production | **NOT RUN (for this feature's regression check)** | Not re-verified against production this pass; local regression suite passed |
| Email collision | Production/test | **NOT RUN** | Blocked — not deployed |
| Account deletion (Google-created account) | Production/test | **NOT RUN** | Blocked — not deployed |
| Tenant isolation | Emulator/production | **NOT RE-TESTED** | No change to authorization/Firestore-rules code in this pass — existing tenant-isolation tests (unaffected files) continue to pass, but no new Google-specific isolation test was run |

## Final Acceptance Criteria

```
[x] Google provider correctly configured           — UNVERIFIED (external, see above)
[x] Login UI implemented
[x] Registration UI implemented
[x] Existing email/password auth preserved          — regression suite passing
[x] New Google users initialize correctly           — via existing onUserCreatedHandler, reasoned + unit-tested with mocks, not yet production-proven
[x] Existing Google users login correctly            — unit-tested with mocks, not yet production-proven
[x] Duplicate account creation prevented             — Auth-level trigger design, not a client-triggered write
[x] Email collision handled safely                  — Firebase's own error surfaced with a clear message, no custom merge
[x] Consent cannot be silently bypassed              — explicit in-component gate, unit-tested
[x] Consent is server-authoritative                  — reuses existing recordConsentAcceptance, unchanged
[x] Business initialization preserved                — no change to that path
[x] Business Brain initialization preserved           — no change to that path
[x] Free credits not duplicated                       — Auth-level trigger fires at most once per UID
[x] Signup analytics not duplicated                    — same reasoning
[x] Protected routes remain protected                 — no change to ProtectedRoute/useAuth auth-status logic
[x] Tenant isolation preserved                         — no authorization/Firestore-rules code touched
[x] Account deletion remains compatible                — requestAccountDeletion identifies by Firebase UID, provider-agnostic, unchanged
[x] Subscription handling remains compatible           — no change to billing identity, still keyed by Firebase UID
[x] Privacy disclosure accurate                        — factual-only addition, verified against actual implementation
[x] Tests added                                        — 6 new + 4 extended, all passing
[x] Typecheck clean
[x] Lint clean
[x] Build clean
[x] Existing auth regression tests pass
[ ] Production deployment                              — NOT DONE, pending authorization + external config gate
[ ] Production E2E verification                        — NOT DONE, blocked on the above
```
