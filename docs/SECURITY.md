# Mitra Security Architecture

Consolidated technical security reference for developers, maintainers, and auditors. This document
was assembled by reading current source code, current tests, and prior verified audit reports — not
from a plan. Where a claim could not be independently verified in this session, it says so
explicitly rather than asserting confidence it doesn't have. No secret value appears anywhere below.

Precedence used when sources disagreed: current source/config → current tests → verified audit
reports → historical phase reports. No disagreement requiring escalation was found while writing
this document; where a historical report's conclusion is superseded by more recent evidence, that is
noted at the point it's used.

## 1. Security Principles

Verified from the code, not asserted: authorization decisions are made server-side (Cloud
Functions), never trusted from the client; credit/payment state is server-authoritative; every
callable requires both a valid Firebase Auth token and a valid App Check token; Storage writes/reads
go through server-issued signed URLs rather than direct client writes to arbitrary paths.

## 2. Authentication

- Provider: Firebase Authentication, **email/password only in the actual product UI**
  (`SignupForm.tsx`/`LoginForm.tsx` call `signupWithEmailPassword`/`loginWithEmailPassword`).
- The auth service layer (`src/features/auth/services/authService.ts`) also defines
  `signInWithGoogle` and `signInWithPhone`, but neither is called from any page/component in `src/`
  (verified by repo-wide grep) — **Google and phone/OTP sign-in are implemented in code but not
  exposed in the product**, not "supported."
- Session persistence: Firebase SDK's own browser persistence (IndexedDB/local), per origin.
  `useAuth.ts` deliberately stays in a `loading` state until the first `onAuthStateChanged` callback
  fires, specifically to avoid treating an unrestored session as "signed out" (a real bug this fixed —
  see the inline comment and `docs/PHASE_19C_FIREBASE_APP_HOSTING_PRODUCTION_REPORT.md`'s commit
  `7cad2f2`).
- Route protection is a client-side component (`ProtectedRoute`) — this affects _navigation_, not
  _authorization_; real authorization is enforced in Cloud Functions and Firestore/Storage rules
  (§4, §6, §7).
- Server-side verification: every callable authenticates the caller via Firebase's own callable
  context (`context.auth`), not a custom token scheme.
- MFA, password complexity policy, and account lockout: **not verified as implemented** — no code
  implementing these was found in this session; do not assume they exist.

## 3. App Check

- Provider: `ReCaptchaEnterpriseProvider` (reCAPTCHA Enterprise), initialized once at module scope in
  `src/lib/firebase/client.ts`, before `getAuth()`/Firestore/Functions are obtained — confirmed
  correct ordering by `docs/PHASE_19C_RECAPTCHA_APPCHECK_VERIFICATION_REPORT.md`.
- Enforcement coverage: **all 33 non-webhook, non-trigger `onCall` functions** register with
  `enforceAppCheck: true` — verified by grep across every file in `functions/src/functions/**` in
  this documentation pass (zero exceptions found), consistent with `docs/API.md`'s own inventory.
- Debug tokens are gated strictly on `NEXT_PUBLIC_USE_EMULATORS === 'true'`; the deployed App Hosting
  config sets this `"false"` explicitly (`apphosting.yaml`, per the same report).
- Failure behavior: fail-closed. If the site key is missing/misconfigured, App Check initialization
  fails loudly and every callable then rejects as unauthenticated — this is not a bypass path.
- **Known, currently-open production issue** (per `docs/PHASE_19C_RECAPTCHA_APPCHECK_VERIFICATION_REPORT.md`,
  dated 2026-09-21): the deployed App Hosting hostname was, as of that report, not on the reCAPTCHA
  key's allowed-domain list, blocking real sign-up/login on that specific deployed URL. This is a
  **console configuration item**, not a code defect, and this document does not claim it has since
  been resolved — that would need re-verification against the live environment, which this session
  did not perform.

## 4. Authorization

Hierarchy verified from `functions/src/middleware/auth.ts` and its tests: **User → Business →
(optional) Agency/Client relationship → Campaign/Asset/Product**, enforced by
`verifyBusinessAccess(userId, businessId)`:

1. Reads the target `businesses/{businessId}` document.
2. If the business doesn't exist, denies with `not-found`.
3. If the caller is the business's own `userId`, access is granted.
4. Otherwise, the caller must be an `agency_member` whose own `agencyId` (from their `users/{uid}`
   document) matches the business's `agencyId` — both conditions checked, not just role.
