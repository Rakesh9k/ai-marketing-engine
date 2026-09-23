# MVP PRODUCTION READINESS AUDIT

This document evaluates the state of the codebase against hard production requirements for an MVP launch. We audited six key areas: Authentication, Business Isolation, Billing, Generation (Idempotency & Timeouts), Storage, and Production Infrastructure.

## 1. Authentication
**Status: PASS**
- Uses native Firebase Auth.
- `onUserCreated` and `onUserDeleted` safely manage onboarding and offboarding.
- Custom claims (`role`, `businessIds`) are strictly used for authorization.

## 2. Business Isolation (Tenant Security)
**Status: PASS**
- **Firestore Rules:** The `firestore.rules` file is mature. It enforces tenant isolation via `request.auth.token.businessIds`.
- **Functions Middleware:** `verifyBusinessAccess` correctly checks business ownership and applies safe role escalation for `agency_member`s.
- **Rules Lock:** Authoritative state fields (like `status`, `creditsReserved`, `metadata.truthCheckStatus`) cannot be client-written or forged. 

## 3. Storage
**Status: PASS**
- `storage.rules` effectively restricts business assets to the owner/agency.
- `temp/{userId}` paths correctly isolate temporary user uploads.

## 4. Billing (Reservations & Webhooks)
**Status: CONDITIONAL PASS**
- **Razorpay Idempotency:** The `razorpayWebhook.ts` uses atomic Firestore write claims (`db.runTransaction`) keyed on Razorpay's own event ID. This prevents duplicate credit grants for duplicate webhook events.
- **Usage Control:** `usageControl.ts` accurately performs an atomic `reserveCreditsForOperation` within a `tx.get()` transaction callback to prevent double-charging concurrent requests. 

## 5. Generation Pipeline (CRITICAL FAILURES)
This area contains **critical bugs** that will break the product in production and cost the business money.

### CRITICAL BUG A: Complete Loss of Billing Idempotency
- **The Defect:** In `usageControl.ts`, the reservation transaction guarantees idempotency by checking if a transaction doc matching `operationId` already exists. However, `generateCampaignStrategy.ts` generates a completely new `uuidv7()` (for `campaignId`) on every single invocation and passes *that* as the `operationId` to `executeWithUsageControl`.
- **The Impact:** If a client drops connection (e.g., due to Bug B below) and retries the request with the same `idempotencyKey`, the backend ignores the key, generates a new `campaignId`, and reserves credits a second time. The user is double-charged.

### CRITICAL BUG B: Missing Cloud Function Timeouts & Memory Limits
- **The Defect:** `generateCampaignStrategy`, `createReelProject`, and `regenerateAsset` are defined with basic settings (`{ region: 'asia-south1', enforceAppCheck: true, maxInstances: 50 }`). There is no `timeoutSeconds` or `memory` configured globally in `index.ts` or at the function level.
- **The Impact:** Firebase HTTP Callables default to 60 seconds and 256MB of memory. The 13-stage AI pipeline (LLM text + AI image fetching + compositing + FFmpeg Cloud Run handoffs) will consistently exceed 60 seconds and likely OOM. Every generation will crash with "DEADLINE_EXCEEDED" or "MEMORY_LIMIT_EXCEEDED" in production.

## 6. Production Infrastructure
**Status: BLOCKED BY SECRETS CONFIGURATION**
- `firebase.json` properly points to `apphosting` for the frontend.
- **Secrets Management:** The environment configuration (`env.ts`) relies purely on `process.env`. While perfectly fine if using `.env` files locally, the MVP *must* define API keys (`GEMINI_API_KEY`, `RAZORPAY_KEY_SECRET`, etc.) via Google Cloud Secret Manager (`defineSecret` in Firebase Functions v2) or explicitly via App Hosting secret bindings. Without this, the deployment will fail or expose keys.

---

## EXECUTIVE SUMMARY & RECOMMENDATION

**DO NOT LAUNCH.** 

The fundamental security and isolation architecture is remarkably solid for an MVP. However, the system is not production-ready due to two fatal flaws in the generation pipeline:

1.  **Your heavy AI functions will timeout at 60 seconds.**
2.  **When they timeout, the client will retry, and because idempotency keys are ignored, the user will be charged twice for a failed generation.**

**Required Fixes Before Launch:**
1.  Map `data.idempotencyKey` directly to the `operationId` in `executeWithUsageControl` inside `generateCampaignStrategy.ts`.
2.  Add `timeoutSeconds: 300` (or `540`) and `memory: '1GiB'` (or `2GiB`) to all heavy AI Callable functions.
