# API Security Inventory

**Date:** October 10, 2026  
**Scope:** Next.js Route Handlers (`src/app/api`) & Firebase Cloud Functions (`functions/src`)

---

## 1. Next.js API Routes (`src/app/api`)

| Route Path | HTTP Method | Public / Protected | Auth Required | Tenant Verification | Rate Limiting | Notes & Actions Taken |
|---|---|---|---|---|---|---|
| `/api/health` | GET | Public (Allowlisted) | No | No | No | Explicit public liveness check. Expose no secrets. |
| `/api/generate-content` | POST | Protected | Yes (Bearer ID Token) | Yes (`businessId`) | Yes (20 req/min/user) | Reusable server-side verification layer applied. Input validated via Zod. |

---

## 2. Firebase Cloud Functions (`functions/src`)

| Function Category | Functions / Triggers | Auth Model | Tenant/Business Verification | Security Notes |
|---|---|---|---|---|
| **Callable Functions** | `createBusiness`, `generateCampaign`, `renderReel`, `generateImage`, `executeWorkflow`, etc. | Firebase Callable Auth (`request.auth`) | `verifyBusinessAccess(userId, businessId)` in `functions/src/middleware/auth.ts` | App Check enforced (`enforceAppCheck: true`). Verified custom claim `role` check for admin endpoints. |
| **Webhooks** | `paddleWebhook`, `cashfreeWebhook`, `payuWebhook`, `razorpayWebhook` | Signature Verification | Event Payload Tenant Lookup | Cryptographic signature validation implemented for payment callbacks. |
