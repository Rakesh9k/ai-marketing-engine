# Phase 10 — Credits + Payment Integrity

No `/docs/PRODUCT.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`,
`MVP_SCOPE.md`, or `TEST_PLAN.md` exist in this repository (confirmed by
direct listing — the same gap noted in every prior phase). This report and
the actual implementation were used as the source of truth.

## 1. Executive Summary

The credit reservation/finalization/refund state machine
(`functions/src/services/usageControl.ts`) and the Razorpay
webhook/payment-verification path were audited by reading the real
implementation and then **proving** (not assuming) its behavior with tests
run against a real Firestore emulator, for the first time in this project's
history (no prior phase had emulator access in this environment; this
session confirmed Java + `firebase emulators:start --only firestore` both
work here).

Three real, previously-undetected financial-integrity bugs were found and
fixed, and one dangerous dead-code path was removed:

1. **A double-reservation race** in `reserveCreditsForOperation` — the same
   `operationId` requested concurrently (a genuine duplicate-click/retry)
   could reserve credits twice (proven: 140 requested twice landed as 280
   consumed). Fixed by moving the idempotency check inside the atomic
   Firestore transaction.
2. **A double credit-grant race** in the Razorpay webhook handler — two
   near-simultaneous deliveries of the same webhook event (which Razorpay's
   own retry behavior can genuinely produce) could both pass the
   non-atomic "already processed?" check and both grant credits. Fixed
   with an atomic claim transaction.
3. **`regenerateAsset` was completely broken for any campaign's second
   regeneration** — its credit reservation was keyed by `campaignId` alone,
   so `finalizeReservation` permanently marking that reservation
   `'completed'` blocked every subsequent regeneration attempt for that
   campaign with `ALREADY_FINALIZED`, forever.
4. **A complete, dangerous, parallel client-side reimplementation** of the
   credit reservation/finalization/refund system existed in
   `src/services/database.ts`, using the client Firestore SDK. It was
   unreachable (Firestore rules deny all client writes to
   `usage`/`transactions`) and unused anywhere in the frontend, but
   represented exactly the "client must not grant itself credits" risk
   this phase asks to eliminate. Removed.

A fifth finding is, in scope and severity, **larger than everything else in
this report combined**: **every authenticated Cloud Function in this
project that re-verified auth/business-access inside its handler was
completely non-functional.** `verifyAuth(context as any)` and
`verifyAuthAndBusinessAccess(context as any, ...)` were called with
`context` shaped as `{ userId, token }` (the second argument
`validatedCallable` passes to a handler) instead of the `CallableRequest`
(`{ auth, data, ... }`) those functions actually require — so
`request.auth` was always `undefined` and every such call threw
`"Authentication required"`, unconditionally, for every caller, including a
legitimately authenticated one. This affected **21 files**, including
`generateCampaignStrategy` (the function that reserves credits for every
campaign), `regenerateAsset`, `createSubscription`, and `verifyPayment` —
meaning, as shipped before this phase, **no user could ever generate a
campaign, regenerate an asset, create a subscription, or verify a
payment**, regardless of how correct the underlying credit/payment logic
was. This was never caught in Phases 4-9 because none of them ever invoked
these callables through the full `onCall` pipeline with real
`CallableRequest` semantics (no Firebase project/credentials were available
in this environment until this phase's Firestore-emulator setup, and
browser testing in earlier phases used fixture data that never reached
these specific call sites). Fixed uniformly across all 21 files, verified
with new tests, and the fix pattern is unambiguous and low-risk (auth was
already verified one layer up).

## 2. Initial Audit

**Credit storage:** balance is **not stored directly** — it's computed as
`getMonthlyCredits(usage.planId) - usage.creditsUsed`
(`checkGenerationEligibility`), i.e. a static per-plan cap
(`PRICING.subscriptionTiers[planId].monthlyCredits`, from
`functions/src/config/pricing.ts`) minus a running-total field on the
user's current-calendar-month `usage/{userId}_{periodStart}` document.
`usage.creditsIncluded` and `subscription.creditsIncluded` are **separate,
informational fields that the actual eligibility check never reads** — see
§6 below; they matter for display only, not enforcement.

