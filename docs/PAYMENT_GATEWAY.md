# Payment Gateway — Paddle (primary) · PayU (legacy, retained for rollback)

**Updated:** 2026-10-02. Paddle Billing is the primary and only *deployed* payment provider.
The PayU implementation below is intact, but its functions are not exported from
`functions/src/index.ts` and the billing UI only calls Paddle, so the app never offers two
competing payment flows. Everything here was exercised against **Paddle Sandbox only** — nothing
has been run against live Paddle.

## Paddle flow

```
Mitra user ─▶ createPaddleCheckout (callable) ─▶ Paddle transaction (txn_…) ─▶ Paddle.js overlay
                 │ pending transactions/{txn_…}                                      │ customer pays
                 ▼                                                                    ▼
            users.paddleCustomerId                                     paddleWebhook (signed POST)
                                                                          │ transaction.completed
                                                                          ▼
                              paddle_grants/{txn_…} (once-only ledger) + usage / subscriptions / transactions
```

### Identity (no synthetic IDs)

- **Checkout** (`createPaddleCheckout`): the client sends only `{planId, billingCycle}` **or**
  `{creditPack}` — never a price. The server resolves the Paddle price ID from env config, finds or
  creates the Paddle customer (reusing `users.paddleCustomerId`, recovering the ID on Paddle's
  duplicate-email conflict), then creates a Paddle transaction with
  `custom_data = { firebaseUid, kind, planId | credits, … }`. The pending record is keyed by Paddle's
  own `transaction.id`.
- **Webhook**: `transaction.completed` carries that same `id`, so it reconciles against
  `transactions/{id}` directly. The user is resolved by (1) `custom_data.firebaseUid`, else (2) the
  stored `subscriptions/{subscription_id}.userId` (recurring renewals), else (3) the user whose
  `paddleCustomerId` matches. A `custom_data` user whose stored Paddle customer differs from the
  event's customer is refused.
- **What is granted comes from the price ID**, mapped through our env config (`resolvePaddlePrice`) —
  never from `custom_data` or the amount in the payload.

### Catalog (`pricing.ts` is the single source of truth)

| Plan     | Monthly | Yearly  | Credits/mo |
| -------- | ------- | ------- | ---------- |
| Free     | ₹0      | ₹0      | 100        |
| Starter  | ₹999    | ₹9,990  | 500        |
| Business | ₹1,699  | ₹16,990 | 1,200      |
| Pro      | ₹2,999  | ₹24,990 | 2,500      |
| Agency   | ₹4,999  | ₹49,990 | 6,000      |

Credit packs (one-time): 500 → ₹499 · 1,200 → ₹999 · 3,000 → ₹1,999. **No trial period** is defined
anywhere in Mitra, and the catalog has none.

`scripts/setup-paddle-catalog.mjs` reconciles Paddle with `pricing.ts`: dry-run by default, `--apply`
to write, finds existing products/prices first, never archives or deletes, refuses non-sandbox
without `--allow-production`, and prints the `PADDLE_PRICE_ID_*` block (see `.env.example`).
Re-running it once reconciled is a no-op.

### Entitlement model (unchanged — Paddle maps into it)

Mitra's existing model is **`usage/{uid}_{periodStart}.planId` → monthly credits**, with availability
= `monthlyCredits(planId) + bonusCredits − creditsUsed` (`getPeriodCreditAllowance`, used by every
check in `usageControl.ts`). Paddle does not add a second balance:

- **Plan purchase / renewal / plan change** → `applyPlanEntitlement` *sets* the current period's
  `planId` (idempotent by construction) and recomputes the display total.
- **Credit pack** → `grantTopUpCredits` increments the current period's `bonusCredits` — same
  document, same availability formula, so top-ups are genuinely spendable.
- **New period** → the usage doc is created with `resolveEntitledPlan(userId)` (the plan from the live
  subscription) instead of a hard-coded `free`. Without this a yearly subscriber — who renews once a
  year — would drop to Free in month 2.

### Webhook (`paddleWebhook`)

- Signature verified over the **raw body** (`req.rawBody`); re-serialised JSON would not verify.
- **Grants happen only on `transaction.completed`.** One purchase emits `subscription.created` +
  `subscription.activated` + `transaction.completed`; granting on all three would triple-grant.
  Subscription events only sync state.
