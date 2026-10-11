# Billing lifecycle (Paddle) — implementation, verification state, go-live checklist

Phase 3 audit, 2026-10-03. No secret values appear here.

## How money becomes credits

```
Pricing / Billing page  ->  createPaddleCheckout (callable, auth + App Check)
   server picks the price ID from ITS env (never from the client), creates an unpaid Paddle
   transaction with custom_data.firebaseUid, stores transactions/{txn_id} status=pending
-> Paddle.js overlay (transactionId only)
-> Paddle charges the customer
-> paddleWebhook (HTTPS function): raw body + Paddle-Signature verified with PADDLE_WEBHOOK_SECRET
-> transaction.completed: user resolved (custom_data uid -> stored subscription -> stored customer ID;
   mismatch with the stored Paddle customer = refused + flagged), entitlement decided from the PRICE ID
-> ONE Firestore transaction: paddle_grants/{txn_id} guard + usage/plan entitlement + subscription doc
   + ledger row in transactions/{txn_id}
```

The browser never grants anything. `/billing?paddle=success` and `/welcome` only re-read server state;
the success toast no longer asserts payment (it said "Payment received!" from the URL alone).

## Idempotency / ordering
- Grant guard is the Paddle transaction ID (`paddle_grants/{txn_id}`) inside the same Firestore transaction as the credit write; replays and concurrent duplicates grant once (tested).
- Subscription events carry `lastPaddleEventAt`; older events are ignored. A late/retried `transaction.completed` after a newer `subscription.canceled` still applies the paid credits but no longer re-activates the subscription (fixed this phase).
- Processing errors return 500 so Paddle retries; missing/invalid signature returns 400.

## Plans, credits (from `functions/src/config/pricing.ts`) and live Paddle prices (verified read-only 2026-10-03)

| Plan | Credits / month | Monthly ₹ | Yearly ₹ | Live monthly price ID | Live yearly price ID |
| --- | --- | --- | --- | --- | --- |
| Starter | 500 | 999 | 9,990 | pri_01m3xrw2jbxqyx6py73ddg4ffk | pri_01m3xrw2wwkgb7yqabc61d5hy5 |
| Business | 1,200 | 1,699 | 16,990 | pri_01m3xrw3ghgdxnfcnzbmjp5dvh | pri_01m3xrw3se1v0ebq8e0mmrbj5r |
| Pro | 2,500 | 2,999 | 24,990 | pri_01m3xrw4d691gaqwzyx41n9cxd | pri_01m3xrw4pyxvs26k6x48bjwnwz |
| Agency | 6,000 | 4,999 | 49,990 | pri_01m3xrw5an1dmqtewz1zzjqhf8 | pri_01m3xrw5k9zqbv43vf2kvd6b3t |

Top-up packs: 500 / 1,200 / 3,000 credits at ₹499 / ₹999 / ₹1,999 (pri_01m3xrw67cm6qxr36htfxd0edp, pri_01m3xrw6g773c9gjre51c5kd2v, pri_01m3xrw6v11tcgec7vwcrrsmq5). All 11 live prices match `pricing.ts` (INR, no trials, tax mode location).
Yearly subscribers pay once a year and keep their plan's monthly allowance every month (`resolveEntitledPlan`, tested).

## Current policy (documented, not invented)
- Cancel: access and already-granted credits stay until the period ends; then the user resolves to Free. `cancelAtPeriodEnd` mirrors Paddle's scheduled change.
- Customer-initiated refunds: none (business policy). Provider-originated refund/chargeback: **recorded, not auto-reversed.**
  `adjustment.created/updated` now write `paddle_adjustments/{adjustment_id}` (idempotent, stale-safe), mark `transactions/{txn}.reconciliation` and set `needsManualReview` on approved refunds/chargebacks. Credits and plan are deliberately untouched.
  **Business decision required** before real refunds can be fully reconciled: do approved refunds/chargebacks revoke the period's credits, the plan, or only the unspent remainder?
- Failed payments never grant; `transaction.payment_failed` only fails a still-pending checkout record.

## Environment matrix (as found)

| Environment | Paddle | Server env | Webhook destination | Result |
| --- | --- | --- | --- | --- |
| Local / emulator | sandbox (`functions/.env.local`, emulator only) | PADDLE_ENVIRONMENT=sandbox | none | test only |
| Production (deployed) | live account | **PADDLE_ENVIRONMENT and PADDLE_PRICE_ID_* NOT SET on any deployed Paddle function** | live destination points at `https://www.brain-wise.com`, not the function | billing cannot work yet |

`requirePaddleEnvironment` has no default and rejects a sandbox key with `production` (and vice versa), so a half-configured production fails closed instead of mixing environments.

## Go-live blockers found (all configuration, none in code)
1. Functions env: deploy `functions/.env.brainwise-ai-marketing-engine` (prepared, gitignored: PADDLE_ENVIRONMENT=production + 11 live price IDs) with a targeted deploy of the three Paddle functions.
2. `PADDLE_API_KEY` latest Secret Manager version is a **sandbox** key (`pdl_sdbx_`). Add a live (`pdl_live_`) key as a new version, then disable older versions (v1/v2 also contain stray BOM/garbage).
3. ~~`NEXT_PUBLIC_PADDLE_PRICE_ID_PRO_YEARLY` held the live Agency monthly price ID.~~ **Fixed 2026-10-03:** secret version 2 (created 08:53) holds `pri_01m3xrw4pyxvs26k6x48bjwnwz`, the live Pro yearly price (₹24,990). Verified by reading the latest version; all 11 `NEXT_PUBLIC_PADDLE_PRICE_ID_*` secrets now match the live catalog. `mitra-web` must still be rolled out to pick it up, since these are build-time values.
4. Live notification destination `ntfset_01m3xqzf54r5sxcaqdd00rem2x` still targets `https://www.brain-wise.com`; update its URL to the deployed `paddleWebhook` URL (keep the destination so the signing secret stays valid). `PADDLE_WEBHOOK_SECRET` (v2/v3) already equals this destination's secret.
5. Live checkout domain `brain-wise.com` is `action_required`; the default payment link is not verified here.
6. No live transaction has ever occurred (0 transactions, 0 subscriptions) — the controlled production purchase is still to do.
7. The sandbox MCP credentials were rejected by Paddle, so sandbox state could not be inspected; a sandbox end-to-end run needs a browser and valid sandbox credentials.