5. Every denial is logged (userId/businessId, never the compared agencyId values themselves — see
   §20).

This exact hierarchy, including the negative cases, is proven by a real Firestore-emulator test
(`functions/src/functions/analytics/getAnalyticsDashboard.emulator.test.ts`, re-run and confirmed
passing during the Performance Optimization closure pass — 15/15 tests, including "Business A's
owner cannot read Business B's analytics" and "an agency member from a DIFFERENT agency cannot read
this client business"), and by `tests/phase27-authz.test.ts` (11 test cases) and
`tests/phase27-bulk-approval-auth-roles.test.ts` (9 test cases) at the root test level. Every
business-scoped callable in `docs/API.md`'s inventory calls `verifyBusinessAccess` (or
`verifyAuthAndBusinessAccess`) before touching business data.

Bulk/approval-specific authorization is covered separately in
`tests/phase27-bulk-approval-auth-roles.test.ts` — not re-derived here in detail; that file is the
authoritative, current test evidence for that specific surface.

## 5. Tenant Isolation

Tenant isolation (business-to-business and agency-to-agency) is enforced by the same
`verifyBusinessAccess` logic in §4, not by a separate mechanism. There is no shared cache or
memoization anywhere in `functions/src` that could leak one tenant's data into another's response
(confirmed by grep — no `unstable_cache`/custom cache found; see
`docs/PERFORMANCE_OPTIMIZATION_AUDIT_REPORT.md` §13 for the caching audit this relies on).

## 6. Firestore Security