- **Idempotency is on the effect, not the delivery**: `paddle_grants/{txn_id}` is written in the *same*
  Firestore transaction as the grant, so retries, replays and concurrent deliveries of one Paddle
  transaction cannot grant twice whatever their event IDs. Anomalies (no pending record, wrong user,
  unattributable) are recorded as `status: 'flagged'` and acknowledged (200) with nothing granted.
- **Ordering**: subscription state writes older than `lastPaddleEventAt` are ignored.

| Event | Handling |
| ----- | -------- |
| `transaction.completed` | Plan entitlement (first purchase / `subscription_recurring` / `subscription_update`) or credit pack. `subscription_payment_method_change` is ignored. |
| `transaction.payment_failed` | Pending record → `failed` (a completed record is never downgraded). Entitlement untouched. |
| `subscription.created` / `activated` / `updated` / `past_due` / `paused` / `resumed` | State sync: status, period, plan, `cancelAtPeriodEnd` (set by a scheduled cancel, **cleared** if the cancel is undone). |
| `subscription.canceled` | `status: canceled`; the user's pointer is cleared only if it still names this subscription. **Credits already granted are not removed.** |
| `adjustment.created` / `updated` | Logged for manual review only — no refund policy exists (`LEGAL_FOUNDER_DECISIONS_REQUIRED.md`). |

### Renewal

A successful recurring charge arrives as `transaction.completed` with `origin: subscription_recurring`
and no guaranteed `custom_data`; the user is found via the stored subscription. It re-applies the plan
to the current period (a no-op if unchanged), refreshes the subscription period, and writes a
`transactions/{txn}` audit record plus a `paddle_grants` ledger entry. Credits follow Mitra's existing
**calendar-month** model (`creditsUsed` resets with each new month's usage doc, not at the billing
anniversary).

### Cancellation

`cancelPaddleSubscription` verifies ownership, calls Paddle (`effectiveFrom: next_billing_period`) so
renewal actually stops, and sets `cancelAtPeriodEnd`. The user keeps the plan and the credits already
granted until `currentPeriodEnd`; afterwards `resolveEntitledPlan` yields Free for new periods. No
credits are deleted.

### Pricing page & checkout UI

- **Prices are Paddle's, verbatim.** `/pricing` and `/billing` call `Paddle.PricePreview` once for every
  configured price ID and render `formattedTotals.total` untouched (`PaddlePrice`). There is no frontend
  arithmetic, no `Intl.NumberFormat`, no yearly-savings calculation and no hard-coded amount. While
  loading a placeholder shows; on failure an error banner with retry shows; with missing configuration a
  "billing isn't configured" banner shows. Checkout buttons stay disabled until the price they would
  charge is on screen.
- **Country**: `/pricing` is a server component that reads `x-vercel-ip-country` and passes it only if it is
  a real two-letter code. Otherwise `address` is omitted from `PricePreview` entirely and Paddle detects
  the visitor from their IP. No country is ever guessed or defaulted. (`/billing` is a client page and
  always lets Paddle auto-detect.) Firebase App Hosting may not set `x-vercel-ip-country` — auto-detect
  is then the normal path.
- **Environment is explicit, never defaulted.** Client: `NEXT_PUBLIC_PADDLE_ENVIRONMENT`
  (`sandbox`|`production`) + `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` (`test_…` for sandbox, `live_…` for
  production; a mismatch or a `pdl_` API key is rejected). Server: `PADDLE_ENVIRONMENT` is required and
  must agree with the API key prefix (`pdl_sdbx_` / `pdl_live_`). Missing/inconsistent values throw. The
  API key is only ever a Functions secret; a test fails the build if any frontend source mentions it.
- **Checkout** (overlay, one-page): the button calls `createPaddleCheckout`, which returns the transaction
  and the exact price ID the server used; the client **refuses to open checkout if that differs from the
  price ID it displayed**. It then opens `Checkout.open({ transactionId, settings: { displayMode: 'overlay',
  variant: 'one-page', successUrl: '/welcome' } })`.
  *Deviation from "open with `items`":* the transaction is created server-side so the purchaser
  (`custom_data.firebaseUid`) and the Paddle customer (email pre-fill) are server-controlled. Opening with
  client-supplied `items` + `customData` would let a browser attribute a purchase to any user and would
  leave credit packs with no pending record to reconcile against. The price ID is still authoritative.