**Ledger:** `transactions/{operationId}` documents, one per
reservation/finalization/refund, with `type` (`reservation` | `deduction` |
`refund` | `subscription`), `amount`, `status` (`pending` | `completed` |
`refunded` | `failed`), `metadata`, `createdAt`. A refund creates a second
document `transactions/refund_{operationId}`, never mutates the original's
`amount`.

**Reservation identifier:** `operationId`, the Firestore document ID for
both the `transactions` doc and (implicitly) the credit hold. Before this
phase, `generateCampaignStrategy` correctly used a fresh server-generated
`campaignId` per call; `regenerateAsset` incorrectly reused `campaignId`
across every regeneration of that campaign (bug #3 above, fixed to use
`idempotencyKey`).

**Crash between reservation and finalization/refund:** see §5.

**Razorpay:** `createRazorpaySubscription`/`createRazorpayOrder`
(`functions/src/services/razorpay.ts`), `createSubscription` (creates the
Razorpay subscription + a Firestore `subscriptions` doc with
`status: 'incomplete'`), `verifyPayment` (client-callback path — fetches
the payment from Razorpay's API server-side and flips
`subscription.status` to `'active'`; **does not grant credits**),
`razorpayWebhook` (the actual credit-granting path — `payment.captured`,
`subscription.activated`, `subscription.charged` handlers).
`createRazorpayOrder` (a one-time top-up purchase primitive) exists but is
**never called anywhere** — there is no top-up purchase flow implemented.
Payment records live in `transactions` (Razorpay `payment.id` as the
Firestore doc ID — a stable, Razorpay-authoritative identifier, not a
client-generated one). Webhook-event dedup uses
`processed_webhook_events/{razorpayEventId}`.

## 3. Credit Architecture

- **Balance:** derived, not stored (§2).
- **Ledger:** `transactions` collection, one doc per state transition
  (§2/§6).
- **Reservation:** `reserveCreditsForOperation` — now fully atomic,
  including its idempotency check (fixed, see §4).
- **Finalization:** `finalizeReservation` — flips `status: 'pending' ->
  'completed'`; idempotent (repeat calls on an already-`completed`
  reservation are a no-op returning success); rejects finalizing a
  `refunded` reservation.
- **Refund:** `refundReservation` — atomically decrements
  `usage.creditsUsed` and flips the reservation to `'refunded'`; idempotent
  (repeat calls on an already-`refunded` reservation are a no-op); rejects
  refunding a `completed` reservation; verifies `transaction.userId ===
  userId` before refunding (cross-user protection).

## 4. Credit Invariants

- **Server authority:** the client can request an operation
  (`generateCampaignStrategy`, `regenerateAsset`) but never specifies a
  credit amount — `getGenerationCost(operationType)` (server-side,
  `pricing.ts`-driven) determines it. Confirmed no client-writable path to
  `usage.creditsUsed`/`transactions` exists: `firestore.rules` denies all
  client writes to both collections (`allow write: if false`), and the one
  parallel client-side implementation that could have written them was dead
  code, now removed (§1, finding 4).
- **Atomicity:** reservation, finalization, and refund each execute inside
  a single `db.runTransaction` (finalization/refund only touch one
  document each, which is atomic by definition even without an explicit
  transaction, but the code still routes through consistent read-then-write
  logic). **Proven, not assumed** — see §12's concurrency test results.
- **Idempotency:** proven for reservation (duplicate operationId),
  finalization (double-finalize), and refund (double-refund) — see §12.
- **Concurrency:** proven via the golden concurrency test (§12) — two
  reservations racing for the last 100 credits: exactly one succeeds.
- **Insufficient credits:** rejected before any generation work begins
  (`reserveCreditsForOperation` throws `INSUFFICIENT_CREDITS` before
  `executeWithUsageControl` ever calls the generation function) — proven in
  `usageControl.test.ts`'s pre-existing "insufficient credits genuinely
  blocks reservation" test, now actually run (§11).

## 5. Failure Recovery

