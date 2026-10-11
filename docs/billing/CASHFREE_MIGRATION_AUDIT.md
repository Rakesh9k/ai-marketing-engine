# Mitra by BrainWise — Paddle to Cashfree Migration Audit

## Executive Summary
This document presents the Phase 0 Discovery & Audit for migrating **Mitra by BrainWise** from Paddle to Cashfree Payments. Mitra is an AI marketing SaaS for local businesses requiring strict payment correctness, server-authoritative entitlements, atomic credit grants, idempotent webhook handling, and tenant isolation.

---

## 1. Existing Billing Architecture & Actual Checkout Flow

### 1.1 Server-Side Architecture (`functions/src`)
- **Config & Env (`functions/src/config/env.ts`)**: Defines Zod schema for `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_ENVIRONMENT`, and `PADDLE_PRICE_ID_*` variables.
- **Billing Service (`functions/src/services/billing.ts`)**: Provider-neutral core for applying plan entitlements (`applyPlanEntitlement`), granting top-up credits (`grantTopUpCredits`), computing period credit allowances (`getPeriodCreditAllowance`), and resolving entitled plans (`resolveEntitledPlan`).
- **Paddle Service (`functions/src/services/paddle.ts`)**: Encapsulates `@paddle/paddle-node-sdk`. Handles SDK client initialization, webhook signature verification (`verifyAndUnmarshalWebhook`), price-ID mapping (`resolvePaddlePrice`, `getPaddlePlanPriceId`), and description helpers.
- **Callable Cloud Functions**:
  - `createPaddleCheckout` (`functions/src/functions/subscriptions/createPaddleCheckout.ts`): Authenticated callable function creating an unpaid Paddle transaction and writing a pending document to Firestore `transactions/{transactionId}`.
  - `cancelPaddleSubscription` (`functions/src/functions/subscriptions/cancelPaddleSubscription.ts`): Authenticated callable function invoking Paddle's API to schedule cancellation at period end (`effectiveFrom: 'next_billing_period'`).
- **Webhook Endpoint**:
  - `paddleWebhook` (`functions/src/functions/webhooks/paddleWebhook.ts`): HTTPS endpoint verifying `paddle-signature` over `req.rawBody`. Idempotently grants credits/entitlements using `paddle_grants/{transactionId}` ledger documents inside Firestore transactions.
- **Scheduled Expiry**:
  - `expireSubscriptions` (`functions/src/functions/subscriptions/expireSubscriptions.ts`): Daily cron at midnight IST to clean up expired non-Paddle subscriptions.

### 1.2 Frontend Architecture (`src/`)
- **Catalog & Config (`src/lib/paddle/catalog.ts`, `config.ts`, `initPaddle.ts`)**:
  - `buildPaddleCatalog`: Maps plan keys and credit pack sizes to Paddle price IDs.
  - `initPaddle.ts`: Wraps `@paddle/paddle-js` client SDK for overlay checkout (`openPaddleCheckout`).
- **Hooks & Components**:
  - `usePaddlePrices`: Fetches presentation-ready formatted prices using `paddle.PricePreview`.
  - `usePaddleCheckout`: Invokes `createPaddleCheckout` callable and launches `openPaddleCheckout`.
  - `useSyncPaddleCustomer`: Syncs `paddleCustomerId` for Paddle Retain.
  - `PaddlePrice.tsx`, `CreditPackCards.tsx`: Render localized prices and top-up cards.
  - `src/app/pricing/PricingPageClient.tsx`, `src/app/billing/page.tsx`: Main pricing and billing management pages.

---

## 2. Complete Paddle Reference Inventory

