# Mitra AI Marketing Engine — Billing Lifecycle Evidence

**Date:** 2026-10-09  
**Webhook Handler:** `functions/src/functions/webhooks/paddleWebhook.ts`  
**Billing Service:** `functions/src/services/billing.ts`

---

## 1. Paddle Integration Security & Idempotency Architecture

- **HMAC Signature Check**: Webhook handler verifies `paddle-signature` header over raw request body bytes (`req.rawBody`). Invalid signatures return HTTP status 400.
- **Transaction-Level Idempotency**: Completed money events write an atomic grant record to `/paddle_grants/{transactionId}` inside a Firestore transaction. Replayed deliveries exit gracefully without double-crediting.
- **Server Price Mapping**: Products and monthly credit allocations are derived server-side via `resolvePaddlePrice()` using Secret Manager references in `apphosting.yaml`.

---

## 2. Tested Lifecycle Event Matrix

| Event Type | Provider Event | Server Action | Business Outcome | Result |
| :--- | :--- | :--- | :--- | :---: |
| **First Purchase** | `subscription.created` + `transaction.completed` | Resolves price, grants credits | User subscription updated; monthly credits added | **PASS** |
| **Duplicate Delivery** | `transaction.completed` (Replay) | Checks `/paddle_grants/{txnId}` | Detects existing grant; exits with HTTP 200 (0 extra credits) | **PASS** |
| **Next Renewal** | `transaction.completed` (New Txn ID) | Updates billing period | Grants next period credits; preserves bonus credits | **PASS** |
| **Payment Failure** | `transaction.payment_failed` | Updates transaction status | Txn marked `failed`; user entitlements remain intact | **PASS** |
| **Cancellation** | `subscription.canceled` | Detaches auto-renewal | Sub status `canceled`; current period credits remain valid | **PASS** |
| **Refund / Chargeback**| `adjustment.created` | Records adjustment | Stored in `/paddle_adjustments/{id}`, flags `needsManualReview` | **PASS** |

---

## 3. Plan & Price Matrix Mapping

```
Plan Entitlements:
- Starter Plan: 500 Credits / Month (NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER_MONTHLY)
- Business Plan: 1,200 Credits / Month (NEXT_PUBLIC_PADDLE_PRICE_ID_BUSINESS_MONTHLY)
- Pro Plan: 3,000 Credits / Month (NEXT_PUBLIC_PADDLE_PRICE_ID_PRO_MONTHLY)
- Agency Plan: Custom Credits / Month (NEXT_PUBLIC_PADDLE_PRICE_ID_AGENCY_MONTHLY)

Top-Up Credit Packs:
- Pack 500: +500 Bonus Credits (NEXT_PUBLIC_PADDLE_PRICE_ID_PACK_500)
- Pack 1200: +1,200 Bonus Credits (NEXT_PUBLIC_PADDLE_PRICE_ID_PACK_1200)
- Pack 3000: +3,000 Bonus Credits (NEXT_PUBLIC_PADDLE_PRICE_ID_PACK_3000)
```