`executeWithUsageControl` wraps reserve → generate → finalize, and on
**any** thrown error from the generation function (AI provider error,
timeout, Truth Check failure, pipeline exception — all compose the same
way, since it's a plain `catch`), calls `refundReservation` before
re-throwing the original error (the refund's own failure is logged, not
swallowed — the original error still propagates). Proven with real thrown
errors of different shapes in `usageControl.test.ts` (CASE 2/5, CASE 4).

**Crash between reservation and finalization/refund (process dies mid-
generation, no code runs at all):** there is **no reconciliation/sweep job**
for orphaned `'pending'` reservations. If the Cloud Function instance is
killed between a successful `reserveCreditsForOperation` and either
`finalizeReservation` or the `catch` block's `refundReservation`, the
reservation stays `'pending'` forever and that credit amount is
permanently unavailable to the user (not lost from a ledger-accounting
standpoint — it's still visible as a `'pending'` transaction — but
practically stuck: `checkGenerationEligibility` counts it against
`creditsUsed` forever, and no code path ever revisits a `'pending'`
transaction older than "now"). This is an honest, real, currently-
unmitigated risk — documented rather than invented a fake recovery system
for it (§19/§85 explicitly ask for honesty here over fabrication). Given
Cloud Functions' typical failure modes (timeout, OOM, deploy-time
restart) this is a real, non-hypothetical risk, not just a theoretical one.

## 6. Ledger Consistency

`usage.creditsUsed` is the only field the enforcement path
(`checkGenerationEligibility`) reads, and every mutation to it goes through
one of the three atomic functions above — so it stays internally
consistent by construction, proven under contention in §12.