| File Path | Line Range | Purpose / Reference | Action Required for Migration |
|---|---|---|---|
| `functions/package.json` | 22 | `@paddle/paddle-node-sdk` dependency | Replace with Cashfree SDK / HTTP crypto helper |
| `package.json` | 30 | `@paddle/paddle-js` frontend dependency | Replace with Cashfree JS SDK (`@cashfree/cashfree-js` or script) |
| `functions/src/config/env.ts` | 45-67, 85 | `PADDLE_*` Zod schema & env keys | Replace with `CASHFREE_*` env vars |
| `functions/src/services/paddle.ts` | 1-214 | Paddle SDK wrapper & price mapping | Replace with `cashfree.ts` adapter |
| `functions/src/functions/subscriptions/createPaddleCheckout.ts` | 1-265 | Checkout creation function | Replace with `createCashfreeCheckout.ts` |
| `functions/src/functions/subscriptions/cancelPaddleSubscription.ts` | 1-119 | Subscription cancellation | Replace with `cancelCashfreeSubscription.ts` |
| `functions/src/functions/webhooks/paddleWebhook.ts` | 1-770 | Paddle Webhook endpoint | Replace with `cashfreeWebhook.ts` |
| `functions/src/index.ts` | Export lines | Cloud Functions exports | Export Cashfree functions & webhook |
| `src/lib/paddle/catalog.ts` | 1-132 | Price ID mapping | Refactor to Cashfree catalog mapping |
| `src/lib/paddle/config.ts` | 1-136 | Client env validation | Refactor to Cashfree client config |
| `src/lib/paddle/initPaddle.ts` | 1-120 | Paddle.js SDK initialization | Refactor to Cashfree JS SDK helper |
| `src/features/billing/usePaddleCheckout.ts` | 1-84 | Frontend checkout hook | Refactor to `useCashfreeCheckout.ts` |
| `src/features/billing/usePaddlePrices.ts` | 1-75 | Frontend price preview hook | Refactor to Cashfree price formatter |
| `src/features/billing/useSyncPaddleCustomer.ts` | 1-45 | Paddle customer sync | Remove / adapt to Cashfree customer ID |
| `src/features/billing/components/PaddlePrice.tsx` | 1-80 | Price component | Replace with `CashfreePrice.tsx` |
| `src/features/billing/components/CreditPackCards.tsx` | 1-72 | Top-up card list | Update to use Cashfree checkout hook |
| `src/app/pricing/PricingPageClient.tsx` | 14-18, 176, etc. | Pricing page checkout integration | Update to Cashfree checkout hook |
| `src/app/billing/page.tsx` | 14-18, 34, 118, etc. | Billing management dashboard | Update to Cashfree hooks & cancellation |
| `scripts/setup-paddle-catalog.mjs` | 1-100 | MJS script for setting up Paddle | Replace with `setup-cashfree-catalog.mjs` |
| `scripts/audit-legacy-subscribers.mjs` | 1-50 | Audit script for legacy users | Retain for historical check |
| `.env.example`, `.env.local` | Various | Environment examples | Update env keys to Cashfree |

---

## 3. Existing Plan Matrix & Credit Rules

| Plan | Billing Interval | Price (INR) | Monthly Credits | Key Features |
|---|---|---|---|---|
| **Free** | N/A | ₹0 | 50 (starter allowance) | 5 Socials, 0 Reels, 0 Stories, 1 Brand |
| **Starter** | Monthly / Yearly | ₹1,499 / mo | 500 credits | 15 Socials, 3 Reels, 9 Stories, 1 Brand |
| **Business** | Monthly / Yearly | ₹2,999 / mo | 1,200 credits | 30 Socials, 10 Reels, 30 Stories, 1 Brand |
| **Pro** | Monthly / Yearly | ₹5,999 / mo | 3,000 credits | 60 Socials, 20 Reels, 60 Stories, 3 Brands |
| **Agency** | Monthly / Yearly | ₹11,999 / mo | 6,000 credits | 120 Socials, 40 Reels, 120 Stories, 10 Brands |

### Credit Top-Up Packs (One-Time)
- **Pack 500**: ₹999 -> 500 bonus credits (valid current calendar month)
- **Pack 1200**: ₹1,999 -> 1,200 bonus credits (valid current calendar month)
- **Pack 3000**: ₹4,999 -> 3,000 bonus credits (valid current calendar month)

---

## 4. Current Firestore Billing Schema & State Transitions

### Collections & Schema
1. **`users/{userId}`**:
   - `subscriptionId`: string | null (Points to current active subscription document)
   - `cashfreeCustomerId`: string | undefined
2. **`subscriptions/{subscriptionId}`**:
   - `subscriptionId`: string
   - `userId`: string
   - `planId`: 'free' | 'starter' | 'business' | 'pro' | 'agency'
   - `status`: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
   - `currentPeriodStart`: ISO date string
   - `currentPeriodEnd`: ISO date string
   - `creditsIncluded`: number
   - `creditsUsed`: number
   - `cancelAtPeriodEnd`: boolean
   - `provider`: 'cashfree' (formerly 'paddle')
   - `cashfreeSubscriptionId`: string
   - `cashfreeCustomerId`: string
