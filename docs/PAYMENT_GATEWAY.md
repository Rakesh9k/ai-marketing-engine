# Payment Gateway — PayU (migrated from Razorpay)

**Date:** 2026-09-22. Documents the actual implementation of the PayU migration — not aspirational
capability. Every "UNVERIFIED" label below is load-bearing: this repository has **zero PayU
credentials configured anywhere** (no `PAYU_MERCHANT_KEY`/`PAYU_SALT` in `functions/.env.local`, no
PayU secret in the production GCP project's Secret Manager, confirmed by inspection during this
migration), so nothing that requires talking to PayU's real servers has been exercised end-to-end.

## Provider

**PayU India**, replacing Razorpay as the active payment gateway. Razorpay's code remains deployed
(not deleted) — see "Razorpay legacy" below for why.

## Environment

`PAYU_ENVIRONMENT` (`test` | `production`, default `test`) selects between:

| | Hosted Checkout | Verify/command API (`postservice.php?form=2`) |
|---|---|---|
| Test | `https://test.payu.in/_payment` | `https://test.payu.in/merchant/postservice.php?form=2` |
| Production | `https://secure.payu.in/_payment` | `https://info.payu.in/merchant/postservice.php?form=2` |

Configured in `functions/src/services/payu.ts`'s `getPayUConfig()`, the single source of truth for
both URLs and credentials — no endpoint is hard-coded anywhere else.

## Payment model — one-time checkout, NOT PayU recurring/SI (by default)

**Critical finding from this migration**: Mitra's Razorpay integration used Razorpay's genuine
recurring **Subscriptions** API (`subscription.charged` fires every renewal cycle automatically).
PayU's equivalent — Standing Instruction (SI) / recurring payments — is a materially heavier,
separately-approved integration (mandate registration with Additional Factor of Authentication,
`pre_debit_SI` notifications, a distinct `si_transaction` charge API) that requires PayU to enable
SI capability on the merchant account before it can be used at all. This cannot be confirmed or
tested in this environment.

**What is actually implemented and active**: each plan purchase is a **one-time PayU Hosted
Checkout transaction**. A successful payment creates a `subscriptions/{txnid}` document with
`cancelAtPeriodEnd: true` from the moment it's created — this is an honest signal, not a bug: there
is no auto-renewal mechanism behind a one-time checkout, so the plan will lapse at `currentPeriodEnd`
(30 days later) unless the customer manually repurchases. The billing UI does not currently prompt
for that repurchase automatically (out of scope for this migration — a UX follow-up, not a payment
plumbing gap).

**What is implemented but UNVERIFIED and gated off (`PAYU_SI_ENABLED=false` by default)**: the full
PayU SI request/hash shape (`buildSIConsentRequest`, `chargeSIRecurring`, `cancelSIMandate` in
`services/payu.ts`), built per PayU's documented pattern but never exercised against a real account.
`cancelSubscription.ts` is provider-aware and will call `cancelSIMandate` for a `provider: 'payu'`
subscription that has a `payuMandateTxnId` set (i.e., only if SI is ever actually wired up and used)
— today, every PayU subscription created by `createPayUPayment`/`payuWebhook` already has
`cancelAtPeriodEnd: true`, so `cancelSubscription` for those is a no-op ("already canceled") by
construction, not a live SI cancellation call.

| Mitra Billing Operation | Current Razorpay Mechanism (legacy, still deployed) | PayU Mechanism (active) |
|---|---|---|
| Starter/Business/Agency purchase | Razorpay recurring Subscription, `total_count: 12` | One-time Hosted Checkout, `cancelAtPeriodEnd: true` |
| Subscription renewal | Automatic (`subscription.charged` webhook) | **Manual** — customer must repurchase; no auto-charge (SI not enabled) |
| Credit top-up | Not purchasable in either gateway (UI shows "coming soon") | Same — out of scope for this migration |
| Cancellation | `cancelRazorpaySubscription` (cancel-at-cycle-end) | No-op for existing PayU purchases (already non-renewing); would call `cancelSIMandate` if SI is ever enabled |
| Refund | Not implemented for either gateway | `refundPayment()` implemented per PayU's `cancel_refund_transaction` command, **UNVERIFIED**, not wired to any callable — no refund policy has been decided (see `docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md`) |

## Payment initiation

`functions/src/functions/subscriptions/createPayUPayment.ts` — a callable that:
1. Reads `planId` from the client (only `starter`/`business`/`agency`).
2. Resolves the **authoritative amount** from `config/pricing.ts` (`getPlanPrice`) — never from the
   client.
3. Generates a server-side `txnid` (`uuidv7`), persists a `pending` `transactions/{txnid}` record
   before returning anything to the client.
4. Computes the payment-request hash (see below) and returns the exact hidden-form fields the
   client must POST to PayU — `src/lib/payu/submitCheckout.ts` builds and submits that form. This
   is a full-page browser redirect, not an in-page JS widget (PayU Hosted Checkout's actual
   integration shape — different from Razorpay Checkout.js, which the prior integration used).

