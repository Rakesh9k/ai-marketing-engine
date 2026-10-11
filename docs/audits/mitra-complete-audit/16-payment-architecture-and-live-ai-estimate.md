# 16 — Payment architecture decision (Cashfree active) and live-AI estimate — 2026-10-11

**Decision recorded:** Cashfree is the approved active gateway. Live AI testing stays ON HOLD. Production deployment is a separate decision and has NOT been done.

## A. Evidence table (read-only; no secret values read or printed)

| Question | Evidence | Result |
|---|---|---|
| Checkout invoked by the committed frontend | Before today HEAD's `billing/page.tsx` + `PricingPageClient.tsx` used `usePaddleCheckout` (Paddle.js); the working tree held Cashfree-era versions. Now committed (`e085d30`): both call `createCashfreeCheckout` → `openCashfreeCheckout` (SDK, redirect mode). No route still loads Paddle/Razorpay scripts (grep). | Cashfree |
| Provider functions deployed in production | `firebase functions:list` on `brainwise-ai-marketing-engine` (2026-10-11): **`createPaddleCheckout`, `cancelPaddleSubscription`, `paddleWebhook` are deployed**; **no** `createCashfreeCheckout`, `cancelCashfreeSubscription`, `cashfreeWebhook`, no PayU/Razorpay, and none of the onboarding or 8 Creative Brain callables. `expireSubscriptions` and `reconcileStaleReservations` are deployed. | Production = Paddle only. **Cashfree is not live.** |
| Active webhook destinations and secrets | **Could not be verified.** `gcloud` is authenticated as an account without `cloudfunctions`/`secretmanager` list permission (denied, not worked around); the Firebase CLI worked for function list/logs only; the Paddle MCP servers failed to connect; the Cashfree dashboard is not accessible from here. Last KNOWN state (2026-10-03, saved notes, unverified today): Paddle live destination pointed at `https://www.brain-wise.com` (not the function URL), checkout domain "action_required", deployed Paddle function env missing price IDs, `PADDLE_API_KEY` secret was a sandbox key. No Cashfree secrets exist in any local env file (only Paddle values). | UNVERIFIED |
| Entitlement / credit-grant behaviour | **Paddle**: grants only on `transaction.completed`, once-only ledger `paddle_grants/{txn}`, price→plan from server config, stale-event guard, refunds/chargebacks recorded for review. **Cashfree**: grants on `PAYMENT_SUCCESS`/`ORDER_PAID` against the pending order the server created, once-only ledger `cashfree_grants/{order}`; **now also requires status SUCCESS, INR and the exact stored price** (was unchecked); refunds recorded in `cashfree_refunds` for review. **A Cashfree "subscription" is a prepaid 30/365-day period bought with a one-off order, not an auto-renewing mandate: the customer must re-purchase to renew; `expireSubscriptions` ends the period.** | Both idempotent; Cashfree hardened |
| Recent successful sandbox / authorised test transactions | `firebase functions:log --only paddleWebhook`: last entries 2026-10-04 (deployment rollouts, one request that logged an error); **no completed grant found**. Notes from 2026-10-03: 0 live Paddle transactions/subscriptions. Cashfree: nothing deployed, so none. | None found |
| Can both grant for the same purchase / leave conflicting subscriptions | **Before today: yes.** Both providers' handlers were exported in the working tree, both write `subscriptions/*`, the usage doc and the user's `subscriptionId` pointer (last writer wins). **Now: no.** `ACTIVE_PAYMENT_PROVIDER` (default `cashfree`): inactive provider's checkout refuses; its webhook verifies the signature, returns 200 and writes nothing but a `provider_ignored_events` audit record. Cashfree checkout also refuses while any live subscription (either provider) exists. Proven in both directions by `paymentProviderSwitch.test.ts`. | Guarded and tested |

