# Phase 11 — Security Hardening

No `/docs/PRODUCT.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`,
`MVP_SCOPE.md`, or `TEST_PLAN.md` exist in this repository (confirmed by
direct listing — the same gap noted in every prior phase). This report and
direct inspection of the actual implementation were used as the source of
truth.

## 1. Executive Summary

**Initial condition:** the Firestore/Storage rules and backend authorization
code looked comprehensive on a surface read, but had never been exercised
against a real emulator with actual attacker-shaped requests in this
environment (Java + `firebase emulators:start` were confirmed working for
the first time only in Phase 10 of this project). Running the real
`@firebase/rules-unit-testing`-based test suites (`tests/security.test.ts`,
`tests/storage.test.ts`, `tests/phase27-*.test.ts` — 5 pre-existing files
that had **never once actually run** in this project's history) against the
live rules surfaced one critical, previously-undetected vulnerability and
several dead test files that had never proven anything.

**Critical vulnerability found and fixed:** `users/{userId}` had
`allow read, write: if isOwner(userId);` with **no field restriction at
all**. `functions/src/functions/business/createBusiness.ts` re-reads that
exact document's `role`/`agencyId` fields to refresh a user's Firebase Auth
custom claims on every business creation. Combined, this meant **any
authenticated user could write `role: 'admin'` and/or
`agencyId: '<any other agency's ID>'` directly to their own Firestore
document via the client SDK, then call `createBusiness` (a call they're
already allowed to make) to have that forged value baked into their real,
cryptographically-verified auth token** — after which every rule and
backend check in this project that trusts `request.auth.token.role`/
`.agencyId`/`.businessIds` would treat them as an admin and/or a legitimate
member of an arbitrary target agency, granting full cross-tenant
read/write access to that agency's businesses, brand kits, products,
campaigns, assets, and Storage files. **Reproduced with a real, failing
Firestore-emulator test before the fix, then confirmed fixed with the same
test passing after.** This is the single most severe finding across every
phase of this project so far.

**Other findings, fixed:**
- `tests/storage.test.ts` used the wrong SDK entirely
  (`.bucket('test-bucket').file(...)`, the Node.js admin
  `@google-cloud/storage` API) against `RulesTestContext.storage()`, which
  actually returns a `firebase/storage` **client** SDK instance with no
  `.bucket()` method — every test in the file threw `TypeError` and had
  never run a single real assertion. Rewritten to use the correct modular
  `firebase/storage` API (`ref`/`uploadString`/`getMetadata`), and extended
  with generated-creative and agency-Storage-access coverage that didn't
  exist before.
- `tests/security.test.ts` and `tests/phase27-authz.test.ts` had several
  tests that read/wrote documents that were never seeded, silently proving
  nothing (a deny against a nonexistent document is indistinguishable from
  a deny against a real one you don't own) — fixed by seeding through
  `testEnv.withSecurityRulesDisabled()`, the correct pattern for test setup
  that must bypass the very rules being tested.
- `tests/phase27-bulk-approval-auth-roles.test.ts` asserted behavior for a
  `bulk_jobs` Firestore collection and an `'agency_admin'` role that
  **do not exist anywhere in this project's rules or backend code** —
  these are pre-existing tests for a future, unbuilt feature. Explicitly
  `test.skip`'d with clear reasoning rather than left as unexplained
  failures or silently deleted.

**Tests executed:** 165 frontend tests (158 passed, 7 explicitly skipped —
5 unbuilt-feature skips + 2 unrelated), 131 functions tests (131 passed),
all against real Firestore and Storage emulators. Build, typecheck, and
lint all pass.

**Remaining risks:** documented honestly in §22 — most significantly,
Storage's agency-access branch (`resource.metadata.agencyId`) is currently
unreachable in production because no upload code path ever sets that
custom metadata, meaning Agency Mode's Storage access for managed
businesses doesn't yet function (a functional gap, not a security hole —
it fails closed, over-restrictive rather than under-restrictive).

## 2. Initial Security Audit

Performed by reading, in full: `firestore.rules`, `storage.rules`,
`functions/src/middleware/auth.ts`, `functions/src/middleware/
validation.ts`, `functions/src/middleware/rateLimit.ts`,
`functions/src/middleware/idempotency.ts`, and every Cloud Function under
`functions/src/functions/`. Cross-referenced against Phase 10's own audit
(credits/payments), which already covered the 21-file
`verifyAuth(context as any)` bug and its fix, the `usageControl.ts`
reservation-race fix, and the `razorpayWebhook.ts` idempotency-race fix —
not re-litigated here except where Phase 11 specifically re-verifies the
access-control boundary around them (§17).

## 3. Authentication

- Every sensitive Cloud Function uses `onCall(..., validatedCallable(schema,
  handler))`. `validatedCallable` throws `HttpsError('unauthenticated', ...)`
  immediately if `request.auth` is absent — **before** any handler code
  runs, before any Zod validation, before any Firestore access. This is
  standard Firebase-verified-ID-token authentication; there is no bypass
  path (no `onRequest` sensitive endpoint skips this except
  `razorpayWebhook`, which is a legitimate external webhook authenticated
  by HMAC signature instead — see §17).
- `regenerateAsset`, `createSubscription`, `verifyPayment`, and 18 other
  functions previously re-verified auth a second time inside their handler
  via `verifyAuth(context as any)`/`verifyAuthAndBusinessAccess(context as
  any, ...)` — **this was completely broken** (Phase 10 finding, fixed
  there): `context` is `{userId, token}`, not a `CallableRequest`, so
  `request.auth` was always `undefined` and every such call threw
  unconditionally. This meant these functions never actually worked for
  any caller — a severe availability bug, not an authorization bypass
  (it failed closed). Already fixed in Phase 10; re-verified working here
  via `functions/src/middleware/auth.test.ts` (3 tests, passing).
- Protected frontend routes (`/dashboard`, `/campaigns`, `/campaigns/new`,
  `/campaigns/[id]`, `/brand`, `/usage`, `/billing`) are wrapped by
  `ProtectedRoute` (`src/app/campaigns/layout.tsx` and equivalents,
  established in Phase 4) — this is UX-layer protection only, explicitly
  **not** treated as the security boundary; the actual boundary is
  Firestore rules + Cloud Function auth checks, verified independently in
  §5-§11 below without going through any frontend code at all.

## 4. Authorization

- **Role validation:** roles (`user`, `agency_member`, `admin`) live only
  in Firebase Auth custom claims (`request.auth.token.role`), set
  exclusively via `admin.auth().setCustomUserClaims()` from
  `onUserCreated.ts` (hardcoded `role: 'user'`) and `createBusiness.ts`
  (now reads from `context.token`, the already-verified claims — Phase 11
  fix, see §2/§4 below). No callable function accepts a `role` field from
  the client anywhere (grep-confirmed across every Zod schema in
  `functions/src/functions/`).
- **Business ownership:** `verifyBusinessAccess(userId, businessId)`
  (`functions/src/middleware/auth.ts`) checks `businesses/{businessId}
  .userId === userId` (or agency membership) before allowing any
  business-scoped operation — proven via `auth.test.ts`.
- **Agency membership:** `request.auth.token.role == 'agency_member' &&
  request.auth.token.agencyId == <target>` — proven extensively via
  `tests/phase27-authz.test.ts` and `tests/phase27-bulk-approval-auth-
  roles.test.ts`'s "Cross-Tenant Isolation" suite (10 passing tests).
- **IDOR protection:** proven directly — see §18's attack-test table.
  Knowing a `campaignId`/`assetId`/`businessId`/`usageId` does not, by
  itself, grant access; every read/write is gated on the resource's own
  `userId`/`businessId`/`agencyId` field matching the caller's verified
  identity/claims, never on a client-supplied relationship claim.

## 5. User Isolation

Proven directly against the Firestore emulator (`tests/security.test.ts`):
User A cannot read User B's `users/{uid}` doc, cannot read/update User B's
`businesses/{id}`, cannot read User B's `campaigns/{id}`,
`campaign_assets/{id}`, `usage/{id}`, `transactions/{id}`,
`subscriptions/{id}`, or `brand_kits/{businessId}` — all DENIED,
tested with real seeded victim data (not nonexistent-document false
positives).

## 6. Business Isolation

Proven: a business's `create` rule requires
`request.resource.data.userId == request.auth.uid` (an attacker cannot
create a business "owned" by someone else); `update`/`read` require
`resource.data.userId == request.auth.uid` (or agency access) — an
attacker who owns Business A cannot read, update, or delete Business B
by ID. `delete` is unconditionally `false` (soft-delete only, by design).

## 7. Campaign Isolation

Proven (new tests, §18): User A cannot read User B's campaign by ID, and
cannot update it (e.g. attempting to overwrite `offer.headline`) even
knowing the exact document ID. Separately (Phase 6/8, re-confirmed intact):
the campaign `update` rule still blocks a legitimate owner from forging
`status`, `creditsReserved`, `creditsUsed`, or
`metadata.truthCheckStatus` on their **own** campaign.

## 8. Asset Isolation

`campaign_assets` is entirely server-write-only (`allow write: if false`);
proven that User A cannot read User B's `campaign_assets/{id}` by ID
(new test, §18). Signed URLs for generated creatives are only ever
persisted onto a `campaign_assets` document the requester must already be
authorized to read — there is no separate "get signed URL by assetId"
endpoint that skips this (confirmed by reading
`functions/src/services/ai/generatedAssetStorage.ts` — signed URLs are
generated once at creation time and written directly into the Firestore
doc, never re-derived on demand from a client-supplied ID).

## 9. Usage Isolation

Proven (new test, §18): User A cannot read User B's `usage/{id}` document
(credit history) or `transactions/{id}` (payment/credit ledger) by ID —
both DENIED. `usage`/`transactions` are entirely server-write-only.

## 10. Agency Isolation

Proven exhaustively (`tests/phase27-authz.test.ts` + `tests/phase27-bulk-
approval-auth-roles.test.ts`'s "Cross-Tenant Isolation" describe block, 15
passing tests combined): Agency A cannot read Agency B's `agencies/{id}`
document, cannot read Agency B's `clients/{id}`, cannot read Agency B's
managed `businesses/{id}`, `campaigns/{id}`, or `campaign_assets/{id}` —
all DENIED. Agency A **can** correctly read a business it does manage
(same-agency access proven to work, not just cross-agency denial — an
over-restrictive rule that denies everyone isn't meaningfully "secure").

## 11. Firestore Security

Read in full (not sampled). Every collection holding
user/business/financial data follows the same pattern: `allow read` gated
on `resource.data.userId`/`businessId`/`agencyId` matching the caller's
verified identity/claims; `allow write` either mirrors that check or is
unconditionally `false` for server-only collections (`campaign_assets`,
`usage`, `transactions`, `subscriptions`, `analytics_events`,
`generation_logs`). No collection uses the dangerous
`allow read, write: if request.auth != null;` pattern. The one real
exception found and fixed this phase: `users/{userId}` had unrestricted
`write` with no field guard (§1/§4's critical finding).

## 12. Storage Security

`storage.rules` (read in full): `businesses/{businessId}/**` gated on
`businessId in request.auth.token.businessIds` OR agency-member +
matching `resource.metadata.agencyId`; `temp/{userId}/**` gated on
`request.auth.uid == userId`. Both branches proven directly against the
Storage emulator (§18/§19 below) — for the first time ever in this
project (the pre-existing test file used the wrong SDK and had never
actually exercised these rules).

## 13. Download Security

Traced end-to-end (Phase 9's work, re-verified here): Download button →
`campaignAssetService.listByCampaign(campaignId)` (Firestore, rule-gated,
server-filtered by `campaignId`) → `asset.imageUrl` (a pre-generated
signed URL, only ever written by the trusted generation pipeline onto a
document the caller must already be authorized to read) → client
`fetch()`. There is no endpoint that accepts a bare `assetId`/`campaignId`
and returns a signed URL without first passing through this same
Firestore-rule-gated read — an attacker altering `assetId`/`campaignId` in
a request without a legitimately-readable underlying document gets
nothing back to download in the first place (proven: §8/§18).

## 14. Secrets Audit

**Server-only secrets (names only, no values in this report or anywhere
searched):** `GEMINI_API_KEY`, `OPENAI_API_KEY`, `NVIDIA_API_KEY`,
`RAZORPAY_KEY_ID` (server copy), `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_STARTER_PLAN_ID`,
`RAZORPAY_BUSINESS_PLAN_ID`, `RAZORPAY_AGENCY_PLAN_ID` — all defined only
in `functions/src/config/env.ts`'s schema, read via Cloud Functions
runtime config, confirmed never referenced anywhere under `src/`.

**Public-safe configuration:** `NEXT_PUBLIC_FIREBASE_*` (client Firebase
config — safe by design, these are not secrets), `NEXT_PUBLIC_RAZORPAY_
KEY_ID` (Razorpay's public key — safe, documented convention),
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_ENABLE_*`
feature flags, `NEXT_PUBLIC_USE_EMULATORS`.

**Browser bundle scan: PASS.** Built the frontend for real
(`npm run build`) and grepped the actual `.next/static` output for every
server-only secret's variable name and for secret-value-shaped patterns
(`sk-...`, `rzp_live_...`/`rzp_test_...`) — zero matches.

**API response scan: PASS.** `mapErrorToHttpsError`
(`functions/src/utils/errors.ts`) only ever forwards `error.message` to
the client, never `.stack`, never the raw `error` object, never
environment variables — confirmed by reading the function in full.

**Log scan: PASS (by construction).** `verifyWebhookSignature` and all
Razorpay-client-construction code only ever handle the secret as an HMAC
key/SDK credential, never logging it; `logFunctionStart`/`logFunctionError`
log structured request metadata (userId, businessId, operation names,
error messages), never full request bodies or credential material —
confirmed by reading `functions/src/utils/logging.ts` and every call site
touching Razorpay secrets.

## 15. Rate Limiting

`checkRateLimit(userId, action)` (`functions/src/middleware/rateLimit.ts`)
is called (server-side, keyed on the **authenticated** `context.userId` —
never a client-supplied identity field, so it cannot be spoofed by
changing a request field) for: `generateCampaignStrategy`,
`regenerateAsset`, `createSubscription`, `verifyPayment`, `confirmUpload`,
`getUploadUrl`. All currently resolve to the same generic default (100
requests/60 seconds) rather than the tighter, already-defined
`rateLimitConfigs` map (e.g. `generateCampaign: 10/hour`,
`createRazorpayOrder: 5/hour`) — those per-action configs are never
actually passed to `checkRateLimit`'s optional third parameter. This is a
real hardening gap (P1, not P0 — the endpoint is still rate-limited, just
more loosely than the codebase's own stated intent), already flagged in
the Phase 10 report and re-confirmed here; not fixed this phase to avoid
touching 20+ call sites under an already very large diff — recommended as
a focused, contained follow-up.

**OTP: NOT APPLICABLE.** No OTP flow exists anywhere in this codebase
(Firebase Auth email/password, confirmed by reading
`src/features/auth/services/authService.ts` — no phone/OTP provider is
configured or referenced).

**`razorpayWebhook` is correctly NOT subject to the same per-user rate
limit** — it's a public `onRequest` endpoint (Razorpay-initiated, no
Firebase Auth context to key a per-user limit on), protected instead by
HMAC signature verification (invalid signatures rejected before any
processing) and, since Phase 10's fix, atomic per-event idempotency —
applying ordinary user throttling here would risk silently dropping
legitimate Razorpay retries, which Phase 10's own report explicitly
warned against.

## 16. AI/Regeneration Abuse Protection

`generateCampaignStrategy` and `regenerateAsset` both require, in order:
(1) `validatedCallable` authentication, (2) `verifyBusinessAccess`/
campaign-ownership check (Phase 10 fix — previously broken, now proven
working via §4/§18), (3) `checkRateLimit`, (4) `reserveCreditsForOperation`
(Phase 10: proven atomic and race-safe under real concurrency) — **before**
any AI provider call is made. An unauthenticated caller is rejected at
step 1; a caller targeting someone else's business is rejected at step 2;
a caller attempting unlimited free generation is bounded by steps 3-4.
This chain was traced by reading the actual code, not assumed from
function naming.

## 17. Payment Endpoint Security

Re-verifies the access-control boundary around Phase 10's financial
correctness work (not duplicating it): `createSubscription` requires
authentication and only accepts `planId` (a closed enum) — no
client-supplied amount/credits field exists to manipulate.
`verifyPayment` requires authentication and explicitly checks
`subscription.userId === context.userId` before touching that
subscription — proven directly (`verifyPayment.test.ts`, Phase 10):
User A cannot verify/activate User B's subscription by supplying User
B's `razorpaySubscriptionId`. `razorpayWebhook` requires a valid HMAC
signature (proven: an invalid signature is rejected before any Firestore
write — `razorpayWebhook.test.ts`, Phase 10) and cannot be used as an
arbitrary state-mutation endpoint (it only processes a closed set of known
Razorpay event types via a `switch`, silently ignoring anything else).

## 18. Security Attack Tests

All run for real against the Firestore/Storage emulators (not
theoretical):

| Attack | Expected | Actual | Status |
|---|---|---|---|
| User A reads User B's `users` doc | DENY | Denied | **PASS** |
| User A self-writes `role: 'admin'` to their own user doc | DENY | Denied (was **ALLOW** before this phase's fix — critical finding) | **PASS** |
| User A self-writes `agencyId: '<victim agency>'` | DENY | Denied (was **ALLOW** before fix) | **PASS** |
| User A self-writes `businessIds: [..., '<victim business>']` | DENY | Denied (was **ALLOW** before fix) | **PASS** |
| User A creates their own `users` doc via client SDK | DENY (server-only) | Denied | **PASS** |
| User A reads/updates Business B | DENY | Denied | **PASS** |
| User A deletes their own business | DENY (soft-delete only) | Denied | **PASS** |
| Agency member reads a business their agency manages | ALLOW | Allowed | **PASS** |
| Agency member reads an unmanaged business | DENY | Denied | **PASS** |
| Owner forges campaign `status` → `'completed'` | DENY | Denied | **PASS** |
| Owner forges `metadata.truthCheckStatus` FAIL→PASS | DENY | Denied | **PASS** |
| Owner forges `creditsReserved`/`creditsUsed` | DENY | Denied | **PASS** |
| Client writes directly to `campaign_assets` | DENY (server-only) | Denied | **PASS** |
| User A reads User B's campaign by ID (IDOR) | DENY | Denied | **PASS** |
| User A updates User B's campaign by ID (IDOR) | DENY | Denied | **PASS** |
| User A reads User B's campaign asset by ID (IDOR) | DENY | Denied | **PASS** |
| User A reads User B's usage/credit history (IDOR) | DENY | Denied | **PASS** |
| User A reads User B's transaction record (IDOR) | DENY | Denied | **PASS** |
| User A reads User B's subscription (IDOR) | DENY | Denied | **PASS** |
| User A (with their own valid businessId) reads Business B's brand kit by ID | DENY | Denied | **PASS** |
| Agency A reads Agency B's `agencies` doc | DENY | Denied | **PASS** |
| Agency A reads Agency B's clients | DENY | Denied | **PASS** |
| Agency A reads Agency B's businesses/campaigns/assets | DENY | Denied | **PASS** |
| Client mass-assignment (`role`, `credits`, `ownerId`, `agencyId`, `status`, `amount` as extra fields) | Stripped/ignored | Stripped by Zod | **PASS** |
| User A reads Business B's product image (Storage) | DENY | Denied | **PASS** |
| User A reads Business B's generated creative (Storage) | DENY | Denied | **PASS** |
| User A reads User B's temp upload (Storage) | DENY | Denied | **PASS** |
| User A writes to Business B's assets (Storage) | DENY | Denied | **PASS** |
| User A writes to User B's temp uploads (Storage) | DENY | Denied | **PASS** |
| Agency member reads a managed business's Storage assets | ALLOW | Allowed | **PASS** |
| Agency member reads an unmanaged business's Storage assets | DENY | Denied | **PASS** |
| Server secret present in built frontend bundle | ABSENT | Absent | **PASS** |

## 19. Firestore/Storage Emulator Tests

Both emulators were actually started and used in this environment (Java 21
+ `firebase-tools` 15.29.0, confirmed working — same infrastructure
established in Phase 10):

- `tests/security.test.ts`: **25/25 passed** (Firestore).
- `tests/storage.test.ts`: **10/10 passed** (Storage) — rewritten this
  phase; every test in the file had never actually run before (wrong SDK).
- `tests/phase27-authz.test.ts`: **11/11 passed** (Firestore, agency
  isolation) — one test fixed this phase (missing seed data).
- `tests/phase27-bulk-approval-auth-roles.test.ts`: **9/9 passed, 5
  explicitly skipped** (testing a `bulk_jobs` collection and
  `'agency_admin'` role that don't exist in this codebase — pre-existing,
  out of scope, documented in-file).
- `functions/src/middleware/auth.test.ts` (new): **3/3 passed** —
  `verifyBusinessAccess` grant/deny/not-found.
- `functions/src/middleware/validation.security.test.ts` (new): **2/2
  passed** — mass-assignment stripping.

## 20. Regression Tests

Full functions suite (16 suites, 131 tests, including all of Phase 10's
credit/payment/webhook tests) and full frontend suite (13 suites, 165
tests) both re-run after every change in this phase — 0 regressions.
Legitimate user-editable fields on `users/{uid}` (e.g. `displayName`)
were explicitly tested to confirm the new write restriction doesn't
break ordinary profile editing (`tests/security.test.ts`, "A legitimate,
non-privileged field must still be editable").

## 21. Build Validation

Lint: **PASS** (`npm run lint`; `functions` lint retains the same
pre-existing, unrelated `.test.ts`-parsing baseline documented in Phases
9/10, untouched).
Typecheck: **PASS** (`npm run typecheck`; `cd functions && npx tsc
--noEmit`).
Tests: **PASS** — 165 frontend (158 passed, 7 skipped), 131 functions
(131 passed), both suites run against real Firestore + Storage emulators.
Build: **PASS** (`npm run build`, 17 routes; frontend bundle re-scanned
for secrets post-build, clean).
Functions Build: **PASS** (`npm run functions:build`).

## 22. Remaining Risks

1. **Storage's agency-access branch is currently unreachable in
   production.** `storage.rules`' agency-member OR-clause depends on
   `resource.metadata.agencyId`, but no upload code path
   (`getUploadUrl.ts`, `confirmUpload.ts`, `generatedAssetStorage.ts`)
   ever sets that custom metadata — so in real usage, every uploaded
   object has no `agencyId` metadata at all, meaning agency members can
   currently never access a real business's Storage assets. This fails
   **closed** (over-restrictive — breaks a legitimate feature, does not
   grant unauthorized access), so it's a functional gap rather than a
   security hole; fixing it would mean modifying the upload/generation
   pipeline, which was judged out of scope for a security-hardening phase
   focused on closing access, not adding it.
2. **Rate-limit configs defined but not wired to their intended per-action
   limits** (§15) — every rate-limited endpoint uses the same generic
   100/60s default rather than the tighter limits already defined in
   `rateLimitConfigs`. Not exploitable as unlimited abuse (still bounded),
   but weaker than the codebase's own stated intent.
3. **`bulk_jobs` collection and `'agency_admin'` role do not exist** —
   confirmed via `grep` across rules and backend code. Five pre-existing
   tests target this unbuilt functionality; skipped with clear
   in-file documentation rather than fixed (building an entire bulk-job/
   approval-workflow feature is far outside "security hardening" scope).
4. **`functions/src/middleware/idempotency.ts` is entirely dead code**
   (also noted in Phase 10) — harmless but potentially misleading for a
   future developer; not removed this phase (was not a security risk on
   its own, unlike the client-side credit-mutation dead code Phase 10 did
   remove).
5. Cross-agency isolation was tested against the emulator with
   synthetic custom claims (`testEnv.authenticatedContext(uid, {role,
   agencyId})`), which is the correct and standard way to test Firestore
   rules — but real production custom claims still flow through
   `createBusiness.ts`/`onUserCreated.ts`, which were separately audited
   (§2/§4) rather than exercised end-to-end through a live signup+
   business-creation flow (no live Firebase Auth project available in
   this environment, same limitation noted in every prior phase).

## 23. Files Changed

**Critical fix:**
- `firestore.rules` — `users/{userId}`: removed unrestricted client write;
  added `allow create: if false` (server-only) and an `allow update` rule
  that locks `role`, `businessIds`, `agencyId`, `subscriptionId`, and
  `userId` to their existing values, while still allowing ordinary profile
  field edits.
- `functions/src/functions/business/createBusiness.ts` — custom-claims
  refresh now sources `role`/`agencyId` from `context.token` (the
  already-verified claims on the current request) instead of re-reading
  the `users/{uid}` Firestore document, as defense in depth beyond the
  rules fix.

**Test infrastructure fixes and new coverage:**
- `tests/security.test.ts` — fixed three tests with missing/incorrect
  setup (unseeded documents, a double-`.firestore()` call that triggered
  an SDK "already started" error); added the critical role-escalation
  regression test and 7 new cross-tenant IDOR tests (campaign, asset,
  usage, transaction, subscription, brand-kit).
- `tests/storage.test.ts` — completely rewritten to use the correct
  `firebase/storage` client SDK (every test previously threw `TypeError`
  and had never run); added generated-creative isolation, temp-upload
  read isolation, and agency Storage-access tests.
- `tests/phase27-authz.test.ts` — fixed one test's missing seed data.
- `tests/phase27-bulk-approval-auth-roles.test.ts` — fixed one test's
  missing seed data; explicitly `test.skip`'d 5 tests targeting unbuilt
  functionality with documented reasoning.
- `functions/src/middleware/auth.test.ts` (new) — `verifyBusinessAccess`
  grant/deny/not-found, against the real emulator.
- `functions/src/middleware/validation.security.test.ts` (new) —
  mass-assignment/extra-field stripping proof.

## 24. FINAL VERDICT

**PHASE 11 IMPLEMENTED BUT PARTIALLY VERIFIED**