3. **`usage/{userId}_{YYYY-MM-01}`**:
   - `usageId`: string
   - `userId`: string
   - `planId`: SubscriptionPlan
   - `creditsIncluded`: number (`getPeriodCreditAllowance(planId, bonusCredits)`)
   - `bonusCredits`: number (Top-up credits for period)
   - `creditsUsed`: number
   - `campaignsCreated`, `imagesGenerated`, `failedGenerations`, etc.
4. **`transactions/{transactionId}`**:
   - `transactionId`: string (Cashfree order ID / payment ID)
   - `userId`: string
   - `type`: 'subscription' | 'credit_purchase' | 'reservation' | 'deduction' | 'refund' | 'grant'
   - `amount`: number (credits)
   - `currency`: 'INR'
   - `balanceAfter`: number
   - `description`: string
   - `provider`: 'cashfree'
   - `cashfreeOrderId`: string
   - `cashfreePaymentId`: string
   - `status`: 'pending' | 'completed' | 'failed' | 'refunded' | 'expired'
   - `metadata`: object
5. **`cashfree_grants/{orderId_or_txnId}`**:
   - Ledger collection for once-only fulfillment idempotency.

---

## 5. Provider Abstraction Assessment
The existing `functions/src/services/billing.ts` functions (`applyPlanEntitlement`, `grantTopUpCredits`, `getPeriodCreditAllowance`, `resolveEntitledPlan`) are **already provider-neutral**.

We will introduce a clean interface `PaymentProvider` in `functions/src/services/paymentProvider.ts` defining:
- `createCheckoutOrder`
- `createSubscriptionSession`
- `verifyWebhookSignature`
- `parseWebhookPayload`
- `cancelSubscription`
- `refundPayment`
- `getPaymentStatus`

This ensures 100% provider isolation and leaks zero Cashfree SDK details into campaign or credit logic.

---

## 6. Known Dependencies & Security Risks
1. **Raw Body Verification**: Cashfree requires HMAC-SHA256 signature calculated over `x-webhook-timestamp` + `req.rawBody`. We must ensure Firebase Cloud Functions Gen 2 exposes `req.rawBody`.
2. **Client-Side Security**: Amount, currency, and credit quantities must NEVER be trusted from the browser. The frontend submits only `planId` or `creditPack` size; the server calculates canonical prices and generates Cashfree orders.
3. **Double Billing & Double Granting**: Webhook processing must use Firestore transactions with durable idempotency keys (`cashfree_grants/{orderId}`).
4. **Tenant Isolation**: Orders and subscriptions must be strictly bound to `context.userId` verified by Firebase Auth.

---

## 7. Data & Customer Migration Strategy
- Audit check for existing live subscriptions: Script `scripts/audit-legacy-subscribers.mjs` will be updated to audit existing active Paddle subscriptions in Firestore.
- For historical Paddle records in Firestore (`transactions` or `subscriptions`), existing documents will be preserved with `provider: 'paddle'`. New transactions and subscriptions will use `provider: 'cashfree'`.

---

## 8. Staged Implementation Plan

- **Phase 1**: Confirm Cashfree API Specs & Environment Config (`functions/src/config/env.ts`, `cashfree.ts`).
- **Phase 2**: Define Canonical Plan Catalog & Provider Adapter (`functions/src/services/cashfree.ts`).
- **Phase 3**: Implement Server-Side Checkout (`createCashfreeCheckout.ts`).
- **Phase 4**: Implement Secure Webhook Handler (`cashfreeWebhook.ts`).
- **Phase 5**: Update Subscription Lifecycle & Cancellation (`cancelCashfreeSubscription.ts`).
- **Phase 6**: Build Frontend Integration Hooks & Components (`useCashfreeCheckout.ts`, `CashfreePrice.tsx`, etc.).
- **Phase 7**: Comprehensive Automated & Static Testing (Unit tests, emulator tests, typecheck, build).
- **Phase 8**: Safe Paddle Removal & Final Cleanup.
- **Phase 9**: Full Documentation & Production Readiness Report.