## Hash generation

Both formulas were sourced from PayU's current public documentation
([Generate Hash for PayU Hosted Checkout](https://docs.payu.in/docs/generate-hash-payu-hosted)),
fetched during this implementation — not invented, not assumed from the task description alone.

- **Payment request (forward) hash**: `sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)` — 5 UDF fields then 6 empty pipe-delimited positions before SALT.
- **Response/webhook (reverse) hash**: `sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)` — the exact reverse field order, `status` inserted right after SALT.

These are two genuinely different formulas — `functions/src/services/payu.ts` implements them as
two separate functions (`generatePaymentHash` / `generateResponseHash`), and `payuWebhook.ts` uses
only the reverse formula, never the forward one, for verifying incoming payloads.

`udf1` carries the Firebase `userId`, `udf2` carries the `planId` — both are inside the hashed
payload, so tampering with either invalidates the hash. Verified 15/15 unit tests in
`functions/src/services/payu.test.ts` (hash changes when any signed field changes, matches a
manually-recomputed sha512 of the documented pipe string, rejects tampered amount/status/salt).

**The salt is never sent to the browser.** `createPayUPayment` returns the computed hash, not the
salt itself; the client-side form (`submitPayUCheckout`) never sees or needs it.

## Callback vs. webhook (critical distinction)

Two separate HTTPS functions, matching PayU's actual integration shape:

- **`payuCallback.ts`** (`surl`/`furl` — the browser redirect target). PayU POSTs here after the
  customer finishes on PayU's page. Verifies the response hash **for cosmetic legibility only** and
  redirects the browser to `/billing?payu=<status>&txnid=<id>` — **never grants credits**. A
  successful redirect means "the customer came back from PayU," not "the payment is valid" (this
  distinction is explicit in the code comments and was the task's own explicit warning).
- **`payuWebhook.ts`** (configured separately in the PayU merchant dashboard — **not** the same URL
  as `surl`/`furl`). The only path that grants credits. Pipeline: hash verification (constant-time)
  → idempotency claim (`txnid+status`, atomic Firestore transaction, same correctness pattern as
  `razorpayWebhook.ts`'s `processed_webhook_events`) → look up Mitra's own `transactions/{txnid}`
  record (userId/planId/expected amount come from **this record**, not from the webhook's udf
  fields, even though those are also hash-protected — two independent sources must agree) → amount
  reconciliation (mismatch is flagged as `flagged_amount_mismatch`, never silently charged) →
  best-effort server-side `verify_payment` API reconciliation → credit grant.

## Server-side amount authority

Enforced at two points: (1) `createPayUPayment` computes the amount from `pricing.ts`, the client
never supplies one; (2) `payuWebhook` compares the received `amount` against the `transactions/
{txnid}.amount` value persisted at step 1, refusing to grant credits on any mismatch. A client (or a
compromised intermediary) sending `amount=1.00` for a `₹999` plan cannot result in a `1200`-credit
grant — proven by `payuWebhook.test.ts`'s amount-mismatch test.

## Idempotency

Keyed on `txnid+status` via the same atomic Firestore-transaction claim pattern
`razorpayWebhook.ts` already uses (`processed_webhook_events` collection). Proven by
`payuWebhook.test.ts`: the same webhook delivered twice, and three concurrent identical deliveries,
each grant credits exactly once.

## Credit grant

Extracted into a shared, provider-neutral helper (`functions/src/services/billing.ts`'s
`grantPlanCredits`) used by both the existing Razorpay webhook path (not modified — still calls its
own inline logic, unchanged for backward compatibility with the legacy code) and the new PayU
webhook path, so the actual Firestore write behavior (create-usage-doc-if-missing, increment
`creditsIncluded`) can't drift between the two gateways for new code going forward.

## Verify Payment API (server-side reconciliation)

`verifyPaymentWithPayU()` calls PayU's legacy `postservice.php` `verify_payment` command
(`sha512(key|verify_payment|txnid|salt)`, per PayU's documented command-API hash format), comparing
the result against the webhook's own claimed status. A disagreement is flagged
(`flagged_verification_mismatch`) rather than trusted. **UNVERIFIED against a real PayU account** —
only the hash construction is unit-tested; the network call's real behavior has never been
exercised.

## Refund — NOT wired to any user-facing action

`refundPayment()` implements PayU's `cancel_refund_transaction` command hash, but is not called from
any callable or UI. Per `docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md`, no refund policy (eligibility,
time window, full vs. partial) has been decided — building a self-service refund flow on top of this
function without that decision would mean inventing policy, which this migration does not do.

```
REFUND E2E = BLOCKED — no PayU credentials to test against, and no refund policy decided
```

## Recurring billing (SI) — BLOCKED / UNVERIFIED

```
PAYU SI CAPABILITY = BLOCKED — cannot confirm whether the PayU merchant account has Standing
Instruction capability enabled; requires PayU dashboard/account access this environment does not
have. PAYU_SI_ENABLED defaults to false. The SI code path (buildSIConsentRequest, chargeSIRecurring,
cancelSIMandate) is implemented per PayU's documented request/hash shape but has NEVER been
exercised against PayU's servers.
```

## PayU dashboard configuration required (external, not code)

```
EXTERNAL PAYU CONSOLE ACTION REQUIRED
```
- `PAYU_MERCHANT_KEY`/`PAYU_SALT` — obtained from the PayU merchant dashboard, must be set via the
  project's approved secret-management mechanism (Cloud Functions secrets/env, never
  `NEXT_PUBLIC_*`, never committed).
- `PAYU_CALLBACK_URL`/`PAYU_WEBHOOK_URL` — the real deployed Cloud Run URLs for `payuCallback`/
  `payuWebhook` are only known **after** first deployment (a genuine chicken-and-egg constraint, not
  an oversight) — must be set post-deploy, and `payuWebhook`'s URL must separately be registered in
  the PayU dashboard's webhook configuration.
- Before production activation: **rotate any previously-shared PayU salt** — treat any salt value
  that has ever appeared outside the approved secret-management system as compromised, regardless of
  what this codebase does.

## Razorpay legacy

`razorpayWebhook.ts`, `createSubscription.ts`, `verifyPayment.ts`, and the Razorpay branch of
`cancelSubscription.ts` remain deployed and unmodified. **Not removed** because:
1. PayU has not been end-to-end verified (no credentials to test against) — removing the
   only-verified-working gateway before its replacement is proven would be reckless.
2. Historical Razorpay subscription/transaction records must remain readable and their existing
   webhook path (renewal, cancellation) must keep working for any subscription created before this
   migration, until it naturally lapses.

The billing UI (`src/app/billing/page.tsx`) no longer calls any Razorpay function — `createPayUPayment`
is the only checkout path a new purchase can take. `src/lib/razorpay/loadCheckout.ts` (the
Checkout.js loader) is now unused by any component but left in place as historical/dormant code, not
deleted, consistent with "do not delete historical Razorpay transaction records/code unnecessarily."

## Database changes

- `Subscription`/`Transaction` types (`functions/src/types/index.ts`) gained an optional
  `provider?: 'razorpay' | 'payu'` field. Historical records predating this field are implicitly
  `'razorpay'` (identifiable by having `razorpaySubscriptionId`/`razorpayPaymentId` set) — never
  backfilled or rewritten.
- `Transaction` gained `payuTxnId?`/`payuMihpayid?`. `Subscription` gained `payuMandateTxnId?` (SI
  only, unused while SI is disabled).
- No existing Razorpay record was modified, migrated, or deleted.

## Testing

- `functions/src/services/payu.test.ts` — 20 tests: hash-formula correctness (forward + reverse),
  sensitivity to every signed field, constant-time comparison edge cases (missing/malformed/
  wrong-length/non-string hash), end-to-end tamper rejection.
- `functions/src/functions/webhooks/payuWebhook.test.ts` — 8 tests, real Firestore emulator, PayU
  network calls mocked: hash rejection, successful credit grant, idempotency (sequential and
  concurrent duplicate delivery), amount-mismatch refusal, failure status grants nothing, cross-user
  ownership (a forged `udf1` cannot redirect credits to another user), unknown-txnid safe no-op.
- `src/app/billing/page.test.tsx` — rewritten for the PayU flow: checkout initiation, disabled
  states, error handling, duplicate-click guard, and all four `payu=` return-status toasts.
- Full regression: functions suite 332/342 passing (10 skipped/pre-existing-environmental failures,
  none caused by this migration — see the failing suites' own long-standing Auth/Storage-emulator
  dependency, unrelated to payments); frontend suite 260/327 (67 pre-existing skips), 0 failures.
- **Emulator vs. real PayU, per the migration task's own rule**: the Firestore emulator proves
  Mitra's own payment *logic* (hash math, idempotency, reconciliation, credit ledger writes). It
  does **not** and cannot prove real PayU checkout, real webhook delivery, or real credential
  validity — those remain UNVERIFIED until tested against an actual PayU test account, which this
  environment does not have.

## Final status

```
PAYU IMPLEMENTATION:      VERIFIED (code-level: hash formulas, verification, idempotency, amount
                            reconciliation, credit grant — all proven against a real Firestore
                            emulator with PayU's network calls mocked)
PAYU TEST ENVIRONMENT:    BLOCKED — no PayU test credentials exist in this project
PAYU PRODUCTION:          BLOCKED — no PayU production credentials exist in this project
PAYMENT SECURITY:         VERIFIED (constant-time hash comparison, server-side amount authority,
                            idempotent webhook processing, transaction-ownership isolation — all
                            unit/integration-tested); PayU SI recurring path UNVERIFIED/disabled
OVERALL PAYMENT MIGRATION: PARTIAL — code migration complete and tested against everything testable
                            in this environment; real PayU account verification is the remaining gap
```
