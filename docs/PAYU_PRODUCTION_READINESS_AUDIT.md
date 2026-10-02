# PayU Production-Readiness Audit (Audit-Only)

**Date:** 2026-09-22. This is a read-only inspection of the PayU migration as it exists in the
current working tree. **No code was modified, no deployment was performed, as part of this audit.**
It exists to answer one question: what remains before a real PayU test transaction, and then
production launch, can happen. Mocked-PayU-provider unit/integration tests are explicitly **not**
treated as evidence that the real PayU integration works — they prove Mitra's own logic is correct
given a certain PayU response; they prove nothing about whether PayU actually responds that way.

## Current deployment state (verified this session)

`createPayUPayment`, `payuCallback`, and `payuWebhook` **are live in the production Cloud Functions
project** (`brainwise-ai-marketing-engine`, `asia-south1`) — confirmed via `firebase functions:list`.
This happened as a side effect of an earlier `firebase deploy --only functions,apphosting` that
deployed the entire functions codebase together (Cloud Functions deploys are all-or-nothing per
invocation across the exported functions in `index.ts`; there is no way to deploy some new exports
and not others in one command). **No `PAYU_MERCHANT_KEY`/`PAYU_SALT` secret exists in this project's
Secret Manager** — confirmed by the earlier `firebase functions:secrets:access` 404 result — so
`getPayUConfig()` throws immediately for any real invocation. This means the three functions are
live but **fail closed**: `createPayUPayment` returns an error to the client before generating
anything, `payuWebhook`/`payuCallback` return 500/log an error rather than processing a payload.
This is not a security risk (nothing succeeds without credentials), but it is a fact worth knowing:
the functions did not wait for a "controlled PayU deployment" sequence — they went out with the
Google Auth / legal-compliance deploy. No further functions deploy is needed to make PayU testable
once credentials exist; only secret configuration and PayU-dashboard URL registration remain.

## Findings by category

### VERIFIED

| Item                                    | Evidence                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Server-side pricing/amount authority    | `createPayUPayment.ts` reads `getPlanPrice(planId)` from `config/pricing.ts`; the client never supplies an amount. `payuWebhook.ts` re-checks the webhook's amount against `transactions/{txnid}.amount` (the value persisted at initiation), refusing credit grant on any mismatch. Both paths unit/integration-tested. |
| Payment-request hash formula            | `sha512(key\|txnid\|amount\|productinfo\|firstname\|email\|udf1..udf5\|\|\|\|\|\|SALT)`, sourced from PayU's live documentation (cited in `services/payu.ts`), verified against a manually-recomputed hash in `payu.test.ts` (20 tests).                                                                                 |
| Response/webhook hash formula (reverse) | Confirmed as a genuinely different formula from the request hash, implemented separately, verified the same way.                                                                                                                                                                                                         |
| Constant-time hash comparison           | `crypto.timingSafeEqual`, with a length check first (required by the API; leaks only the fixed public digest length) — never a plain `===`.                                                                                                                                                                              |
| Callback vs. webhook separation         | `payuCallback.ts` (browser redirect) verifies the hash for display purposes only and **never grants credits**; only `payuWebhook.ts` (server-to-server) does. Enforced by code structure, not a runtime flag.                                                                                                            |
| Idempotency                             | `txnid+status` atomic Firestore-transaction claim, same pattern as the existing Razorpay webhook. Proven under sequential _and_ concurrent duplicate delivery in `payuWebhook.test.ts`.                                                                                                                                  |
| Transaction/credit-ownership isolation  | Credits are granted to the `userId` recorded on Mitra's own `transactions/{txnid}` document, never to a client-suppliable `udf1` field — proven by a dedicated forged-`udf1` test.                                                                                                                                       |
| Credit grant mechanics                  | Extracted into a shared, provider-neutral `grantPlanCredits()` helper, exercised against a real Firestore emulator.                                                                                                                                                                                                      |
| Historical Razorpay records             | Confirmed untouched — no migration/rewrite script exists or was run; `provider` field is additive-only.                                                                                                                                                                                                                  |
| TypeScript / lint / build               | Clean on both `functions/` and the frontend, confirmed this session and the prior one.                                                                                                                                                                                                                                   |
| Legal billing disclosures               | `/terms`, `/privacy`, `/refund`, `/cancellation` updated to name PayU as the active processor and Razorpay as legacy-for-existing-subscriptions — factual only, no policy invented (see `docs/PAYMENT_GATEWAY.md`).                                                                                                      |

### BLOCKED (external dependency, not an engineering gap)