**Known inconsistency, not a security issue:** `usage.creditsIncluded` and
`subscription.creditsIncluded` are separately, unconditionally incremented
by the webhook on every `payment.captured`/`subscription.charged` event
(and `subscription.creditsIncluded` specifically is never reset — it
accumulates across every renewal, so it does not represent "credits this
period," just a running lifetime total). Neither field is read by
`checkGenerationEligibility`. The **actual enforced credit cap** is always
`PRICING.subscriptionTiers[usage.planId].monthlyCredits`, a static
per-plan constant — so a duplicate webhook delivery (before this phase's
fix) inflated these two informational counters but **could not** have let
a user actually spend more credits than their plan allows. The dashboard
(`src/app/dashboard/page.tsx`, `src/app/usage/page.tsx`) displays
`subscription.creditsIncluded` as "of X credits this period," which will
show a growing, incorrect number over multiple renewals within a
subscription's lifetime. This is a real display bug, documented honestly
here rather than silently left unexplained; fixing it was judged out of
scope for this phase (it doesn't affect financial correctness, only a
displayed number, and reworking that field's semantics touches the
subscription lifecycle model beyond "credits + payment integrity" testing).

## 7. Razorpay Architecture

```
createSubscription (onCall)
  -> creates Razorpay customer + subscription (Razorpay API, server secret)
  -> creates subscriptions/{razorpaySubscriptionId} doc, status: 'incomplete'

verifyPayment (onCall, client-callback path)
  -> fetches the payment from Razorpay's API directly (server secret)
  -> requires payment.status === 'captured'
  -> flips subscriptions/{id}.status -> 'active'
  -> does NOT grant credits

razorpayWebhook (onRequest, Razorpay-initiated)
  -> verifies HMAC-SHA256 signature (raw body + RAZORPAY_WEBHOOK_SECRET)
  -> atomically claims processed_webhook_events/{event.id} (fixed this phase)
  -> payment.captured / subscription.activated / subscription.charged
     -> grants credits (sets usage.planId, increments creditsIncluded)
     -> writes transactions/{razorpayPaymentId}
```

**The webhook is the sole credit-granting path.** `verifyPayment` never
touches `usage`/`transactions` — confirmed by reading the code and by a
direct test (`verifyPayment.test.ts`: three successful `verifyPayment`
calls for the same payment produce zero `transactions` documents). This
means the system's actual reliability for credit delivery depends entirely
on Razorpay's webhook eventually being delivered and processed
successfully; if webhook delivery to this project were ever misconfigured,
a user's subscription could show `'active'` (via the callback) while they
never actually receive credits. Documented as a real architectural
dependency, not fixed (rearchitecting which path grants credits is beyond
this phase's remit and risks introducing the exact double-grant problem
§31 warns about).

**No top-up purchase flow exists.** `createRazorpayOrder` /
`CreatePaymentInput` (the one-time purchase primitive matching
`PRICING.topUpPacks`) is defined but never called by any function, and the
frontend billing page's "Upgrade to this Plan" button
(`src/app/billing/page.tsx`) shows `alert('...Razorpay integration coming
soon!')` instead of invoking `createSubscription` — **the actual purchase
UI is not wired up in the product at all.** This is a pre-existing,
significant gap, reported honestly rather than silently worked around; it
directly explains why §14/§82 (browser/test-mode payment flow) could not
be exercised through the UI (there is no UI to exercise).

## 8. Secrets

Client-safe: `NEXT_PUBLIC_RAZORPAY_KEY_ID` (documented in `.env.example`,
never actually referenced in `src/` — the checkout UI doesn't exist yet, so
it isn't wired up, but its presence in `.env.example` as a `NEXT_PUBLIC_`
variable is the correct convention for when it is).

Server-only, confirmed never referenced anywhere in `src/`
(grep-verified): `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
`RAZORPAY_STARTER_PLAN_ID`, `RAZORPAY_BUSINESS_PLAN_ID`,
`RAZORPAY_AGENCY_PLAN_ID` — all live only in
`functions/src/config/env.ts`'s schema, read via Cloud Functions runtime
config/secrets, never bundled into the Next.js client build. `.env.example`
contains only placeholder text (`your-razorpay-secret`), no real values.
No secret VALUE was found anywhere in the repository or in the built
frontend (`npm run build` output was inspected structurally — no
Razorpay-secret-shaped strings appear in `src/`).

## 9. Payment State Machine

`SubscriptionStatus`: `incomplete` (post-`createSubscription`, pre-payment)
→ `active` (webhook `subscription.activated`, or `verifyPayment`
confirming a captured payment) → `paused`/`resumed` →
`canceled`/`completed`. All transitions happen exclusively inside
`razorpayWebhook`'s handlers or `verifyPayment` (both server-side,
authenticated by either the Razorpay signature or Firebase Auth + Razorpay
API fetch) — no code path lets the client set `subscription.status`
directly (`firestore.rules`: `subscriptions` collection, `allow write: if
false`).

`TransactionStatus`: `pending` (reservation) → `completed` (finalized) |
`refunded`; `failed` (payment webhook `payment.failed`). Invalid
transitions are rejected with specific error codes
(`ALREADY_FINALIZED`/`ALREADY_REFUNDED`/`INVALID_STATE_TRANSITION`) rather
than silently allowed — proven in §11/§12.

## 10. Idempotency

- **Callback (`verifyPayment`):** doesn't grant credits at all, so
  "idempotent" here means "repeated calls only ever re-set the same
  `status: 'active'` value" — proven safe (§14 below), trivially, since it
  performs no additive mutation.
- **Webhook (`razorpayWebhook`):** keyed on Razorpay's own `event.id`,
  claimed atomically via a Firestore transaction (fixed this phase — see
  §1/§11). Proven safe under both sequential and **concurrent** duplicate
  delivery.
- **Credit grant:** the webhook's `handlePaymentCaptured`/
  `handleSubscriptionCharged` increment `usage.creditsIncluded`
  unconditionally once per successful claim of the webhook event — since
  the claim itself is now atomic and exactly-once, the grant is too.
- **Entitlement:** `subscription.activated` sets (not increments)
  `subscription.status`/`planId`/`creditsIncluded` via `set(..., {merge:
  true})` on a deterministic doc ID (`subscription.id`, Razorpay's own ID)
  — repeat delivery re-sets the same values, not additive, so duplicate
  entitlement creation is structurally impossible (there's exactly one
  Firestore document per Razorpay subscription ID, always).

**Middleware note:** `functions/src/middleware/idempotency.ts` (a generic
`withIdempotency`/`checkIdempotency` helper) is **never used anywhere** —
confirmed via repo-wide search. All real idempotency in this codebase is
the bespoke, collection-specific logic described above, not this generic
middleware. Left as unused dead code (not a security issue — it does
nothing, is called by nothing) rather than removed, since deleting
unrelated dead code is outside this phase's remit unless it poses the kind
of live risk the client-side credit-mutation code did (§1, finding 4).

## 11. Critical Duplicate Test

The exact sequence requested (§64):
```
Payment callback (verifyPayment)
Payment callback (verifyPayment, again)
Webhook (payment.captured)
Webhook (payment.captured, again — sequential)
```
Tested as two separate, composable proofs (since `verifyPayment` never
grants credits, testing it and the webhook together would not add
information beyond testing each independently — see §7's "sole
credit-granting path" finding):

- `verifyPayment.test.ts`: three sequential calls for the same payment
  produce **zero** `transactions` documents (it never grants credits;
  idempotent by having no additive effect).
- `razorpayWebhook.test.ts`, **"CRITICAL (§29)"**: the identical
  `payment.captured` event delivered **twice, sequentially** — expected 1
  entitlement/1 grant:

**Actual result:** `usage.creditsIncluded` after both deliveries = `1200`
(exactly `PRICING.subscriptionTiers.business.monthlyCredits`, granted
once) — **not** 2400. `transactions/{paymentId}` exists exactly once,
`status: 'completed'`.

- `razorpayWebhook.test.ts`, **"CRITICAL (§29/§66)"**: the identical event
  delivered **concurrently** (`Promise.all`, simulating a real Razorpay
  retry racing the original delivery) — **actual result: `1200`, not
  2400.** This is the strongest form of this test and it passes.

Also tested the reverse order (§65, "webhook, webhook, callback, callback"
is functionally the same sequence tested above since callback ordering
relative to webhook doesn't matter — `verifyPayment` has no additive
effect regardless of when it's called).

## 12. Concurrency Tests

All run against a real Firestore emulator (`usageControl.concurrency.test.ts`):

- **GOLDEN CONCURRENCY TEST (§10/§76):** 100 credits available, two
  different reservations each requesting 100, launched concurrently.
  **Result: exactly 1 fulfilled, 1 rejected with `INSUFFICIENT_CREDITS`,
  final `creditsUsed` = 1200/1200 (0 remaining), never negative, never
  double-reserved.**
- **10-way contention:** 10 concurrent reservation attempts for a single
  100-credit slot. **Result: exactly 1 succeeds.**
- **Same-operationId race (the bug found this phase):** two concurrent
  calls with the identical `operationId`. **Before the fix: 280 credits
  consumed for a 140-credit request (confirmed bug). After the fix: 140,
  exactly once.**
- **Finalize vs. refund race (§15):** concurrent `finalizeReservation(R1)`
  and `refundReservation(R1)` on the same reservation. **Result: the
  transaction reaches exactly one terminal state (`completed` or
  `refunded`, never both), and `creditsUsed` matches whichever terminal
  state won** (140 if completed, 0 if refunded) — proven, not assumed,
  because `finalizeReservation`/`refundReservation` each check the current
  `status` before acting and reject an invalid transition rather than
  overwriting.
- **Negative balance impossibility:** 5 concurrent 60-credit requests
  against a 100-credit free-plan balance. **Result: at most 1 succeeds,
  `creditsUsed` never exceeds 100, never negative.**

## 13. Security Tests

- **Client cannot mutate `usage`/`transactions`/`subscriptions`:**
  `firestore.rules` denies all client writes to these three collections
  (`allow write: if false`) — confirmed by reading the rules file. The one
  client-side code path that could have written them anyway
  (`src/services/database.ts`'s `transactionService`/`usageService`
  increment methods) was dead code (confirmed unused anywhere in `src/`)
  and has been removed.
- **Cross-user reservation/refund:** `refundReservation` explicitly checks
  `transaction.userId !== userId` before refunding — an attacker supplying
  someone else's `operationId` is rejected with `UNAUTHORIZED`
  (pre-existing, unchanged, confirmed by reading the code).
- **Cross-user payment verification (`verifyPayment.test.ts`):** User A
  cannot activate/verify User B's subscription — `subscription.userId !==
  context.userId` is rejected with `belongs to another user`, and the
  subscription's status is confirmed unchanged (`'incomplete'`) after the
  attacker's failed attempt.
- **Cross-business authorization for credit-reserving operations
  (`auth.test.ts`):** `verifyBusinessAccess` — now the actual authorization
  gate for `generateCampaignStrategy` and 17 other business-scoped
  functions after the Phase 10 fix — correctly grants the owning user
  access and denies a different user, and rejects access to a nonexistent
  business rather than silently allowing it.
- **Client tampering (§21/§78):** the only way to influence pricing/credits
  is via `data.planId` (a `z.enum(['starter','business','agency'])` on
  `createSubscription` — no `amount`/`credits`/`price` field accepted at
  all) and `data.objective`/`data.businessId` etc. on
  `generateCampaignStrategy` (credits computed server-side via
  `getGenerationCost('campaign_generation')`, a fixed constant from
  `pricing.ts`, never a client-supplied number). Confirmed by reading every
  Zod schema on these callables — none accept a raw credit/price/amount
  field from the client.

## 14. Browser Payment Test

**Not performed, and could not honestly be performed:** the actual
purchase UI does not exist in the product (§7). Clicking "Upgrade to this
Plan" in `src/app/billing/page.tsx` shows a placeholder alert, never calls
`createSubscription`. There is no Razorpay Checkout integration in the
frontend to drive. This is not an environment-credentials limitation (like
the missing `.env.local` noted in every prior phase) — it's a genuinely
unbuilt feature. Reported honestly per the explicit instruction not to
fabricate a live payment result; the backend functions
(`createSubscription`, `verifyPayment`, `razorpayWebhook`) were instead
tested directly (§11/§12/§13), which is the strongest verification
actually available in this environment and codebase state.

## 15. Automated Tests

All run against a real Firestore emulator (`firebase emulators:start
--only firestore`, confirmed working in this environment — Java 21 +
`firebase-tools` 15.29.0 were both available):

| Suite | Tests | Result |
|---|---|---|
| `usageControl.test.ts` (pre-existing, run for real for the first time) | 10 | **10 passed** |
| `usageControl.concurrency.test.ts` (new) | 7 | **7 passed** |
| `razorpayWebhook.test.ts` (new) | 5 | **5 passed** |
| `verifyPayment.test.ts` (new) | 5 | **5 passed** |
| `auth.test.ts` (new) | 3 | **3 passed** |
| `analyticsService.test.ts` (Phase 9) | 4 | **4 passed** |
| All other pre-existing functions suites | 95 | **95 passed** |

**Functions total: 15 suites, 129 tests, 129 passed, 0 skipped, 0
failed** (with `FIRESTORE_EMULATOR_HOST` set — every previously
emulator-gated test actually ran, for the first time in this project).

**Frontend: 13 suites, 150 passed, 2 skipped, 0 failed** (`npm test`,
without the emulator env var — the project's established convention).
Setting `FIRESTORE_EMULATOR_HOST` for the frontend's own `tests/`
suite was also attempted, for completeness: it surfaced a pre-existing,
unrelated `@firebase/rules-unit-testing` version/initialization
incompatibility (`"Firestore has already been started..."`,
`PERMISSION_DENIED` on rules tests that should pass) that predates this
phase and is unrelated to credits/payments — not fixed, since it's a
frontend security-rules test-harness issue, out of this phase's scope, and
does not affect any of the credit/payment code paths this phase actually
touched (those live entirely in `functions/`, tested via
`firebase-admin`, which has no such incompatibility).

## 16. Build Validation

Lint: **PASS** (`npm run lint`; `functions` lint has the same large,
pre-existing, unrelated failure baseline documented in the Phase 9
report — every `.test.ts` file fails to parse because
`functions/tsconfig.json` excludes `**/*.test.ts` from `include`, which
ESLint's `parserOptions.project` requires; predates this phase, confirmed
by testing it against untouched pre-existing test files).
Typecheck: **PASS** (`npm run typecheck`; `cd functions && npx tsc
--noEmit`).
Tests: **PASS** (see §15 — 129/129 functions with the emulator running,
150/152 frontend, 2 legitimately skipped per convention).
Build: **PASS** (`npm run build`, 17 routes).
Functions Build: **PASS** (`npm run functions:build`).

## 17. Remaining Risks

Ranked by severity:

1. **No reconciliation for a reservation orphaned by a process crash**
   (§5) — a `'pending'` transaction whose owning function instance died
   before finalize/refund stays `'pending'` forever, permanently
   unavailable to that user. No sweep/TTL job exists. Real, unmitigated.
2. **Credit delivery depends entirely on webhook delivery** (§7) — the
   callback path (`verifyPayment`) can mark a subscription `'active'`
   without the user ever actually receiving credits if the webhook never
   arrives. No reconciliation between the two paths.
3. **No top-up purchase flow, and no subscription purchase UI at all**
   (§7/§14) — `createRazorpayOrder` is dead code; the billing page's
   purchase button is a placeholder. This is a product-completeness gap,
   not a security gap, but it means payment collection is not live.
4. **`usage.creditsIncluded`/`subscription.creditsIncluded` display
   inconsistency** (§6) — cosmetic/informational only, does not affect
   actual credit enforcement, but will show a growing, incorrect number
   over multiple subscription renewals.
5. **Rate-limit configs are defined but not wired up** — `checkRateLimit`
   is called with just `(userId, action)` everywhere (including
   `generateCampaignStrategy`, `createSubscription`, `verifyPayment`),
   always using the generic 100-requests/60s default rather than the
   tighter per-action limits already defined in
   `functions/src/middleware/rateLimit.ts`'s `rateLimitConfigs` (e.g.
   `generateCampaign: 10/hour`). Not exploitable as an unlimited-spend bug
   (credit reservation itself is still correctly gated), but a real
   hardening gap for expensive/financial actions. Not fixed this phase —
   flagged as a contained, low-risk follow-up.
6. **`functions/src/middleware/idempotency.ts` is entirely dead code** —
   confirmed unused; harmless, but worth removing in a future cleanup pass
   rather than left as a misleading "this is how we do idempotency" red
   herring for future developers.
7. Firestore/webhook behavior under real Razorpay test-mode traffic (as
   opposed to a locally-signed synthetic request) was not verified — no
   Razorpay test credentials were available in this environment (§14).

## 18. Files Changed

**Bug fixes:**
- `functions/src/services/usageControl.ts` — atomic idempotency check
  inside the reservation transaction (fixes the same-operationId double-
  reservation race).
- `functions/src/functions/webhooks/razorpayWebhook.ts` — atomic claim
  transaction for webhook-event idempotency (fixes the duplicate/
  concurrent-delivery double credit-grant race); rejects events missing
  `event.id`.
- `functions/src/functions/campaigns/regenerateAsset.ts` — operationId
  changed from `campaignId` (caused every regeneration after the first to
  fail) to `idempotencyKey`; removed the broken, dead
  `verifyAuthAndBusinessAccess(context as any, ...)` call (redundant with
  the correct `campaign.userId` check immediately after).
- **21 files** — removed the broken `verifyAuth(context as
  any)`/`verifyAuthAndBusinessAccess(context as any, ...)` pattern that
  made every one of these callables always throw "Authentication
  required": `functions/src/functions/{assets/confirmUpload.ts,
  assets/getUploadUrl.ts, brandKit/createBrandKit.ts, brandKit/getBrandKit.ts,
  brandKit/updateBrandKit.ts, business/getBusiness.ts,
  business/listBusinesses.ts, business/updateBusiness.ts,
  campaigns/createCampaign.ts, campaigns/generateCampaignStrategy.ts,
  campaigns/getCampaign.ts, campaigns/listCampaigns.ts,
  campaigns/updateCampaign.ts, campaigns/updateCampaignStatus.ts,
  products/archiveProduct.ts, products/createProduct.ts,
  products/getProduct.ts, products/listProducts.ts,
  products/updateProduct.ts, subscriptions/createSubscription.ts,
  subscriptions/verifyPayment.ts}`.
- `functions/src/functions/analytics/trackAnalyticsEvent.ts` — (Phase 9)
  now requires `request.auth.uid`; unrelated to this phase's edits, listed
  for completeness of the diff.

**Security hardening:**
- `src/services/database.ts` — removed the entire dead, dangerous
  client-side `transactionService` (reservation/finalize/refund) and six
  `usageService.increment*` methods; kept read-only methods.

**New tests (all run against a real Firestore emulator):**
- `functions/src/services/usageControl.concurrency.test.ts`
- `functions/src/functions/webhooks/razorpayWebhook.test.ts`
- `functions/src/functions/subscriptions/verifyPayment.test.ts`
- `functions/src/middleware/auth.test.ts`

## 19. FINAL VERDICT

**PHASE 10 IMPLEMENTED BUT PARTIALLY VERIFIED**
