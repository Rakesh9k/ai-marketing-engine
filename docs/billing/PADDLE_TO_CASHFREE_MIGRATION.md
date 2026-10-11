# Paddle to Cashfree Payment Provider Migration Guide

## 1. Migration Rationale & Scope

Mitra by BrainWise has migrated its primary SaaS billing engine from Paddle to Cashfree Payments. This migration establishes INR as the canonical billing currency for local business customers in India, reduces transaction costs, and enables native UPI and credit/debit card recurring payment options.

---

## 2. API & Field Mapping Reference

| Functionality | Paddle (Legacy) | Cashfree Payments (v3) | Notes |
|---|---|---|---|
| SDK Loader | `@paddle/paddle-js` | `https://sdk.cashfree.com/js/v3/cashfree.js` | Cashfree JS SDK loaded dynamically on demand |
| Checkout Endpoint | `POST /checkout` (Paddle Hosted) | `POST /pg/orders` | Backend generates `payment_session_id` |
| Webhook Route | `/paddleWebhook` | `/cashfreeWebhook` | Verified HMAC-SHA256 over timestamp + rawBody |
| Webhook Signature Header | `paddle-signature` | `x-webhook-signature` & `x-webhook-timestamp` | Base64 HMAC-SHA256 signature verification |
| Idempotency Collection | `/paddle_grants/{transactionId}` | `/cashfree_grants/{orderId}` | Atomic credit grant deduplication |
| Refund Collection | `/paddle_adjustments/{id}` | Integrated in `/transactions/{orderId}` | Instant/Standard refund tracking via Cashfree Refund API |
| Monthly Starter | `pri_starterm` ($19 USD) | ₹1,499 INR | Canonical price derived in `pricing.ts` |
| Yearly Starter | `pri_startery` ($190 USD) | ₹14,990 INR (₹9,990 introductory) | Billed annually |
| Monthly Business | `pri_businessm` ($39 USD) | ₹2,999 INR | Canonical price derived in `pricing.ts` |
| Yearly Business | `pri_businessy` ($390 USD) | ₹29,990 INR | Billed annually |
| Monthly Pro | `pri_prom` ($79 USD) | ₹5,999 INR | Canonical price derived in `pricing.ts` |
| Yearly Pro | `pri_proy` ($790 USD) | ₹59,990 INR (₹24,990 introductory) | Billed annually |
| Monthly Agency | `pri_agencym` ($149 USD) | ₹11,999 INR | Canonical price derived in `pricing.ts` |
| Yearly Agency | `pri_agencyy` ($1490 USD) | ₹119,990 INR | Billed annually |
| Credit Pack 500 | `pri_pack500` ($12 USD) | ₹499 INR | 500 Credits |
| Credit Pack 1200 | `pri_pack1200` ($25 USD) | ₹999 INR | 1,200 Credits |
| Credit Pack 3000 | `pri_pack3000` ($55 USD) | ₹1,999 INR | 3,000 Credits |

---

## 3. Data Schema & State Migration

1. **User Subscription Documents (`/subscriptions/{userId}`)**:
   - `paddleCustomerId`, `paddleSubscriptionId`, `paddlePriceId` fields are retained for existing legacy subscribers during the cutover window.
   - New subscriptions populate `cashfreeOrderId` and `cashfreeSubscriptionId`.
2. **Entitlement Calculations**:
   - Monthly credit allowances (`creditsIncluded`) and business profile limits (`maxBusinesses`) remain 100% backward compatible.
   - Credit reservations and failure refunds operate on `/usage/{userId}_{period}` identically regardless of payment gateway origin.

---

## 4. Deprecation & Cleanup Inventory

The following legacy Paddle files have been refactored or replaced:
- `functions/src/services/cashfree.ts` (replaces legacy provider implementation)
- `functions/src/functions/webhooks/cashfreeWebhook.ts` (replaces `paddleWebhook.ts`)
- `src/features/billing/useCashfreeCheckout.ts` (replaces `usePaddleCheckout`)
- `src/lib/cashfree/initCashfree.ts` (replaces `initPaddle`)
- `src/app/billing/page.test.tsx` (updated with Cashfree test suites)
- `src/app/pricing/pricing.test.tsx` (updated with Cashfree test suites)