| Item                                              | What's needed                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any real PayU test transaction                    | A PayU test merchant account with `PAYU_MERCHANT_KEY`/`PAYU_SALT`. None exist in this project.                                                                                                                                                                                                                                                                                                                               |
| Verify Payment API reconciliation                 | Same — `verifyPaymentWithPayU()`'s real network behavior against PayU's servers has never been observed; only its hash construction is unit-tested.                                                                                                                                                                                                                                                                          |
| Real webhook delivery                             | Requires (a) test credentials, (b) `payuWebhook`'s deployed URL registered in the PayU merchant dashboard's webhook configuration — the URL is now knowable (functions are deployed), but registration is a PayU-console action that hasn't happened.                                                                                                                                                                        |
| `PAYU_CALLBACK_URL`/`PAYU_WEBHOOK_URL` env values | The functions are deployed, so their Cloud Run URLs now exist and could be read via `firebase functions:list` detail or the GCP console — but these env values have not actually been set in the deployed Functions config yet. Until set, `createPayUPayment` will keep returning "Payments are not fully configured yet" even once `PAYU_MERCHANT_KEY`/`PAYU_SALT` are added, because it checks `PAYU_CALLBACK_URL` first. |
| Refund E2E                                        | Requires test credentials AND a decided refund policy (see Legal/Accounting below) — blocked on two independent things.                                                                                                                                                                                                                                                                                                      |
| SI/recurring E2E                                  | Requires PayU to confirm Standing Instruction capability is enabled on the merchant account — cannot be confirmed from this repository or this environment at all.                                                                                                                                                                                                                                                           |
| Production credentials                            | Not to be obtained/used until the full test-environment cycle (steps E–L in the recommended sequence) has actually passed.                                                                                                                                                                                                                                                                                                   |

### FOUNDER DECISION REQUIRED

| Decision                                                                                                                                                                   | Why it matters here                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Subscription model for PayU-era customers: stay one-time-purchase (current implementation), or invest in SI/recurring                                                      | Directly affects whether "auto-renewal" can ever be advertised. Currently every PayU plan purchase sets `cancelAtPeriodEnd: true` at creation — this is _not_ provisional, it's the honest permanent state unless SI is separately built out and enabled.                |
| Whether to keep offering the Razorpay path for brand-new customers during a transition window, or cut over immediately                                                     | Currently the billing UI only offers PayU for new purchases; Razorpay code remains dormant-but-deployed for legacy renewal/cancellation only. If a business reason exists to keep Razorpay available longer, that's a product call, not something this audit can decide. |
| Whether `createCampaign`-style "deploy everything together" is acceptable for future function additions, or a stricter per-function deploy process is wanted going forward | This audit surfaced that PayU functions went live earlier than intended as a side effect of a combined deploy — worth a policy decision if this project wants finer-grained control in the future.                                                                       |

### PAYU-CONSOLE ACTION REQUIRED (once credentials are obtained)

1. Obtain **test** `PAYU_MERCHANT_KEY`/`PAYU_SALT` from the PayU merchant dashboard (Payment
   Gateway → Web Integration → Key/Salt Details, test mode).
2. Configure them via the project's approved secret-management mechanism (Cloud Functions secrets —
   **never** `NEXT_PUBLIC_*`, never committed to the repo, never pasted into a chat/log).
3. Set `PAYU_CALLBACK_URL` and `PAYU_WEBHOOK_URL` to the real deployed function URLs (obtainable now
   via `firebase functions:list` or the GCP Console, since the functions are already deployed).
4. Register `payuWebhook`'s URL in the PayU dashboard's webhook/event configuration (payment
   success, failure, refund, dispute events per the dashboard's options).
5. Run one real PayU **test** transaction end-to-end (createPayUPayment → checkout → callback →
   webhook → verify_payment → credit grant), then the idempotency/failure/amount-mismatch checks
   listed in the recommended sequence (steps E–L).
6. Only after that full cycle passes with real evidence: obtain **production** credentials, replace
   test values, and repeat a minimal live-money verification before broad launch.
7. Before any of the above: **rotate/regenerate any PayU salt value that has ever existed outside
   the approved secret-management system** — this repository has never held a real one, but the
   instruction stands regardless of where a real salt may have been shared.

### LEGAL / ACCOUNTING REQUIRED

- Refund policy (eligibility, time window, full vs. partial) — `docs/LEGAL_FOUNDER_DECISIONS_REQUIRED.md`, unchanged by this migration. `refundPayment()` exists in code but is deliberately not wired to any callable or UI until this is decided.
- Whether GST/tax treatment differs between Razorpay-collected and PayU-collected payments, and whether accounting records need a `provider` split for reconciliation — not assessed in this audit (accounting question, not an engineering one); the `provider` field on `Transaction`/`Subscription` at least makes such a split queryable going forward.
- Any PayU-specific merchant agreement terms (settlement schedule, dispute-handling SLAs) that should be reflected in `/terms` or `/refund` — not reviewed here; those documents currently make only technical-implementation claims, not contractual ones.

## What this audit deliberately did not do

- Did not modify `functions/src/services/payu.ts` or any related file.
- Did not deploy anything (the PayU functions' presence in production predates this audit — see
  "Current deployment state" above — and this audit did not add to or change that).
- Did not attempt to fabricate or simulate a PayU test transaction.
- Did not decide the SI-vs-one-time-purchase question — flagged as Founder Decision.

## Verdict

```
PAYU CODE MIGRATION:        VERIFIED (structurally ready, per the evidence table above)
PAYU FUNCTIONS DEPLOYED:    YES (unintentionally early, fail-closed/safe — no credentials configured)
PAYU TEST ENVIRONMENT:      BLOCKED (no credentials; PAYU_CALLBACK_URL/PAYU_WEBHOOK_URL also unset)
PAYU PRODUCTION:            BLOCKED
RECURRING/SI:               UNVERIFIED, disabled by default, requires PayU account confirmation
REFUNDS:                    NOT WIRED — blocked on both credentials and a founder/legal decision
OVERALL PAYU READINESS:     PARTIAL — do not proceed to a real PayU test transaction until the
                              PayU-console actions above are complete
```