- **Signed-out visitors** are sent to sign-up (with plan and cycle) instead of an anonymous checkout: the
  webhook can only grant entitlements to a Mitra user.
- **Free** has no Paddle price and never opens checkout. **Existing subscribers** get "Manage in Billing"
  (see limitations) rather than a second subscription.
- **/welcome** (the `successUrl`) only *reflects* state: it polls the user's own subscription/usage for ~60 s
  and says so plainly if the webhook has not landed. It grants nothing.
- Price IDs for the browser are `NEXT_PUBLIC_PADDLE_PRICE_ID_*` (see `.env.example`); business rules
  (names, features, credits) stay in `pricing.ts` and its frontend mirror.

### Known limitations / decisions needed

- **No in-place plan change.** A user with a live subscription is blocked (`failed-precondition`) from
  buying a second one, which would double-bill. Upgrading currently means cancel-then-resubscribe until
  a `subscriptions.update` flow is built. The webhook already handles `subscription_update`
  transactions.
- **Top-up credits are per calendar month.** They live on the period's usage doc, like every other
  credit, and do not roll over. Persisting packs across months is a product decision that changes the
  credit model.
- **Refunds** are not automated (see `adjustment.*` above).
- **Legal pages** (`/terms`, `/refund`, `/privacy`) still name PayU. Paddle acts as Merchant of Record,
  which needs founder/legal review.

### Paddle dashboard / manual steps

1. Developer Tools → Notifications: add a destination at the deployed `paddleWebhook` URL, subscribed
   to the events in the table above; put its secret in `PADDLE_WEBHOOK_SECRET`.
2. Developer Tools → Authentication: a **client-side token** → `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, and a
   server API key → `PADDLE_API_KEY` (Functions secret).
3. Checkout > Checkout settings > **Default payment link**: set it to the Mitra checkout page (localhost is acceptable
   for sandbox; live needs a real, Paddle-approved domain, never localhost). Dashboard-only — not configurable via API.
4. Set `PADDLE_PRICE_ID_*` (Functions) and `NEXT_PUBLIC_PADDLE_PRICE_ID_*` (Next.js) for the deployed environment (script output) and confirm INR is enabled.
5. Go live only after sandbox verification — the catalog script requires `--allow-production` by
   design.

**Sandbox verification status:** catalog created/reconciled and re-verified as idempotent against the
Paddle sandbox API; checkout and webhook logic verified against the Firestore emulator with a mocked
Paddle SDK and a genuinely signed webhook body. **A real end-to-end checkout (card → live sandbox
webhook delivery) has not been performed** — it needs the dashboard steps above and a public webhook
URL.

---

# Legacy provider — PayU (retained for rollback; NOT deployed)

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

|            | Hosted Checkout                   | Verify/command API (`postservice.php?form=2`)          |
| ---------- | --------------------------------- | ------------------------------------------------------ |
| Test       | `https://test.payu.in/_payment`   | `https://test.payu.in/merchant/postservice.php?form=2` |
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

| Mitra Billing Operation          | Current Razorpay Mechanism (legacy, still deployed)        | PayU Mechanism (active)                                                                                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Starter/Business/Agency purchase | Razorpay recurring Subscription, `total_count: 12`         | One-time Hosted Checkout, `cancelAtPeriodEnd: true`                                                                                                                                                          |
| Subscription renewal             | Automatic (`subscription.charged` webhook)                 | **Manual** — customer must repurchase; no auto-charge (SI not enabled)                                                                                                                                       |
| Credit top-up                    | Not purchasable in either gateway (UI shows "coming soon") | Same — out of scope for this migration                                                                                                                                                                       |
| Cancellation                     | `cancelRazorpaySubscription` (cancel-at-cycle-end)         | No-op for existing PayU purchases (already non-renewing); would call `cancelSIMandate` if SI is ever enabled                                                                                                 |
| Refund                           | Not implemented for either gateway                         | `refundPayment()` implemented per PayU's `cancel_refund_transaction` command, **UNVERIFIED**, not wired to any callable — no refund policy has been decided (see `docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md`) |

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
  Mitra's own payment _logic_ (hash math, idempotency, reconciliation, credit ledger writes). It
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