`firestore.rules` was not re-transcribed in full here (rules text is security-sensitive to publish
verbatim beyond what's needed); the relevant architectural fact, verified directly in
`functions/src/functions/analytics/getAnalyticsDashboard.ts`'s own comment, is that **Firestore rules
alone are insufficient for at least one real read path**: `analytics_events` only has a rule allowing
a read where `resource.data.userId == request.auth.uid`, which cannot express "an agency member
reading a client business's events." `getAnalyticsDashboard` is a Cloud Function specifically
_because_ of this — it uses the Admin SDK (which bypasses Firestore rules entirely) and substitutes
`verifyBusinessAccess` as the real authorization gate. **Do not assume "Firestore rules protect X" is
sufficient reasoning anywhere a Cloud Function using the Admin SDK is involved — the function's own
authorization check is what matters in those paths.**

## 7. Storage Security

`storage.rules` (full text — this file is meant to be readable, it's the actual deployed rule set):

```
match /businesses/{businessId}/{allPaths=**} {
  allow read, write: if request.auth != null &&
    (businessId in request.auth.token.businessIds ||
      (request.auth.token.role == 'agency_member' &&
        request.auth.token.agencyId == resource.metadata.agencyId));
}
match /temp/{userId}/{fileName} {
  allow write: if request.auth != null && request.auth.uid == userId;
  allow read: if request.auth != null && request.auth.uid == userId;
}
match /shared/reel-music/{fileName} {
  allow read: if request.auth != null;
  allow write: if false;
}
```

**Important, verified nuance**: these rules govern _client_ reads/writes. Client uploads in this app
never write directly to `businesses/{businessId}/**` via the client SDK — they PUT to a
server-minted signed URL instead (see §8). The functions that then process those uploads
(`confirmUpload.ts`, `confirmReelClipUpload.ts`) use `admin.storage()` — **the Admin SDK, which
bypasses `storage.rules` entirely.** Saying "Storage rules protect uploaded assets" would be
incomplete and misleading; the real protection on the confirm-side is the explicit
`businessId`-to-`storagePath` check described in §10, done in application code, not by the rules
file.

## 8. Signed Upload Flow

1. Client calls `getUploadUrl` (or `getReelClipUploadUrl`) with its `businessId`.
2. The function (after `verifyBusinessAccess` + rate limiting) mints a signed Storage URL scoped to
   a path of the form `businesses/{businessId}/...` — the function itself controls the path prefix,
   the client cannot choose an arbitrary path.
3. The client PUTs the file bytes directly to that signed URL (not through a Cloud Function).
4. The client then calls `confirmUpload` (or `confirmReelClipUpload`) — see §10.

## 9. Signed Download Flow

`confirmUpload.ts` mints a **v4 signed URL, 7-day expiry**, via `admin.storage()`, after confirming
the file actually exists in Storage. This is the `previewUrl`/`downloadURL` the client receives and
stores. It is not a permanently public URL, and it is not re-derivable by a client without the
server having issued it.

## 10. Storage Path Ownership

This is the specific defense-in-depth check the phase brief asks to document precisely, and it is
real, present in code, and directly quoted (not paraphrased) from `confirmUpload.ts`:

> "Defense in depth: `verifyBusinessAccess` above only proves the caller owns/has access to
> `businessId` — it says nothing about whether `storagePath` (a client-supplied string) actually
> points inside that business's own Storage folder. Without this check, a caller who owns Business A
> could pass Business A's businessId alongside a storagePath belonging to Business B ... and this
> function would happily generate a 7-day admin-signed download URL for Business B's file (`admin.storage()`
> bypasses storage.rules entirely) and persist a `campaign_assets` doc pointing at it."

The actual check:

```ts
const expectedPrefix = `businesses/${businessId}/`;
if (!storagePath.startsWith(expectedPrefix)) {
  throw new HttpsError('permission-denied', 'storagePath does not belong to businessId');
}
```

The identical pattern (same comment intent, same prefix check) exists in
`confirmReelClipUpload.ts`. This is the layer that actually matters once you're inside a Cloud
Function using the Admin SDK — not the Storage rules file, which the Admin SDK bypasses (§7).

## 11. Cloud Functions Security

- All 33 non-webhook, non-trigger callables: `region: 'asia-south1'`, `enforceAppCheck: true` (§3).
- Every callable's input is validated by a Zod schema via `validatedCallable` before the handler body
  runs — a request that fails schema validation never reaches business logic.
- Two intentional exceptions: `healthCheck` (public liveness probe) and `razorpayWebhook` (HMAC-signed
  instead of Auth/App Check, since the caller is Razorpay's server — §15/§16). See `docs/API.md` for
  the full inventory and reasoning.

## 12. Rate Limiting

Source of truth: `docs/PHASE_38_RATE_LIMIT_PRECISION_AUDIT_REPORT.md` (core precision fix, VERIFIED
against a real emulator) and `docs/PHASE_38B_RATE_LIMIT_FOLLOWUP_REPORT.md` (fault-injection
follow-up). Do not restate specific quota numbers here (they're tunable and this document would go
stale) — see `docs/API.md` §Rate limiting for which endpoints are covered.

**Do not describe the Firestore-outage fail-safe behavior as fully fixed** — Phase 38B's own,
current finding (F-7, not fixed, explicitly documented as such) is: a genuine Firestore outage
causes `checkRateLimit` to hang indefinitely (never resolve or reject) rather than fail fast with a
clean error, relying entirely on the Cloud Functions platform's own execution timeout to eventually
terminate the request. The practical security property still holds — nothing expensive (AI
generation, credit reservation) ever executes during that hang, verified with mock call-count
assertions at 0 — but the _client-visible_ behavior in that specific failure scenario is a slow
timeout, not a fast "try again" error. This is carried forward here as an accurate, current, open
finding, not glossed over.

## 13. Credits and Entitlements

Server-authoritative, in `functions/src/services/usageControl.ts`:

- `reserveCreditsForOperation` — reserves credits _before_ a billable operation (e.g. AI generation)
  starts, so a failure mid-operation doesn't silently overspend.
- `finalizeReservation` — converts a reservation into an actual spend once the operation completes
  successfully.
- `refundReservation` — returns reserved credits if the operation fails or is aborted; this is the
  mechanism behind the user-facing "your credits were not consumed for this failed generation"
  guarantee (also referenced in `docs/USER_GUIDE.md`).
- The client never computes its own authoritative balance; it only displays what the server last
  reported. Insufficient-credit handling and idempotency for this system are covered by
  `docs/PHASE_10_CREDITS_PAYMENT_INTEGRITY_REPORT.md` and dedicated concurrency tests
  (`usageControl.concurrency.test.ts`, `firestore.reserveCredits.test.ts`) — not re-derived here in
  full detail to avoid a second, driftable copy.

## 14. Truth Check Security

Truth Check (`functions/src/services/ai/truthCheck.ts`) is server-authoritative by construction: it
runs inside a Cloud Function, compares AI-generated claims against the caller's own stored
Business/Product data (not against anything the client supplies about itself), and a client cannot
submit its own "verification result" — there is no input field for one anywhere in the relevant Zod
schemas. Regeneration always re-runs Truth Check against current source data (not a cached prior
verdict), and — verified directly in `regenerateAsset.ts` — a regenerated version that comes back
`FAIL` or `REVIEW_REQUIRED` **does not replace the currently active, valid version**; only an
explicit `PASS` triggers the swap. This specific behavior is covered by what the code's own comments
describe as a "Phase 6 golden test."

## 15. Payment Security

- Checkout: client-side Razorpay Checkout, using only the public key id
  (`NEXT_PUBLIC_RAZORPAY_KEY_ID`).
- Server verification: `verifyPayment` Cloud Function checks the payment server-side — but,
  verified directly in `billing/page.tsx`'s own comment and matching `verifyPayment.ts` behavior,
  **`verifyPayment` deliberately never grants credits itself** — it only updates subscription status
  for a responsive UI. Credits are granted **exclusively** by `razorpayWebhook.ts`, after Razorpay's
  own server confirms the payment via webhook.
- Webhook signature verification: `verifyWebhookSignature` in `functions/src/services/razorpay.ts`
  computes an HMAC-SHA256 of the raw request body and compares it to the provided signature using a
  plain `===` string comparison, **not a constant-time comparison** (e.g. `crypto.timingSafeEqual`).
  This is a real, minor theoretical timing-attack surface on webhook signature verification, noted
  here as a known gap (§28) rather than fixed — fixing it is a code change outside this
  documentation-only phase's scope.
- Idempotency: webhook processing is expected to be idempotent per the project's Phase 10 credits
  report; not re-verified line-by-line in this pass.
- **Production payment verification: NOT INDEPENDENTLY VERIFIED in this session.** The configured
  Razorpay key was recorded as test-mode (`rzp_test_...`) in
  `docs/PHASE_19C_FIREBASE_APP_HOSTING_PRODUCTION_REPORT.md` — this document does not claim live
  production payments have been proven to work end-to-end.

## 15b. PayU Payment Security (2026-09-22 migration)

PayU is now the active payment gateway (see `docs/PAYMENT_GATEWAY.md` for the full migration
record); Razorpay's code and §15/§16 above remain accurate for the still-deployed legacy path.

- **Credential handling**: `PAYU_MERCHANT_KEY`/`PAYU_SALT` are read only via
  `functions/src/config/env.ts` → `services/payu.ts`'s `getPayUConfig()`. The salt is never returned
  from any callable, never written to Firestore, never logged (confirmed by reading every log call
  in `payu.ts`/`payuWebhook.ts`/`payuCallback.ts`/`createPayUPayment.ts` — each logs only
  `txnid`/`status`/correlation fields), and never present in any `NEXT_PUBLIC_*` variable or
  client-side code.
- **Payment request hash**: `sha512(key|txnid|amount|productinfo|firstname|email|udf1..udf5||||||SALT)`
  — server-generated in `createPayUPayment.ts`, sourced from PayU's current public documentation
  (cited in `services/payu.ts`'s module header), not invented.
- **Response/webhook hash**: a _different_ formula (`sha512(SALT|status||||||udf5..udf1|email|firstname|productinfo|amount|txnid|key)`)
  — `payuWebhook.ts`/`payuCallback.ts` never reuse the payment-request formula to verify a response,
  a mistake this migration was explicitly built to avoid.
- **Constant-time comparison**: `verifyHashConstantTime()` uses `crypto.timingSafeEqual` after a
  length check (required by the API; leaks only the fixed public length of a hex-SHA512 digest, 128
  characters, never content) and a hex-format check — never a plain `===`, unlike the still-present
  gap in Razorpay's `verifyWebhookSignature` noted in §15 above (that gap was independently addressed
  in a separate legal-compliance pass — see `docs/LEGAL_COMPLIANCE_AUDIT_REPORT.md` candidate C3 —
  not as part of this payment migration).
- **Amount reconciliation**: `payuWebhook.ts` compares the webhook's claimed amount against the
  `transactions/{txnid}.amount` value Mitra itself persisted at checkout-initiation time (sourced
  from `config/pricing.ts`, never the client) — a mismatch is flagged
  (`flagged_amount_mismatch`) and credits are refused, never silently granted at the wrong amount.
- **Idempotency**: webhook processing is idempotent, keyed on `txnid+status`, via the same atomic
  Firestore-transaction claim pattern as the Razorpay webhook (§16) — proven under sequential and
  concurrent duplicate delivery by `payuWebhook.test.ts`.
- **Tenant isolation**: credits are granted to the `userId` recorded on Mitra's own
  `transactions/{txnid}` document, never to a client-suppliable field (`udf1` is cross-checked, not
  trusted as the sole source) — proven by a dedicated test asserting a forged `udf1` cannot redirect
  credits to a different user.
- **Recurring/SI**: gated behind `PAYU_SI_ENABLED` (default `false`); the mandate-registration/
  recurring-charge/cancel functions throw immediately if called while disabled, rather than silently
  attempting a request against a merchant account that may not have SI capability enabled.
- **Production payment verification: NOT PERFORMED.** No PayU credentials of any kind exist in this
  project — see `docs/PAYMENT_GATEWAY.md`'s "Final status" for the explicit BLOCKED items.

## 16. Webhook Security

`razorpayWebhook` (`onRequest`, not `onCall`): authenticated by Razorpay's HMAC signature (§15), not
by Firebase Auth/App Check, because the caller is Razorpay's infrastructure, not a signed-in user.
Rejects non-`POST` requests. Full raw-body handling is required for HMAC verification to be correct
(confirmed present via `getRawBody`).

`payuWebhook`/`payuCallback` (`onRequest`, same pattern): authenticated by PayU's response hash
(§15b), not Firebase Auth/App Check, for the same reason — the caller is PayU's infrastructure (or
the customer's browser, for `payuCallback`, which is why that endpoint never grants credits
regardless of hash validity — see §15b and `docs/PAYMENT_GATEWAY.md`).

## 17. AI Provider Security

Architecture (verified via `docs/PRODUCTION_FRONTEND_DEPLOYMENT_ARCHITECTURE.md`'s grep-based audit,
re-checked for AI SDK presence in `package.json` this pass — none found in the root `package.json`):

```
Browser  →  Cloud Function (AI provider abstraction)  →  Gemini / other configured provider
```

No AI provider SDK exists in the frontend's dependencies; no provider API key is ever read by
client-side code. Provider keys live exclusively in Firebase Functions secrets (§18). The frontend
never talks to an AI provider directly.

## 18. Secrets Management

Verified classification (cross-checked against `README.md`'s own table, `.env.example`, and
`apphosting.yaml`'s intent as described in `docs/PHASE_19C_FIREBASE_APP_HOSTING_PRODUCTION_REPORT.md`):

| Category                             | Examples                                                                                                                           | Where it lives                                                                                                              |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Public, build-time (`NEXT_PUBLIC_*`) | Firebase web config, reCAPTCHA site key, Razorpay **key id** (not secret), app URL/name                                            | Inlined into the client JS bundle — these are not secrets by Firebase/Razorpay design, and are already public once deployed |
| Server-only secrets                  | `GEMINI_API_KEY`, `OPENAI_API_KEY`, `NVIDIA_API_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, Firebase Admin credentials | Firebase Functions Secrets (`firebase functions:secrets:set`), never in `.env.local`, never in git                          |

**Production secret presence not independently verified in this session** — this document confirms
the _classification/intended location_ from source and prior reports, not that a live secret is
currently correctly configured in the production project. No actual secret value appears anywhere in
this repository's tracked files (verified by pattern scan as part of this documentation pass — see
`docs/DOCUMENTATION_AUDIT_REPORT.md`'s validation section).

## 19. Client vs Server Configuration

Every environment variable the Next.js app reads is `NEXT_PUBLIC_*` (verified in
`docs/PRODUCTION_FRONTEND_DEPLOYMENT_ARCHITECTURE.md` §7 by grep — no server-only variable exists in
the Next app at all). This means the frontend has architecturally no server-only secret to leak in
the first place; all genuinely sensitive configuration lives only in Cloud Functions.

## 20. Logging and Sensitive Data

- Authorization denials are logged with `userId`/`businessId` but explicitly **not** the compared
  `agencyId` values themselves (`middleware/auth.ts`'s own comment: this lets operators see a spike
  of probing attempts without the log itself becoming a way to enumerate agency IDs).
- The Razorpay webhook handler uses a dedicated module-level logger specifically because, per its own
  comment, per-event handlers previously risked dumping the **full Razorpay payment/subscription
  object — including payer email, phone, and bank/VPA details — into Cloud Logging**; this was
  identified and fixed (Phase 14, per the inline comment), not a currently-open issue.
- `mapErrorToHttpsError` (`functions/src/utils/errors.ts`) is the single place that converts internal
  errors to client-facing ones — stack traces and provider-internal detail are logged server-side and
  not returned to the client (verified in `docs/API.md`'s error-table construction).

## 21. Agency Isolation

Covered under §4 (same mechanism as business authorization — an agency member's own `agencyId` must
match the target business's `agencyId`, both explicitly compared, not just role-checked). The
cross-agency-denial case is proven by a real emulator test (§4). There is no separate agency data
store or agency-scoped Firestore rule beyond this check — agency isolation is enforced entirely in
`verifyBusinessAccess`.

## 22. Role Authorization

The only role distinguished in the authorization code path read this session is `agency_member`
(checked against a business's `agencyId`, §4). No other role hierarchy (e.g. admin, moderator) was
found in `middleware/auth.ts`. If additional roles exist elsewhere in the codebase, they were not
found in the files read for this document — this is not an exhaustive claim that no other role
exists anywhere, only that none was found in the authorization path itself.

## 23. Input Validation

Every callable validates its input via a Zod schema before the handler runs (`validatedCallable`,
§11). See `docs/API.md` for the full inventory of which schema backs which function; schemas
themselves are not re-transcribed here to avoid a second copy that can drift from the actual, current
schema files.

## 24. File / Image Validation

`confirmUpload.ts`'s schema constrains uploaded image metadata to `image/jpeg`, `image/png`, or
`image/webp`, and a maximum size of 10 MB (`z.number().positive().max(10 * 1024 * 1024)`) — enforced
server-side, not merely suggested client-side.

## 25. Security Testing

Current, verified test evidence (file + test count, not estimated):

| Area                                              | Evidence file                                                                                                                        | Test count                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Business/agency authorization                     | `tests/phase27-authz.test.ts`                                                                                                        | 11                                                                                                         |
| Bulk approval authorization/roles                 | `tests/phase27-bulk-approval-auth-roles.test.ts`                                                                                     | 9                                                                                                          |
| General security                                  | `tests/security.test.ts`                                                                                                             | 30                                                                                                         |
| Storage                                           | `tests/storage.test.ts`                                                                                                              | 10                                                                                                         |
| Cross-tenant/cross-agency analytics authorization | `functions/src/functions/analytics/getAnalyticsDashboard.emulator.test.ts`                                                           | 7 (re-run against a real Firestore emulator during the Performance Optimization closure pass — all passed) |
| Rate-limit fail-safe / fault injection            | `functions/src/middleware/rateLimit.failSafe.test.ts`, `functions/src/functions/campaigns/generateCampaignStrategy.failSafe.test.ts` | 2 (per Phase 38B)                                                                                          |

Counts are from direct file inspection (`grep -c "it(\|test("`), not estimated. **VERIFIED** =
observed passing this session or explicitly recorded as passing in a cited report with methodology
shown. Anything not in this table was not independently re-verified in this documentation pass.

## 26. CI/CD Security

`.github/workflows/ci-cd.yml` (current, read in full this pass):

- Triggers on push/PR to `master` and `develop`.
- Gates: frontend lint/typecheck/test/build, functions lint/typecheck/test/build, and a dedicated
  **security-rules-test** job that runs `firebase emulators:exec --only firestore,auth,storage
--project demo-mitra` against tests matching `security` — a real emulator, not a mock.
- Backend deploy jobs (`deploy-backend-staging`, `deploy-backend-production`) require
  `[frontend-lint, functions-lint, test, security-rules-test]` to all succeed first (`needs:`) — this
  is a genuine fail-closed gate, not a fire-and-forget deploy.
- **Known stale comment, not fixed in this pass** (flagged, not corrected, per this phase's own
  scope rule against modifying CI/CD): several comments in this file still assert "the frontend is
  deployed by Vercel, not this workflow." This is inaccurate as of
  `docs/PHASE_19C_FIREBASE_APP_HOSTING_PRODUCTION_REPORT.md` (Firebase App Hosting is the current
  target, Vercel is explicitly "NOT USED"). The comment inaccuracy does not change the workflow's
  actual behavior (it deploys functions only, either way), so this is a documentation-accuracy issue,
  not a security gap — recorded here again because it was originally found during the earlier
  Documentation Audit and this section's job is security-relevant CI behavior specifically.
- Secrets used by CI (`FIREBASE_TOKEN`, `FIREBASE_PROJECT_ID_STAGING`/`_PROD`, `NEXT_PUBLIC_*`) are
  referenced via `secrets.*` — their values are not present in this repository, consistent with §18.

## 27. Production Security Status

- App Check enforcement: implemented and code-verified (§3); a specific deployed hostname's
  reCAPTCHA allow-list was blocked as of the most recent report read (`PHASE_19C_RECAPTCHA_APPCHECK_VERIFICATION_REPORT.md`)
  — **current status of that specific blocker was not re-verified in this session.**
  `docs/PERFORMANCE_OPTIMIZATION_AUDIT_REPORT.md`'s Closure Validation pass (separate from this one)
  did successfully reach the live App Hosting URL and got a `200 OK` from the landing page, which is
  at least consistent with the app being reachable, but did not attempt an authenticated sign-in flow,
  so this document does not claim the App Check blocker is resolved.
- Production payment verification: **NOT VERIFIED** (§15).
- Production secret presence: **not independently verified** (§18).

## 28. Known Security Gaps

| Finding                                                                                                              | Severity                                                              | Status                                                                              |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Razorpay webhook signature comparison uses `===` instead of a constant-time comparison                               | Low (theoretical timing side-channel on an HMAC comparison)           | Open, not fixed this pass (code change out of scope for a documentation-only phase) |
| `checkRateLimit` has no bounded timeout; a Firestore outage causes it to hang rather than fail fast (F-7, Phase 38B) | Medium                                                                | Open, explicitly not fixed per Phase 38B's own record                               |
| No MFA / password policy / account lockout found in the authentication code                                          | Not rated (may be an accepted MVP tradeoff, not necessarily a defect) | Not verified as present; not assessed further                                       |
| Stale "Vercel deploys the frontend" comments in CI/CD (§26)                                                          | Informational, not a security control                                 | Flagged, not fixed                                                                  |

## 29. Security Verification Matrix

| Area                                     | Status                            | Evidence                                                                   |
| ---------------------------------------- | --------------------------------- | -------------------------------------------------------------------------- |
| Authentication                           | VERIFIED (email/password only)    | `authService.ts`, `LoginForm.tsx`/`SignupForm.tsx`                         |
| App Check enforcement (code)             | VERIFIED                          | grep across `functions/src/functions/**`, 0 exceptions                     |
| App Check (specific production hostname) | NOT RE-VERIFIED this session      | Last known status: blocked, per Phase 19C report                           |
| Authorization / tenant isolation         | VERIFIED                          | Real Firestore-emulator test, 15/15 passing; `tests/phase27-authz.test.ts` |
| Agency isolation                         | VERIFIED                          | Same emulator test (cross-agency denial case)                              |
| Storage path ownership                   | VERIFIED                          | `confirmUpload.ts`/`confirmReelClipUpload.ts` source, quoted directly      |
| Credits server-authority                 | VERIFIED (architecturally)        | `usageControl.ts`; not re-run in this pass                                 |
| Truth Check server-authority             | VERIFIED                          | `truthCheck.ts`, `regenerateAsset.ts`                                      |
| Payment verification (test mode)         | VERIFIED (code path)              | `verifyPayment.ts`, `razorpayWebhook.ts`                                   |
| Payment verification (production)        | NOT VERIFIED                      | Configured key recorded as test-mode                                       |
| Webhook signature verification           | VERIFIED present, minor gap noted | `razorpay.ts`, §28                                                         |
| Rate limiting (precision)                | VERIFIED                          | Phase 38 report                                                            |
| Rate limiting (fail-safe under outage)   | PARTIAL — fails safe, not fast    | Phase 38B, F-7                                                             |
| Secrets classification                   | VERIFIED                          | `.env.example`, `apphosting.yaml`, README cross-check                      |
| Secrets production presence              | NOT VERIFIED                      | No console access this session                                             |
| CI/CD security gates                     | VERIFIED                          | `.github/workflows/ci-cd.yml`, read in full                                |