## B. What was implemented and verified (commits `8b58aee`, `e085d30`)
- Provider switch + inert inactive provider; Cashfree webhook amount/currency/status check; refund recording; return-URL allowlist.
- Cashfree billing UI committed (billing page, pricing client, credit pack cards) with credit packs from one shared config pinned to the backend packs; return toast never claims success; CSP trimmed to Cashfree (`tests/securityHeaders.test.ts`).
- `paymentProviderSwitch.test.ts` (emulator, real callables and HTTP handlers, Cashfree's HTTP API stubbed): plan and credit-pack checkout → signed webhook → grant; replays; short payment; wrong currency/status; bad/short/missing signature; unknown order; return URL; refund; client redirect alone grants nothing; Paddle cannot grant (checkout refuses; correctly signed Paddle event ignored and recorded); symmetric Cashfree-inert-when-Paddle-active; cross-provider duplicate-subscription block.
- **NOT done: a real Cashfree sandbox transaction** (no Cashfree credentials exist locally; creating them is a dashboard action). Everything above is emulator-level with Cashfree's API stubbed.

## C. Launch blockers specific to the Cashfree path (none resolved by code)
1. **Customer-facing legal copy is now wrong.** Terms, Refund Policy and Privacy Policy state that Paddle is the Merchant of Record and handles refunds/receipts. Cashfree is a payment gateway, not a merchant of record: BrainWise becomes the seller (GST invoicing and tax, refunds, receipts, dispute handling, privacy processor list). Needs founder/legal wording; not changed here (`docs/LEGAL_*` hold the open decisions).
2. **Production is Paddle-only**: deploying this HEAD adds Cashfree, onboarding and Creative Brain functions and makes the deployed Paddle webhook inert (intended). Required first: set `CASHFREE_APP_ID/SECRET_KEY/WEBHOOK_SECRET` (+ `NEXT_PUBLIC_CASHFREE_ENVIRONMENT`, `APP_URL`) as secrets/env, configure the Cashfree dashboard webhook → `cashfreeWebhook`, then a real sandbox run, then production credentials.
3. **No auto-renewal** (prepaid periods): confirm this is the intended product; the pricing/cancellation copy should say so.
4. **Refund operations**: refunds are recorded for manual review; no admin tooling and no policy on whether credits are revoked.
5. Paddle remnants: the live Paddle notification destination (and 11 live price IDs) should be disabled after cut-over; unused Paddle client code and `npm` deps remain.

## D. Live AI estimate reconciled with the 2026-10-05 raw benchmark (nothing run)
Measured (benchmark, real pipeline, production key, 12 runs/model): text per campaign **$0.028 ≈ ₹2.3** for the pinned `gemini-3.1-flash-lite` ($0.042 ≈ ₹3.6 for 3.5-flash-lite), including repair calls (mean 4.5/campaign, 10–16 sequential calls), median latency 73 s, worst 89 s. Vision: ~$0.0008–0.0012 per call (≈ ₹0.07–0.10).
**Not measured:** image generation (the benchmark did not price it) and anything about the live image model; assumed ≈ $0.04 per image (₹3–4) for `gemini-2.5-flash-image`, one image call per campaign (`MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN = 1`). Verify against Google's current price list before approving.

| Component | Basis | Per campaign |
|---|---|---|
| Text (incl. repairs) | measured | ₹2.3 (₹3.6 on the other model) |
| Vision (1–2 photo analyses) | measured | ≤ ₹0.2 |
| Image (1 call) | **assumed** | ₹3–4 |
| Subtotal | | **≈ ₹6–8** |
| With a ×1.5 retry allowance | | **≤ ₹12** |

Proposed set (unchanged): 7 campaigns (restaurant ×2, salon, real estate, contradictory-offer rejection check, insufficient brain, Telugu). Of these the contradictory offer is now rejected before any AI call, so it costs ₹0 live; effectively **6 generating campaigns ≈ ₹36–72 expected, ≤ ₹72 with retries**. Proposed ceiling ₹300 = a maximum, ≈ 4× the retry-inclusive estimate.
**Hard-cap enforcement — prerequisite not yet built:** the Gemini API returns `usageMetadata` (prompt/candidate tokens) on every response, so exact metering is possible, but **nothing in `functions/src` reads it today and the existing live harness (`modelBenchmark.live.test.ts`) has no budget limit.** Before any live run: add a small usage meter around the text/vision/image providers that converts tokens to ₹ with explicit unit prices, aborts the run when ₹300 is reached (or after 2 consecutive provider errors, a non-Gemini host, or a production Firebase target), and is itself unit-tested with mocked responses. Estimated effort ≈ 0.5 day. Until that exists a "cap" would only be a number in a report, so I recommend not running live tests without it.

## E. Frontend/backend offer validation (commit `eaf71a1`)
The wizard enforces the callable's rules with field-level errors; a synced copy of the validator is pinned to the backend by a 10,000+ case drift test (mutation-checked); the server still revalidates every request.

## F. Final verification of HEAD `e8b5e23` (clean worktree, LF, 0 uncommitted files)
tsc root 0 / functions 0 errors · `eslint --max-warnings 0` exit 0 · root jest 117 suites, 1643 passed, 0 failed, 7 skipped · functions jest (all emulators, `--no-cache`, `--maxWorkers=50%`) 256 suites passed, 7 skipped, 2680 passed, 0 failed, 50 skipped. An earlier run showed the first test of `creativeBrain.e2eValidation` exceeding the 30 s default on a cold Jest cache; its timeout (and the integration suite's) was raised to 120 s with no assertion changed (`e8b5e23`).
