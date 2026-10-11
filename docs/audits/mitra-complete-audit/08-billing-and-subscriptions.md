# 08 — Billing, Credits & Subscriptions (Pass 1, static)

Active provider: **Paddle** (checkout `createPaddleCheckout`, `cancelPaddleSubscription`, `paddleWebhook`). Cashfree also exported; PayU/Razorpay retained but not exported.

## Lifecycle (as implemented)
```
Pricing UI → createPaddleCheckout (auth+AppCheck, server-side price IDs, custom_data.firebaseUid)
  → Paddle hosted checkout → client redirect (no entitlement grant)
Paddle → paddleWebhook (POST, raw-body HMAC)
  ├ subscription.* → syncSubscriptionState (status/period/cancel flag; stale-event guard; NO credits)
  ├ subscription.canceled → status only; credits already granted stay; pointer detached if same sub
  ├ transaction.completed → once-only paddle_grants/{txnId} + applyPlanEntitlement/grantTopUpCredits (one Firestore txn)
  ├ transaction.payment_failed → handlePaymentFailed
  └ adjustment.created/updated → handleAdjustment (refund path; not read in detail)
Campaign: reserveCreditsForOperation (txn, idempotency key) → generate → finalizeReservation | refundReservation
Sweeper: reconcileStaleReservations (scheduled)
```

## Verified by reading code
- Client redirect cannot grant entitlements; only webhook writes (`paddleWebhook.ts` header + handlers).
- Replay-safe: grants keyed by transaction ID, not event ID.
- Out-of-order subscription events ignored when older than `lastPaddleEventAt`.
- Identity mismatch (custom_data uid vs stored customer ID) is refused as anomaly.
- Unknown price → flagged, nothing granted (`flagGrant`).
- Credits: reservation is transactional; refund idempotent (`refund_{operationId}`); finalize-after-refund and refund-after-finalize rejected; replay of same key does not double-charge; `executeWithUsageControl` guards re-running generation for same key.

## Gaps / UNVERIFIED
| ID | Severity | Item |
|---|---|---|
| B1 | P0 verify | Live Paddle webhook destination, signing secret, domain approval and live price IDs were noted as gaps on 2026-10-02/03 in project memory; current state not re-checked. No real live transaction evidence. |
| B2 | P1 | `transaction.completed` totals assumed minor-unit ÷100 (`minorToMajor`); wrong for zero-decimal currencies (JPY/KRW). Affects analytics/records only if non-USD/INR zero-decimal sold. |
| B3 | P1 | Subscription canceled: credits already granted are kept until the period usage doc rolls; confirm this matches stated refund/cancellation policy in `LEGAL_BILLING_CREDIT_MATRIX.md`. |
| B4 | P1 | Refund/chargeback (`adjustment.*`) behaviour (claw back credits?) not read. |
| B5 | P1 | Free tier 100 credits < 140-credit campaign cost (project memory, 2026-10-04) — check whether fixed; directly affects first-campaign conversion. |
| B6 | P2 | Cashfree still deployed: second billing surface needing the same guarantees; decide keep/remove. |
| B7 | UNVERIFIED | `expireSubscriptions` scheduler semantics vs Paddle-driven status (possible double authority). |

## Billing test matrix status
Paddle webhook/checkout/entitlement/pricing-parity tests exist and pass in the functions suite (`paddleWebhook.test.ts`, `createPaddleCheckout.test.ts`, `entitlements.pricingParity.test.ts`, `billing.phase19.test.ts`, `usageControl.*.test.ts`). Production lifecycle tests (abandoned checkout, renewal, refund in the sandbox) — **not executed here**.

## Paid-launch blockers (provisional)
1. Prove one real sandbox→live webhook delivery updates entitlements end to end (B1).
2. Resolve Free-tier credits vs campaign cost (B5).
3. Confirm refund/chargeback handling and policy alignment (B3, B4).
